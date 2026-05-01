import { NextResponse } from "next/server";
import { getOrgAccessContext, getSupabaseAdminClient } from "@/lib/supabase/access";
import { insertProposedUpdateWithFallback, mapRiskLevel, parseConfidence } from "@/lib/ai/proposed-updates";

export async function POST(request: Request) {
  const ctx = await getOrgAccessContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { findingId } = (await request.json()) as { findingId?: string };
  if (!findingId) return NextResponse.json({ error: "findingId required" }, { status: 400 });

  const admin = getSupabaseAdminClient();

  // Fetch the finding
  const { data: finding, error: findingErr } = await admin
    .from("ai_findings")
    .select("id, impact, confidence, mapped_section, status, category, summary, organization_id")
    .eq("id", findingId)
    .maybeSingle();

  if (findingErr || !finding) {
    return NextResponse.json({ error: "Finding not found" }, { status: 404 });
  }

  if ((finding.organization_id as string | null) !== ctx.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check if already queued (avoid duplicates)
  const { data: existing } = await admin
    .from("proposed_updates")
    .select("id")
    .eq("ai_rationale", finding.summary ?? "")
    .eq("organization_id", ctx.orgId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, id: existing.id, alreadyQueued: true });
  }

  const { data: regChange } = await admin
    .from("reg_changes")
    .select("id")
    .eq("organization_id", ctx.orgId)
    .eq("ai_finding_id", findingId)
    .maybeSingle();

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

  if (createErr) return NextResponse.json({ error: createErr.message }, { status: 400 });
  return NextResponse.json({ ok: true, id: created.id });
}
