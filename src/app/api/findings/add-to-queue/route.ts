import { NextResponse } from "next/server";
import { getOrgAccessContext, getSupabaseAdminClient } from "@/lib/supabase/access";
import {
  findLatestQueuedProposal,
  generateDraftForProposedUpdate,
  insertProposedUpdateWithFallback,
  mapRiskLevel,
  parseConfidence,
} from "@/lib/ai/proposed-updates";
import { aggregateRegChangesForOrg } from "@/lib/pipeline/aggregate-reg-changes";

type AddToQueueResult = {
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

async function queueFinding(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  ctx: NonNullable<Awaited<ReturnType<typeof getOrgAccessContext>>>,
  findingId: string,
  generateDraft: boolean,
): Promise<AddToQueueResult> {
  // Fetch the finding
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
    const result: AddToQueueResult = {
      findingId,
      id: existing.data.id,
      alreadyQueued: true,
    };

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

  const result: AddToQueueResult = {
    findingId,
    id: created.id,
    alreadyQueued: false,
  };

  if (generateDraft) {
    const draft = await generateDraftForProposedUpdate(admin, String(created.id));
    if (draft.ok) result.draftGenerated = true;
    else result.draftError = draft.error;
  }

  return result;
}

export async function POST(request: Request) {
  const ctx = await getOrgAccessContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as {
    findingId?: string;
    findingIds?: string[];
    generateDraft?: boolean;
    generateDrafts?: boolean;
  };
  const findingIds = body.findingIds?.length
    ? Array.from(new Set(body.findingIds.filter(Boolean))).slice(0, 50)
    : body.findingId
      ? [body.findingId]
      : [];

  if (findingIds.length === 0) {
    return NextResponse.json({ error: "findingId required" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const generateDraft = Boolean(body.generateDraft ?? body.generateDrafts);
  const results: AddToQueueResult[] = [];

  for (const findingId of findingIds) {
    results.push(await queueFinding(admin, ctx, findingId, generateDraft));
  }

  const failed = results.filter((result) => result.error);
  const queued = results.filter((result) => result.id);

  if (body.findingIds?.length) {
    return NextResponse.json({
      ok: failed.length === 0,
      queued: queued.length,
      failed: failed.length,
      results,
    }, { status: queued.length > 0 ? 200 : 400 });
  }

  const result = results[0];
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.error === "Forbidden" ? 403 : 400 });
  }

  return NextResponse.json({ ok: true, ...result });
}
