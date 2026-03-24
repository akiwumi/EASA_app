import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_ORG_ID = "00000000-0000-4000-8000-000000000001";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function parseConfidence(str: string | null): number | null {
  if (!str) return null;
  const n = parseFloat(str.replace("%", ""));
  return isNaN(n) ? null : n;
}

function mapRiskLevel(impact: string | null): string {
  const i = (impact ?? "").toLowerCase();
  if (i === "high") return "high";
  if (i === "low") return "low";
  return "medium";
}

export async function POST(request: Request) {
  const { findingId } = (await request.json()) as { findingId?: string };
  if (!findingId) return NextResponse.json({ error: "findingId required" }, { status: 400 });

  const admin = getAdminClient();

  // Fetch the finding
  const { data: finding, error: findingErr } = await admin
    .from("ai_findings")
    .select("id, impact, confidence, mapped_section, status, category, summary, organization_id")
    .eq("id", findingId)
    .maybeSingle();

  if (findingErr || !finding) {
    return NextResponse.json({ error: "Finding not found" }, { status: 404 });
  }

  // Check if already queued (avoid duplicates)
  const { data: existing } = await admin
    .from("proposed_updates")
    .select("id")
    .eq("ai_rationale", finding.summary ?? "")
    .eq("organization_id", finding.organization_id ?? DEFAULT_ORG_ID)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, id: existing.id, alreadyQueued: true });
  }

  const { data: created, error: createErr } = await admin
    .from("proposed_updates")
    .insert({
      organization_id: finding.organization_id ?? DEFAULT_ORG_ID,
      classification: "watchlist",
      risk_level: mapRiskLevel(finding.impact),
      ai_rationale: finding.summary,
      confidence_score: parseConfidence(finding.confidence),
      status: "pending",
      ai_model: "ai-analyze",
      ai_generated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (createErr) return NextResponse.json({ error: createErr.message }, { status: 400 });
  return NextResponse.json({ ok: true, id: created.id });
}
