import {
  findLatestQueuedProposal,
  generateDraftForProposedUpdate,
  insertProposedUpdateWithFallback,
  mapRiskLevel,
  parseConfidence,
} from "@/lib/ai/proposed-updates";
import { aggregateRegChangesForOrg } from "@/lib/pipeline/aggregate-reg-changes";
import {
  getSupabaseAdminClient,
  ORG_APPROVER_ROLES,
  type OrgAccessContext,
} from "@/lib/supabase/access";
import { compensateCreatedProposal } from "@/lib/findings/queue-compensation";

export type QueueFindingProvenance = {
  conversationId: string;
  sourceMessageId: string;
};

export type QueueFindingResult = {
  findingId: string;
  id?: string;
  alreadyQueued?: boolean;
  draftGenerated?: boolean;
  draftError?: string;
  error?: string;
};

function isBestEffortRegChangeError(message: string) {
  return (
    /ai_finding_id/i.test(message) ||
    /reg_part/i.test(message) ||
    /reg_changes/i.test(message) ||
    /could not find/i.test(message) ||
    /does not exist/i.test(message)
  );
}

function isMissingDeletedColumnError(error: { message?: string | null; code?: string | null } | null | undefined) {
  return (
    error?.code === "42703" ||
    /column .*deleted_at.* does not exist/i.test(error?.message ?? "") ||
    /could not find the 'deleted_at' column/i.test(error?.message ?? "")
  );
}

async function insertProvenanceAudit(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  ctx: OrgAccessContext,
  result: QueueFindingResult,
  provenance?: QueueFindingProvenance,
) {
  if (provenance) {
    try {
      const { error: auditError } = await admin.from("audit_log").insert({
        organization_id: ctx.orgId,
        actor_id: ctx.userId,
        action: "coworker_review_item_created",
        entity_type: "proposed_update",
        entity_id: result.id,
        payload: provenance,
      });
      if (auditError) return auditError;
    } catch (error) {
      return error;
    }
  }

  return null;
}

export async function queueFinding(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  ctx: OrgAccessContext,
  findingId: string,
  generateDraft: boolean,
  provenance?: QueueFindingProvenance,
): Promise<QueueFindingResult> {
  if (!ORG_APPROVER_ROLES.includes(ctx.role as (typeof ORG_APPROVER_ROLES)[number])) {
    return { findingId, error: "Forbidden" };
  }

  let { data: finding, error: findingErr } = await admin
    .from("ai_findings")
    .select("id, impact, confidence, mapped_section, status, category, summary, organization_id, deleted_at")
    .eq("id", findingId)
    .maybeSingle();

  if (findingErr && isMissingDeletedColumnError(findingErr)) {
    const fallback = await admin
      .from("ai_findings")
      .select("id, impact, confidence, mapped_section, status, category, summary, organization_id")
      .eq("id", findingId)
      .maybeSingle();
    finding = fallback.data ? { ...fallback.data, deleted_at: null } : null;
    findingErr = fallback.error;
  }

  if (findingErr || !finding) {
    return { findingId, error: "Finding not found" };
  }

  if ((finding.organization_id as string | null) !== ctx.orgId) {
    return { findingId, error: "Forbidden" };
  }

  if (finding.deleted_at) {
    return { findingId, error: "Restore this result before adding it to the queue." };
  }

  const aggregateResult = await aggregateRegChangesForOrg(admin, ctx.orgId);
  if (!aggregateResult.ok && !isBestEffortRegChangeError(aggregateResult.error)) {
    return { findingId, error: aggregateResult.error };
  }

  const { data: regChange } = await admin
    .from("reg_changes")
    .select("id")
    .eq("organization_id", ctx.orgId)
    .eq("ai_finding_id", findingId)
    .maybeSingle();

  const existing = await findLatestQueuedProposal(admin, ctx.orgId, {
    regChangeId: (regChange?.id as string | null) ?? null,
    rationale: finding.summary ?? "",
  });

  if (existing.error) {
    return { findingId, error: existing.error.message };
  }

  if (existing.data) {
    const result: QueueFindingResult = {
      findingId,
      id: existing.data.id,
      alreadyQueued: true,
    };
    const auditError = await insertProvenanceAudit(admin, ctx, result, provenance);
    if (auditError) return { findingId, error: "Unable to record coworker review item audit." };

    if (generateDraft) {
      const draft = await generateDraftForProposedUpdate(admin, existing.data.id);
      if (draft.ok) result.draftGenerated = true;
      else result.draftError = draft.error;
    }

    return result;
  }

  const { data: created, error: createErr } = await insertProposedUpdateWithFallback(admin, {
    organization_id: ctx.orgId,
    reg_change_id: (regChange?.id as string | null) ?? null,
    classification: "watchlist",
    risk_level: mapRiskLevel(finding.impact),
    ai_rationale: finding.summary,
    confidence_score: parseConfidence(finding.confidence),
    status: "pending",
    ai_model: "ai-analyze",
    ai_generated_at: new Date().toISOString(),
  });

  if (createErr) return { findingId, error: createErr.message };

  const result: QueueFindingResult = {
    findingId,
    id: created.id,
    alreadyQueued: false,
  };
  const auditError = await insertProvenanceAudit(admin, ctx, result, provenance);
  if (auditError) {
    try {
      const compensationError = await compensateCreatedProposal(admin, ctx.orgId, String(created.id));
      if (compensationError) {
        console.error("Unable to compensate proposed update after audit failure", compensationError);
      }
    } catch (compensationError) {
      console.error("Unable to compensate proposed update after audit failure", compensationError);
    }
    return { findingId, error: "Unable to record coworker review item audit." };
  }

  if (generateDraft) {
    const draft = await generateDraftForProposedUpdate(admin, String(created.id));
    if (draft.ok) result.draftGenerated = true;
    else result.draftError = draft.error;
  }

  return result;
}
