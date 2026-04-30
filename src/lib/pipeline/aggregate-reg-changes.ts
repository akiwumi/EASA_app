import type { SupabaseClient } from "@supabase/supabase-js";

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
  if ((impact ?? "").toLowerCase() === "high") return "modified";
  if ((impact ?? "").toLowerCase() === "medium") return "modified";
  return "added";
}

export async function aggregateRegChangesForOrg(
  admin: SupabaseClient,
  organizationId: string,
) {
  const { data: findings, error: findingsErr } = await admin
    .from("ai_findings")
    .select(
      `id, impact, category, mapped_section, summary, organization_id, created_at,
      rss_items ( title, published_at )`,
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (findingsErr) {
    return { ok: false as const, status: 500, error: findingsErr.message };
  }

  const { data: existing, error: existingErr } = await admin
    .from("reg_changes")
    .select("ai_finding_id")
    .eq("organization_id", organizationId)
    .not("ai_finding_id", "is", null);

  if (existingErr) {
    return { ok: false as const, status: 400, error: existingErr.message };
  }

  const linkedIds = new Set((existing ?? []).map((row) => row.ai_finding_id as string));
  const toAggregate = (findings ?? []).filter((finding) => !linkedIds.has(finding.id as string));

  if (toAggregate.length === 0) {
    return {
      ok: true as const,
      status: 200,
      payload: { ok: true, created: 0, message: "No new findings to aggregate." },
    };
  }

  const rows = toAggregate.map((finding) => {
    const rss = Array.isArray(finding.rss_items) ? finding.rss_items[0] : finding.rss_items;
    return {
      organization_id: organizationId,
      ai_finding_id: finding.id as string,
      reg_part: categoryToPart(finding.category as string | null),
      section_ref: (finding.mapped_section as string | null) ?? null,
      change_type: impactToChangeType(finding.impact as string | null),
      diff_text: (finding.summary as string | null) ?? null,
      detected_at: (rss?.published_at as string | null) ?? (finding.created_at as string),
    };
  });

  const { data: created, error: insertErr } = await admin
    .from("reg_changes")
    .insert(rows)
    .select("id");

  if (insertErr) {
    return { ok: false as const, status: 400, error: insertErr.message };
  }

  const createdRows = created ?? [];
  for (let index = 0; index < createdRows.length; index += 1) {
    const regChangeId = createdRows[index].id as string;
    const finding = toAggregate[index];

    await admin
      .from("proposed_updates")
      .update({ reg_change_id: regChangeId })
      .eq("ai_rationale", (finding.summary as string | null) ?? "")
      .eq("organization_id", organizationId)
      .is("reg_change_id", null);
  }

  return {
    ok: true as const,
    status: 200,
    payload: { ok: true, created: createdRows.length },
  };
}
