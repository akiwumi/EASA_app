import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

/** Extract content of an XML tag, stripping CDATA wrappers. */
function extractTag(xml: string, tag: string): string {
  const re = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`,
    "i",
  );
  const m = xml.match(re);
  return m ? m[1].trim() : "";
}

/** Parse RSS 2.0 <item> blocks with regex — works in Deno without DOMParser. */
function parseRssItems(xmlText: string) {
  const items: {
    external_id: string;
    title: string;
    summary: string;
    link: string;
    category: string;
    published_at: string | null;
    raw_xml: string;
  }[] = [];

  const itemRe = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;

  while ((m = itemRe.exec(xmlText)) !== null) {
    const block = m[1];
    const title = extractTag(block, "title") || "Untitled";
    const link = extractTag(block, "link");
    const guid = extractTag(block, "guid") || link || crypto.randomUUID();
    const summary = extractTag(block, "description") || extractTag(block, "summary");
    const category = extractTag(block, "category") || "General";
    const pubDate = extractTag(block, "pubDate") || extractTag(block, "dc:date") || extractTag(block, "published");
    const publishedAt = pubDate ? (() => { try { return new Date(pubDate).toISOString(); } catch { return null; } })() : null;

    if (title && (link || guid)) {
      items.push({ external_id: guid, title, summary, link, category, published_at: publishedAt, raw_xml: m[0].slice(0, 2000) });
    }
  }

  return items;
}

serve(async (request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    return new Response(
      JSON.stringify({ ok: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const payload = await request.json().catch(() => ({}));
  const organizationId =
    typeof payload?.organizationId === "string" && payload.organizationId
      ? payload.organizationId
      : null;

  // Load all active RSS sources
  let sourcesQuery = supabase
    .from("sources")
    .select("id, url, organization_id")
    .eq("active", true)
    .eq("type", "rss");

  if (organizationId) {
    sourcesQuery = sourcesQuery.or(`organization_id.eq.${organizationId},organization_id.is.null`);
  }

  const { data: sources, error: sourcesError } = await sourcesQuery;

  if (sourcesError) {
    return new Response(
      JSON.stringify({ ok: false, error: sourcesError.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!sources || sources.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, count: 0, results: [], note: "No active RSS sources found in database." }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const ingestResults: { feed: string; inserted: number; error: string | null }[] = [];
  let totalInserted = 0;

  for (const source of sources) {
    try {
      const response = await fetch(source.url, {
        headers: { "User-Agent": "EASA-Compliance-Bot/1.0" },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        ingestResults.push({ feed: source.url, inserted: 0, error: `HTTP ${response.status}` });
        continue;
      }

      const xmlText = await response.text();
      const items = parseRssItems(xmlText);

      if (items.length === 0) {
        ingestResults.push({ feed: source.url, inserted: 0, error: "No <item> elements found in feed" });
        continue;
      }

      const payload = items.map((item) => ({
        ...item,
        source_id: source.id,
        organization_id: source.organization_id ?? organizationId,
      }));

      const { error: insertError } = await supabase
        .from("rss_items")
        .upsert(payload, { onConflict: "external_id" });

      if (insertError) {
        ingestResults.push({ feed: source.url, inserted: 0, error: insertError.message });
      } else {
        ingestResults.push({ feed: source.url, inserted: payload.length, error: null });
        totalInserted += payload.length;
      }
    } catch (err) {
      ingestResults.push({
        feed: source.url,
        inserted: 0,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return new Response(
    JSON.stringify({ ok: true, count: totalInserted, results: ingestResults }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
