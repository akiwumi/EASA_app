import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const DEFAULT_FEEDS = [
  "https://www.easa.europa.eu/en/rss/news",
  "https://www.easa.europa.eu/en/rss/consultations",
  "https://www.easa.europa.eu/en/rss/publications",
];

function normalizeFeedList(envValue: string | undefined) {
  if (!envValue) {
    return DEFAULT_FEEDS;
  }

  return envValue
    .split(",")
    .map((feed) => feed.trim())
    .filter(Boolean);
}

function parseRssItems(xmlText: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");

  if (!doc) {
    return [];
  }

  return Array.from(doc.querySelectorAll("item")).map((item) => {
    const title = item.querySelector("title")?.textContent?.trim() ?? "Untitled";
    const link = item.querySelector("link")?.textContent?.trim() ?? "";
    const guid =
      item.querySelector("guid")?.textContent?.trim() ??
      link ??
      crypto.randomUUID();
    const summary =
      item.querySelector("description")?.textContent?.trim() ?? "";
    const category =
      item.querySelector("category")?.textContent?.trim() ?? "General";
    const pubDate = item.querySelector("pubDate")?.textContent?.trim();
    const publishedAt = pubDate ? new Date(pubDate).toISOString() : null;

    return {
      external_id: guid,
      title,
      summary,
      link,
      category,
      published_at: publishedAt,
      raw_xml: item.outerHTML ?? "",
    };
  });
}

serve(async (request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
      }),
      { status: 400 },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const feedList = normalizeFeedList(Deno.env.get("EASA_RSS_FEEDS"));

  const { data: sources, error: sourcesError } = await supabase
    .from("sources")
    .select("id,url,organization_id,active")
    .in("url", feedList);

  if (sourcesError) {
    return new Response(
      JSON.stringify({ ok: false, error: sourcesError.message }),
      { status: 500 },
    );
  }

  const sourceMap = new Map(
    (sources ?? []).map((source) => [source.url, source]),
  );

  const ingestResults = [];

  for (const feedUrl of feedList) {
    const response = await fetch(feedUrl);
    const xmlText = await response.text();
    const items = parseRssItems(xmlText);

    const sourceRecord = sourceMap.get(feedUrl);
    let sourceId = sourceRecord?.id ?? null;
    let organizationId = sourceRecord?.organization_id ?? null;

    if (!sourceRecord) {
      const { data: insertedSource } = await supabase
        .from("sources")
        .insert({
          url: feedUrl,
          active: true,
          type: "rss",
          organization_id: null,
        })
        .select("id,organization_id")
        .single();

      if (insertedSource) {
        sourceId = insertedSource.id;
        organizationId = insertedSource.organization_id;
      }
    }

    const payload = items.map((item) => ({
      ...item,
      source_id: sourceId,
      organization_id: organizationId,
    }));

    const { error: insertError } = await supabase
      .from("rss_items")
      .upsert(payload, { onConflict: "external_id" });

    ingestResults.push({
      feed: feedUrl,
      inserted: payload.length,
      error: insertError?.message ?? null,
    });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      count: ingestResults.reduce((sum, item) => sum + item.inserted, 0),
      results: ingestResults,
    }),
    { status: 200 },
  );
});
