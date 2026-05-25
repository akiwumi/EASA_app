import { NextResponse } from "next/server";
import { getOrgScopedContext, getSupabaseAdminClient, ORG_APPROVER_ROLES } from "@/lib/supabase/access";

type RequestBody = {
  findingId?: string;
  proposedUpdateId?: string;
  filterCategory?: string | null;
  filterRegPart?: string | null;
  dismissalReason?: string | null;
};

export async function POST(request: Request) {
  const ctx = await getOrgScopedContext(ORG_APPROVER_ROLES);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as RequestBody;
  if (!body.findingId && !body.proposedUpdateId) {
    return NextResponse.json({ error: "findingId or proposedUpdateId required" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const dismissedAtIso = new Date().toISOString();
  const dismissalReason =
    typeof body.dismissalReason === "string" && body.dismissalReason.trim().length > 0
      ? body.dismissalReason.trim()
      : "This regulation part does not apply to our operation.";
  let resolvedFindingId = body.findingId ?? null;

  if (!resolvedFindingId && body.proposedUpdateId) {
    const { data: proposal } = await admin
      .from("proposed_updates")
      .select("id, reg_change_id, ai_rationale")
      .eq("organization_id", ctx.orgId)
      .eq("id", body.proposedUpdateId)
      .maybeSingle();

    if (!proposal) {
      return NextResponse.json({ error: "Proposed update not found" }, { status: 404 });
    }

    if (proposal.reg_change_id) {
      const { data: regChange } = await admin
        .from("reg_changes")
        .select("ai_finding_id")
        .eq("organization_id", ctx.orgId)
        .eq("id", proposal.reg_change_id as string)
        .maybeSingle();
      resolvedFindingId = (regChange?.ai_finding_id as string | null | undefined) ?? null;
    }

    if (!resolvedFindingId && proposal.ai_rationale) {
      const { data: findingBySummary } = await admin
        .from("ai_findings")
        .select("id")
        .eq("organization_id", ctx.orgId)
        .eq("summary", proposal.ai_rationale as string)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      resolvedFindingId = (findingBySummary?.id as string | null | undefined) ?? null;
    }
  }

  if (!resolvedFindingId) {
    return NextResponse.json({ error: "Unable to resolve linked finding" }, { status: 404 });
  }

  const { data: finding, error: findingError } = await admin
    .from("ai_findings")
    .select("id, organization_id, category, summary")
    .eq("id", resolvedFindingId)
    .eq("organization_id", ctx.orgId)
    .maybeSingle();

  if (findingError) return NextResponse.json({ error: findingError.message }, { status: 400 });
  if (!finding) return NextResponse.json({ error: "Finding not found" }, { status: 404 });

  const { error: deleteError } = await admin
    .from("ai_findings")
    .update({
      deleted_at: dismissedAtIso,
      deleted_by: ctx.userId,
      dismissed_by: ctx.userId,
      dismissed_at: dismissedAtIso,
      dismissal_reason: dismissalReason,
    })
    .eq("id", resolvedFindingId)
    .eq("organization_id", ctx.orgId);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });

  const { data: regChange } = await admin
    .from("reg_changes")
    .select("id, reg_part")
    .eq("organization_id", ctx.orgId)
    .eq("ai_finding_id", resolvedFindingId)
    .maybeSingle();

  const regPart = body.filterRegPart ?? (regChange?.reg_part as string | null | undefined) ?? null;
  const category = body.filterCategory ?? (finding.category as string | null | undefined) ?? null;

  if (regPart || category) {
    const filterRows: Array<{ organization_id: string; filter_type: string; filter_value: string; created_by: string }> = [];
    if (regPart) {
      filterRows.push({
        organization_id: ctx.orgId,
        filter_type: "reg_part",
        filter_value: regPart,
        created_by: ctx.userId,
      });
    }
    if (category) {
      filterRows.push({
        organization_id: ctx.orgId,
        filter_type: "category",
        filter_value: category,
        created_by: ctx.userId,
      });
    }
    if (filterRows.length > 0) {
      const { error: filterError } = await admin
        .from("org_finding_filters")
        .upsert(filterRows, { onConflict: "organization_id,filter_type,filter_value", ignoreDuplicates: true });
      if (filterError) return NextResponse.json({ error: filterError.message }, { status: 400 });
    }
  }

  const matchingProposalIds: string[] = [];
  if (body.proposedUpdateId) {
    matchingProposalIds.push(body.proposedUpdateId);
  }
  if (finding.summary) {
    const { data: proposals } = await admin
      .from("proposed_updates")
      .select("id")
      .eq("organization_id", ctx.orgId)
      .eq("status", "pending")
      .eq("ai_rationale", finding.summary)
      .order("created_at", { ascending: false });
    for (const proposal of proposals ?? []) {
      const proposalId = proposal.id ? String(proposal.id) : null;
      if (proposalId && !matchingProposalIds.includes(proposalId)) matchingProposalIds.push(proposalId);
    }
  }

  if (matchingProposalIds.length > 0) {
    await admin
      .from("proposed_updates")
      .update({
        status: "boneyard",
        updated_at: new Date().toISOString(),
      })
      .in("id", matchingProposalIds)
      .eq("organization_id", ctx.orgId);
  }

  try {
    await admin.from("audit_log").insert({
      organization_id: ctx.orgId,
      actor_id: ctx.userId,
      action: "finding_mark_not_relevant",
      entity_type: "ai_finding",
      entity_id: resolvedFindingId,
      payload: {
        reg_part: regPart,
        category,
        dismissal_reason: dismissalReason,
        proposal_ids: matchingProposalIds,
      },
    });
  } catch {
    // best effort only
  }

  return NextResponse.json({ ok: true });
}
