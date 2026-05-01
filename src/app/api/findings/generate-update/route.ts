import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/access";
import {
  ensureQueuedUpdatesForOrg,
  generateDraftForProposedUpdate,
  mapRiskLevel,
  parseConfidence,
} from "@/lib/ai/proposed-updates";

const DEFAULT_ORG_ID = "00000000-0000-4000-8000-000000000001";

function isMissingSchemaError(error: { code?: string | null; message?: string | null }) {
  return (
    error.code === "PGRST205" ||
    /could not find the table/i.test(error.message ?? "") ||
    /relation .* does not exist/i.test(error.message ?? "")
  );
}

export async function POST(request: Request) {
  const { findingId, notes } = (await request.json()) as { findingId?: string; notes?: string[] };
  if (!findingId) return NextResponse.json({ error: "findingId required" }, { status: 400 });

  const admin = getSupabaseAdminClient();

  const { data: finding } = await admin
    .from("ai_findings")
    .select("id, organization_id, summary, impact, confidence")
    .eq("id", findingId)
    .maybeSingle();

  if (!finding) return NextResponse.json({ error: "Finding not found" }, { status: 404 });

  const orgId: string = (finding.organization_id as string | null) ?? DEFAULT_ORG_ID;
  const queueResult = await ensureQueuedUpdatesForOrg(admin, orgId);

  if (!queueResult.ok && !queueResult.error.includes("regulation change tables are not set up yet")) {
    return NextResponse.json({ error: queueResult.error }, { status: 400 });
  }

  const { data: regChange, error: regChangeError } = await admin
    .from("reg_changes")
    .select("id")
    .eq("organization_id", orgId)
    .eq("ai_finding_id", findingId)
    .maybeSingle();

  if (regChangeError && !isMissingSchemaError(regChangeError)) {
    return NextResponse.json({ error: regChangeError.message }, { status: 400 });
  }

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

  let resolvedProposedUpdate = proposedUpdate;

  if (!resolvedProposedUpdate) {
    const { data: createdProposal, error: createProposalError } = await admin
      .from("proposed_updates")
      .insert({
        organization_id: orgId,
        reg_change_id: (regChange?.id as string | null) ?? null,
        classification: "watchlist",
        risk_level: mapRiskLevel((finding.impact as string | null) ?? null),
        ai_rationale: (finding.summary as string | null) ?? null,
        confidence_score: parseConfidence((finding.confidence as string | null) ?? null),
        status: "pending",
        ai_model: "generate-update-fallback",
        ai_generated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (createProposalError) {
      return NextResponse.json({ error: createProposalError.message }, { status: 400 });
    }

    resolvedProposedUpdate = createdProposal;
  }

  const result = await generateDraftForProposedUpdate(admin, String(resolvedProposedUpdate.id), notes);
  if (!result.ok) {
    const status =
      result.error.includes("Upload a flight book first") || result.error.includes("configured")
        ? 400
        : result.error.includes("not found")
          ? 404
          : 502;
    const error = result.error.includes("regulation change tables are not set up yet")
      ? "Your Supabase project is missing the regulation change tables. Run the schema migrations, especially `supabase/migrations/schema/004_reg_documents.sql`."
      : result.error;
    return NextResponse.json({ error }, { status });
  }

  return NextResponse.json({
    ok: true,
    ...result.data,
  });
}
