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

// Map AI analysis category → EASA regulation part family
const CATEGORY_TO_PART: Record<string, string> = {
  aircrew: "Part-FCL",
  licensing: "Part-FCL",
  medical: "Part-MED",
  operations: "Part-ORO",
  training: "Part-ORA",
  safety: "Part-ARO",
  airworthiness: "Part-M",
  maintenance: "Part-145",
  commercial: "Part-CAT",
  "non-commercial": "Part-NCO",
  aerodromes: "Part-ADR",
  "atm/ans": "Part-ATM/ANS",
  general: "General",
};

function categoryToPart(category: string | null): string {
  if (!category) return "General";
  const key = category.toLowerCase().trim();
  return CATEGORY_TO_PART[key] ?? "General";
}

function impactToChangeType(impact: string | null): string {
  // All EASA feed items are amendments — "added" for new items, "modified" for updates
  if ((impact ?? "").toLowerCase() === "high") return "modified";
  if ((impact ?? "").toLowerCase() === "medium") return "modified";
  return "added";
}

export async function POST() {
  const admin = getAdminClient();

  // 1. Find ai_findings not yet linked to a reg_change
  const { data: findings, error: findingsErr } = await admin
    .from("ai_findings")
    .select(`id, impact, category, mapped_section, summary, organization_id, created_at,
      rss_items ( title, published_at )`)
    .order("created_at", { ascending: false })
    .limit(200);

  if (findingsErr) {
    return NextResponse.json({ error: findingsErr.message }, { status: 500 });
  }

  // 2. Get already-linked finding IDs to skip duplicates
  const { data: existing } = await admin
    .from("reg_changes")
    .select("ai_finding_id")
    .not("ai_finding_id", "is", null);

  const linkedIds = new Set((existing ?? []).map((r) => r.ai_finding_id as string));

  const toAggregate = (findings ?? []).filter((f) => !linkedIds.has(f.id as string));

  if (toAggregate.length === 0) {
    return NextResponse.json({ ok: true, created: 0, message: "No new findings to aggregate." });
  }

  // 3. Build reg_changes rows
  const rows = toAggregate.map((finding) => {
    const rss = Array.isArray(finding.rss_items) ? finding.rss_items[0] : finding.rss_items;
    const orgId = (finding.organization_id as string | null) ?? DEFAULT_ORG_ID;
    const regPart = categoryToPart(finding.category as string | null);
    const changeType = impactToChangeType(finding.impact as string | null);

    return {
      organization_id: orgId,
      ai_finding_id: finding.id as string,
      reg_part: regPart,
      section_ref: (finding.mapped_section as string | null) ?? null,
      change_type: changeType,
      diff_text: (finding.summary as string | null) ?? null,
      detected_at: (rss?.published_at as string | null) ?? (finding.created_at as string),
    };
  });

  const { data: created, error: insertErr } = await admin
    .from("reg_changes")
    .insert(rows)
    .select("id");

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 400 });
  }

  // 4. Link back: update proposed_updates.reg_change_id where ai_rationale matches the finding summary
  //    Best-effort — only updates records that already exist in proposed_updates
  const createdRows = created ?? [];
  for (let i = 0; i < createdRows.length; i++) {
    const regChangeId = createdRows[i].id as string;
    const finding = toAggregate[i];
    const orgId = (finding.organization_id as string | null) ?? DEFAULT_ORG_ID;
    await admin
      .from("proposed_updates")
      .update({ reg_change_id: regChangeId })
      .eq("ai_rationale", (finding.summary as string | null) ?? "")
      .eq("organization_id", orgId)
      .is("reg_change_id", null);
  }

  return NextResponse.json({ ok: true, created: createdRows.length });
}
