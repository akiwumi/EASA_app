import { NextResponse } from "next/server";
import { getOrgAdminContext, getSupabaseAdminClient } from "@/lib/supabase/access";

// DELETE /api/admin/clear-data
// Clears all AI-ingested pipeline data for the org (findings, reg changes,
// RSS items, proposed updates, pipeline summaries). Does not touch settings,
// sources config, flightbooks, or training data.
export async function DELETE() {
  const ctx = await getOrgAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = getSupabaseAdminClient();
  const orgId = ctx.orgId;

  const errors: string[] = [];

  // 1. Proposed updates (the review queue)
  const { error: puErr } = await admin
    .from("proposed_updates")
    .delete()
    .eq("organization_id", orgId);
  if (puErr) errors.push(`proposed_updates: ${puErr.message}`);

  // 2. Approvals linked to proposed updates (already cascade-deleted above
  //    if FK is set, but attempt a best-effort cleanup just in case)
  try {
    await admin
      .from("approvals")
      .delete()
      .eq("organization_id", orgId);
  } catch {
    // table may not exist yet — ignore
  }

  // 3. AI findings
  const { error: afErr } = await admin
    .from("ai_findings")
    .delete()
    .eq("organization_id", orgId);
  if (afErr) errors.push(`ai_findings: ${afErr.message}`);

  // 4. Regulatory changes
  const { error: rcErr } = await admin
    .from("reg_changes")
    .delete()
    .eq("organization_id", orgId);
  if (rcErr) errors.push(`reg_changes: ${rcErr.message}`);

  // 5. RSS items
  const { error: rssErr } = await admin
    .from("rss_items")
    .delete()
    .eq("organization_id", orgId);
  if (rssErr) errors.push(`rss_items: ${rssErr.message}`);

  // 6. Source snapshots — keyed by source, not org; find org sources first
  try {
    const { data: orgSources } = await admin
      .from("sources")
      .select("id")
      .eq("organization_id", orgId);
    const sourceIds = (orgSources ?? []).map((s) => s.id as string).filter(Boolean);
    if (sourceIds.length > 0) {
      await admin
        .from("source_snapshots")
        .delete()
        .in("source_id", sourceIds);
    }
  } catch {
    // table may not exist — ignore
  }

  // 7. Pipeline summaries
  try {
    await admin
      .from("pipeline_summaries")
      .delete()
      .eq("organization_id", orgId);
  } catch {
    // table may not exist — ignore
  }

  // 8. Pipeline runs
  try {
    await admin
      .from("pipeline_runs")
      .delete()
      .eq("organization_id", orgId);
  } catch {
    // table may not exist — ignore
  }

  // 9. Finding-related notifications
  try {
    await admin
      .from("notifications")
      .delete()
      .eq("organization_id", orgId)
      .in("related_entity_type", ["ai_finding", "proposed_update"]);
  } catch {
    // best-effort — ignore
  }

  if (errors.length > 0) {
    return NextResponse.json({ ok: false, errors }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
