import { NextResponse } from "next/server";
import { getOrgAdminContext, getSupabaseAdminClient } from "@/lib/supabase/access";
import { seedDefaultSources } from "@/lib/seed-default-sources";

export async function GET() {
  const ctx = await getOrgAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = getSupabaseAdminClient();
  const organizationId = ctx.orgId;

  const { data: sourceIds } = await admin
    .from("sources")
    .select("id")
    .or(`organization_id.eq.${organizationId},organization_id.is.null`);

  if ((sourceIds ?? []).length === 0) {
    await seedDefaultSources(organizationId);
  }
  const scopedSourceIds = (sourceIds ?? []).map((source) => source.id as string);

  const [
    { count: sourcesTotal },
    { count: sourcesActive },
    { count: rssItems },
    { count: aiFindings },
    { count: regChanges },
    { count: sourceSnapshots },
    { count: documentSections },
    { data: recentFindings },
    { data: recentItems },
    { data: aiConfig },
  ] = await Promise.all([
    admin
      .from("sources")
      .select("*", { count: "exact", head: true })
      .eq("type", "rss")
      .or(`organization_id.eq.${organizationId},organization_id.is.null`),
    admin
      .from("sources")
      .select("*", { count: "exact", head: true })
      .eq("type", "rss")
      .or(`organization_id.eq.${organizationId},organization_id.is.null`)
      .eq("active", true),
    admin
      .from("rss_items")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    admin
      .from("ai_findings")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    admin
      .from("reg_changes")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    scopedSourceIds.length > 0
      ? admin
          .from("source_snapshots")
          .select("*", { count: "exact", head: true })
          .in("source_id", scopedSourceIds)
      : Promise.resolve({ count: 0 }),
    admin
      .from("document_sections")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    admin
      .from("ai_findings")
      .select("id, impact, category, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(3),
    admin
      .from("rss_items")
      .select("id, title, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(3),
    admin
      .from("ai_provider_config")
      .select("provider, model, api_key")
      .eq("organization_id", organizationId)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    sources: { total: sourcesTotal ?? 0, activeRss: sourcesActive ?? 0 },
    rssItems: rssItems ?? 0,
    aiFindings: aiFindings ?? 0,
    regChanges: regChanges ?? 0,
    sourceSnapshots: sourceSnapshots ?? 0,
    documentSections: documentSections ?? 0,
    recentRssItems: recentItems ?? [],
    recentFindings: recentFindings ?? [],
    aiConfig: aiConfig
      ? { provider: aiConfig.provider, model: aiConfig.model, hasKey: aiConfig.provider === "openai" || !!aiConfig.api_key }
      : null,
  });
}
