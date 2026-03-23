import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

function parseRssItems(xmlText: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");
  if (!doc) return [];

  return Array.from(doc.querySelectorAll("item")).map((item) => {
    const title = item.querySelector("title")?.textContent?.trim() ?? "Untitled";
    const link = item.querySelector("link")?.textContent?.trim() ?? "";
    const guid =
      item.querySelector("guid")?.textContent?.trim() ?? link ?? crypto.randomUUID();
    const summary = item.querySelector("description")?.textContent?.trim() ?? "";
    const category = item.querySelector("category")?.textContent?.trim() ?? "General";
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

serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    return new Response(
      JSON.stringify({ ok: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." }),
      { status: 400 },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Load all active RSS sources from the database (respects admin enable/disable)
  const { data: sources, error: sourcesError } = await supabase
    .from("sources")
    .select("id, url, organization_id")
    .eq("active", true)
    .eq("type", "rss");

  if (sourcesError) {
    return new Response(
      JSON.stringify({ ok: false, error: sourcesError.message }),
      { status: 500 },
    );
  }

  if (!sources || sources.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, count: 0, results: [], note: "No active RSS sources found." }),
      { status: 200 },
    );
  }

  const ingestResults = [];

  for (const source of sources) {
    try {
      const response = await fetch(source.url);
      if (!response.ok) {
        ingestResults.push({ feed: source.url, inserted: 0, error: `HTTP ${response.status}` });
        continue;
      }
      const xmlText = await response.text();
      const items = parseRssItems(xmlText);

      const payload = items.map((item) => ({
        ...item,
        source_id: source.id,
        organization_id: source.organization_id,
      }));

      const { error: insertError } = await supabase
        .from("rss_items")
        .upsert(payload, { onConflict: "external_id" });

      ingestResults.push({
        feed: source.url,
        inserted: payload.length,
        error: insertError?.message ?? null,
      });
    } catch (err) {
      ingestResults.push({
        feed: source.url,
        inserted: 0,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      count: ingestResults.reduce((sum, r) => sum + r.inserted, 0),
      results: ingestResults,
    }),
    { status: 200 },
  );
});
