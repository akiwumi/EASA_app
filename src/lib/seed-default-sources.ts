import { getSupabaseAdminClient } from "@/lib/supabase/access";

const DEFAULT_FEEDS = [
  "https://www.easa.europa.eu/en/newsroom-and-events/news/feed.xml",
  "https://www.easa.europa.eu/en/newsroom-and-events/press-releases/feed.xml",
  "https://www.easa.europa.eu/en/document-library/notices-of-proposed-amendment/feed.xml",
  "https://www.easa.europa.eu/en/document-library/opinions/feed.xml",
  "https://www.easa.europa.eu/en/document-library/easy-access-rules/feed.xml",
  "https://www.easa.europa.eu/en/document-library/acceptable-means-of-compliance-and-guidance-material/feed.xml",
];

const DEAD_FEEDS = [
  "https://www.easa.europa.eu/en/rss/news",
  "https://www.easa.europa.eu/en/rss/consultations",
  "https://www.easa.europa.eu/en/rss/publications",
  "https://example.com/feed.xml",
];

export async function seedDefaultSources(orgId: string) {
  const admin = getSupabaseAdminClient();

  await admin
    .from("organizations")
    .upsert({ id: orgId, name: "Demo Flight School" }, { onConflict: "id" });

  if (DEAD_FEEDS.length > 0) {
    await admin.from("sources").delete().in("url", DEAD_FEEDS);
  }

  const inserted: string[] = [];
  const skipped: string[] = [];

  for (const url of DEFAULT_FEEDS) {
    const { data: existing } = await admin
      .from("sources")
      .select("id")
      .eq("url", url)
      .maybeSingle();

    if (existing) {
      await admin
        .from("sources")
        .update({ active: true, organization_id: null })
        .eq("url", url);
      skipped.push(url);
    } else {
      const { error } = await admin.from("sources").insert({
        organization_id: null,
        url,
        type: "rss",
        active: true,
      });
      if (!error) inserted.push(url);
    }
  }

  return { inserted, skipped };
}
