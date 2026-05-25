import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/access";

function authorized(request: Request) {
  const secret = process.env.SCHEDULED_PIPELINE_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

type CandidateRow = {
  id: string;
  organization_id: string;
  summary: string | null;
};

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdminClient();
  const thresholdIso = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const { data: staleFindings, error: staleError } = await admin
    .from("ai_findings")
    .select("id, organization_id, summary")
    .is("deleted_at", null)
    .lt("created_at", thresholdIso)
    .order("created_at", { ascending: true })
    .limit(500);

  if (staleError) return NextResponse.json({ ok: false, error: staleError.message }, { status: 400 });

  const candidates = (staleFindings ?? []) as CandidateRow[];
  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, archived: 0, notifiedOrganizations: 0 });
  }

  const summaries = Array.from(
    new Set(candidates.map((row) => row.summary).filter((value): value is string => Boolean(value))),
  );
  const { data: linkedUpdates } = summaries.length > 0
    ? await admin
        .from("proposed_updates")
        .select("id, ai_rationale, status")
        .in("ai_rationale", summaries)
        .eq("status", "approved")
    : { data: [] };
  const approvedSummarySet = new Set(
    (linkedUpdates ?? []).map((row) => (row.ai_rationale as string | null) ?? "").filter(Boolean),
  );

  const archiveIds = candidates
    .filter((row) => !(row.summary && approvedSummarySet.has(row.summary)))
    .map((row) => row.id);
  if (archiveIds.length === 0) {
    return NextResponse.json({ ok: true, archived: 0, notifiedOrganizations: 0 });
  }

  const archivedAtIso = new Date().toISOString();
  const { error: archiveError } = await admin
    .from("ai_findings")
    .update({
      deleted_at: archivedAtIso,
      dismissed_at: archivedAtIso,
      dismissal_reason: "auto-archived: no action after 90 days",
    })
    .in("id", archiveIds)
    .is("deleted_at", null);
  if (archiveError) return NextResponse.json({ ok: false, error: archiveError.message }, { status: 400 });

  const archivedByOrg = new Map<string, number>();
  for (const row of candidates) {
    if (!archiveIds.includes(row.id)) continue;
    archivedByOrg.set(row.organization_id, (archivedByOrg.get(row.organization_id) ?? 0) + 1);
  }

  for (const [organizationId, count] of archivedByOrg.entries()) {
    const { data: orgUsers } = await admin
      .from("org_users")
      .select("user_id, role")
      .eq("organization_id", organizationId)
      .in("role", ["admin", "compliance_manager"]);
    if (!orgUsers?.length) continue;
    await admin.from("notifications").insert(
      orgUsers.map((user) => ({
        organization_id: organizationId,
        user_id: user.user_id as string,
        type: "pipeline_summary",
        title: `${count} finding${count === 1 ? "" : "s"} auto-archived`,
        body: `${count} findings were auto-archived after 90 days with no review. View archived items in Results.`,
        related_entity_type: "ai_finding",
        related_entity_id: archiveIds[0],
      })),
    );
  }

  return NextResponse.json({
    ok: true,
    archived: archiveIds.length,
    notifiedOrganizations: archivedByOrg.size,
  });
}

export async function GET(request: Request) {
  return POST(request);
}
