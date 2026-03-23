import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function GET() {
  const admin = getAdminClient();

  const [
    { count: sourcesTotal },
    { count: sourcesActive },
    { count: rssItems },
    { count: aiFindings },
    { data: recentFindings },
    { data: recentItems },
    { data: aiConfig },
  ] = await Promise.all([
    admin.from("sources").select("*", { count: "exact", head: true }),
    admin.from("sources").select("*", { count: "exact", head: true }).eq("active", true).eq("type", "rss"),
    admin.from("rss_items").select("*", { count: "exact", head: true }),
    admin.from("ai_findings").select("*", { count: "exact", head: true }),
    admin.from("ai_findings").select("id, impact, category, created_at").order("created_at", { ascending: false }).limit(3),
    admin.from("rss_items").select("id, title, created_at").order("created_at", { ascending: false }).limit(3),
    admin.from("ai_provider_config").select("provider, model, api_key").limit(1).maybeSingle(),
  ]);

  return NextResponse.json({
    sources: { total: sourcesTotal ?? 0, activeRss: sourcesActive ?? 0 },
    rssItems: rssItems ?? 0,
    aiFindings: aiFindings ?? 0,
    recentRssItems: recentItems ?? [],
    recentFindings: recentFindings ?? [],
    aiConfig: aiConfig
      ? { provider: aiConfig.provider, model: aiConfig.model, hasKey: !!aiConfig.api_key }
      : null,
  });
}
