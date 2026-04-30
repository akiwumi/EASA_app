import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/access";
import {
  ensureQueuedUpdatesForOrg,
  generateDraftForProposedUpdate,
} from "@/lib/ai/proposed-updates";

const DEFAULT_ORG_ID = "00000000-0000-4000-8000-000000000001";

export async function POST(request: Request) {
  const { findingId, notes } = (await request.json()) as { findingId?: string; notes?: string[] };
  if (!findingId) return NextResponse.json({ error: "findingId required" }, { status: 400 });

  const admin = getSupabaseAdminClient();

  const { data: finding } = await admin
    .from("ai_findings")
    .select("id, organization_id, summary")
    .eq("id", findingId)
    .maybeSingle();

  if (!finding) return NextResponse.json({ error: "Finding not found" }, { status: 404 });

  const orgId: string = (finding.organization_id as string | null) ?? DEFAULT_ORG_ID;
  const queueResult = await ensureQueuedUpdatesForOrg(admin, orgId);

  if (!queueResult.ok) {
    return NextResponse.json({ error: queueResult.error }, { status: 400 });
  }

  const { data: regChange } = await admin
    .from("reg_changes")
    .select("id")
    .eq("organization_id", orgId)
    .eq("ai_finding_id", findingId)
    .maybeSingle();

  const regChangeProposal = regChange?.id
    ? await admin
        .from("proposed_updates")
        .select("id")
        .eq("organization_id", orgId)
        .eq("reg_change_id", String(regChange.id))
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const rationaleProposal =
    regChangeProposal.data || !finding.summary
      ? { data: null }
      : await admin
          .from("proposed_updates")
          .select("id")
          .eq("organization_id", orgId)
          .eq("ai_rationale", String(finding.summary))
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

  const proposedUpdate = regChangeProposal.data ?? rationaleProposal.data;

  if (!proposedUpdate) {
    return NextResponse.json(
      { error: "No proposed update could be created for this finding yet." },
      { status: 404 },
    );
  }

  const result = await generateDraftForProposedUpdate(admin, String(proposedUpdate.id), notes);
  if (!result.ok) {
    const status =
      result.error.includes("Upload a flight book first") || result.error.includes("configured")
        ? 400
        : result.error.includes("not found")
          ? 404
          : 502;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    ok: true,
    ...result.data,
  });
}
