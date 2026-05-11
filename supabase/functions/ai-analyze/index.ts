import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type AnalysisResult = {
  impact: "High" | "Medium" | "Low";
  confidence: string;
  mapped_section: string;
  status: "New" | "Analyzed" | "Ready";
  category: string;
  summary: string;
};

const DEFAULT_RESULT: AnalysisResult = {
  impact: "Medium",
  confidence: "60%",
  mapped_section: "General",
  status: "Analyzed",
  category: "Operations",
  summary: "Proposed update requires a review by compliance.",
};

function heuristicAnalysis(title: string, summary: string): AnalysisResult {
  const text = `${title} ${summary}`.toLowerCase();
  if (text.includes("medical") || text.includes("licensing")) {
    return { impact: "High", confidence: "88%", mapped_section: "General — Aircrew / Licensing", status: "New", category: "Aircrew", summary: "Medical/licensing changes require immediate attention." };
  }
  if (text.includes("fuel") || text.includes("ops") || text.includes("operation")) {
    return { impact: "Medium", confidence: "79%", mapped_section: "General — Operations", status: "Analyzed", category: "Operations", summary: "Operational procedures need a check for updated reserves." };
  }
  if (text.includes("training") || text.includes("syllabus")) {
    return { impact: "Low", confidence: "84%", mapped_section: "General — Training", status: "Ready", category: "Training", summary: "Training documentation should reflect updated syllabus details." };
  }
  return DEFAULT_RESULT;
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>; }
  catch { return null; }
}

type FlightbookSection = { id: string; section_number: string | null; title: string | null; flightbook_name: string };
type SimilarItem = { title: string; summary: string; category: string; similarity: number };

function buildPrompt(title: string, summary: string, sections: FlightbookSection[], similarItems: SimilarItem[]): string {
  const sectionList = sections
    .slice(0, 40)
    .map((s) => `- [${s.flightbook_name}] ${s.section_number ? s.section_number + " " : ""}${s.title ?? "(untitled)"}`)
    .join("\n");

  const similarBlock = similarItems.length > 0
    ? `\nRelated past EASA items (for context — do not copy their classifications blindly):\n` +
      similarItems.slice(0, 3).map((item) =>
        `- [${item.category}] ${item.title}: ${item.summary?.slice(0, 120) ?? ""}…`
      ).join("\n")
    : "";

  return `You are a compliance assistant for an aviation flight school.
Analyse this EASA regulatory update and return a single JSON object with keys:
- impact: "High", "Medium", or "Low"
- confidence: percentage string like "82%"
- mapped_section: the most relevant section from the flight book list below (exact format "[Book name] section_number title"), or "General" if none apply
- status: "New", "Analyzed", or "Ready"
- category: short label (e.g. Aircrew, Operations, Training, Safety, Airworthiness)
- summary: one sentence explaining what needs to be reviewed or updated

EASA Update:
Title: ${title}
Summary: ${summary}
${similarBlock}

${sections.length > 0 ? `Flight book sections:\n${sectionList}` : "No flight book sections uploaded yet. Use a general reference."}

Return only valid JSON, no markdown or commentary.`;
}

async function fetchEmbedding(text: string, openAiKey: string): Promise<number[] | null> {
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openAiKey}` },
      body: JSON.stringify({ model: "text-embedding-3-small", input: text.slice(0, 20000), encoding_format: "float" }),
    });
    if (!res.ok) return null;
    const json = await res.json() as { data?: { embedding?: number[] }[] };
    return json.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

function vectorLiteral(values: number[]) {
  return `[${values.join(",")}]`;
}

// deno-lint-ignore no-explicit-any
async function fetchSimilarItems(
  supabase: any,
  organizationId: string,
  embedding: number[],
  excludeId: string,
): Promise<SimilarItem[]> {
  const { data } = await supabase.rpc("match_rss_items", {
    query_embedding: vectorLiteral(embedding),
    match_count: 3,
    min_similarity: 0.75,
    filter_organization_id: organizationId,
    exclude_id: excludeId,
  });
  return (data ?? []).map((row: Record<string, unknown>) => ({
    title: String(row.title ?? ""),
    summary: String(row.summary ?? ""),
    category: String(row.category ?? ""),
    similarity: Number(row.similarity ?? 0),
  }));
}

function openAiTokenParam(model: string, tokens: number): Record<string, number> {
  return /^o\d/i.test(model) ? { max_completion_tokens: tokens } : { max_tokens: tokens };
}

// ── OpenAI-compatible providers (OpenAI, Groq) ──────────────────────────────
async function callOpenAI(apiKey: string, model: string, baseUrl: string, prompt: string): Promise<string | null> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ model, ...openAiTokenParam(model, 512), messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) return null;
  const json = await res.json() as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? null;
}

// ── Anthropic ────────────────────────────────────────────────────────────────
async function callAnthropic(apiKey: string, model: string, prompt: string): Promise<string | null> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, max_tokens: 512, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) return null;
  const json = await res.json() as { content?: { type: string; text: string }[] };
  const block = json.content?.find((b) => b.type === "text");
  return block?.text ?? null;
}

// ── Google Gemini ────────────────────────────────────────────────────────────
async function callGoogle(apiKey: string, model: string, prompt: string): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 512 } }),
  });
  if (!res.ok) return null;
  const json = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

async function aiAnalysis(
  title: string,
  summary: string,
  sections: FlightbookSection[],
  provider: string,
  model: string,
  apiKey: string,
  similarItems: SimilarItem[] = [],
): Promise<AnalysisResult> {
  const prompt = buildPrompt(title, summary, sections, similarItems);

  try {
    let text: string | null = null;

    if (provider === "openai") {
      text = await callOpenAI(apiKey, model, "https://api.openai.com/v1", prompt);
    } else if (provider === "groq") {
      text = await callOpenAI(apiKey, model, "https://api.groq.com/openai/v1", prompt);
    } else if (provider === "anthropic") {
      text = await callAnthropic(apiKey, model, prompt);
    } else if (provider === "google") {
      text = await callGoogle(apiKey, model, prompt);
    }

    if (!text) return heuristicAnalysis(title, summary);
    const parsed = extractJsonObject(text);
    if (!parsed) return heuristicAnalysis(title, summary);

    const impactRaw = String(parsed.impact ?? "");
    const impact = ["High", "Medium", "Low"].includes(impactRaw)
      ? (impactRaw as AnalysisResult["impact"])
      : DEFAULT_RESULT.impact;

    return {
      impact,
      confidence: String(parsed.confidence ?? DEFAULT_RESULT.confidence),
      mapped_section: String(parsed.mapped_section ?? DEFAULT_RESULT.mapped_section),
      status: (["New", "Analyzed", "Ready"].includes(String(parsed.status)) ? parsed.status : DEFAULT_RESULT.status) as AnalysisResult["status"],
      category: String(parsed.category ?? DEFAULT_RESULT.category),
      summary: String(parsed.summary ?? DEFAULT_RESULT.summary),
    };
  } catch {
    return heuristicAnalysis(title, summary);
  }
}

serve(async (request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ ok: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." }), { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const payload = await request.json().catch(() => ({}));
  const organizationId =
    typeof payload?.organizationId === "string" && payload.organizationId
      ? payload.organizationId
      : null;

  // Load AI provider config saved via admin panel
  let aiConfigQuery = supabase
    .from("ai_provider_config")
    .select("provider, model, api_key");

  if (organizationId) {
    aiConfigQuery = aiConfigQuery.eq("organization_id", organizationId);
  } else {
    aiConfigQuery = aiConfigQuery.limit(1);
  }

  const { data: aiConfig } = await aiConfigQuery.maybeSingle();

  const provider = aiConfig?.provider ?? "openai";
  const model = aiConfig?.model ?? "gpt-4o";
  // Fall back to environment variable if no key stored in DB yet
  const apiKey = (aiConfig?.api_key as string | null) ?? Deno.env.get("OPENAI_API_KEY") ?? "";

  // Fetch unanalyzed RSS items
  let rssQuery = supabase
    .from("rss_items")
    .select("id,title,summary,category,organization_id,published_at")
    .order("published_at", { ascending: false })
    .limit(25);

  if (organizationId) {
    rssQuery = rssQuery.eq("organization_id", organizationId);
  }

  const { data: rssItems, error } = await rssQuery;

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
  }

  const rssItemIds = (rssItems ?? []).map((item) => item.id as string);

  // Scope the existing-findings check to the current org so that findings from a
  // different org (or a previous null-org run) don't silently block analysis here.
  let existingQuery = rssItemIds.length
    ? supabase.from("ai_findings").select("rss_item_id").in("rss_item_id", rssItemIds)
    : null;
  if (existingQuery && organizationId) existingQuery = existingQuery.eq("organization_id", organizationId);
  const { data: existingFindings } = existingQuery
    ? await existingQuery
    : { data: [] as { rss_item_id: string }[] };

  const existingFindingIds = new Set((existingFindings ?? []).map((row) => row.rss_item_id));
  const pendingItems = (rssItems ?? []).filter((item) => !existingFindingIds.has(item.id as string));

  // Fetch active flightbook section titles for mapping context
  let sectionsQuery = supabase
    .from("flightbook_sections")
    .select("id, section_number, title, flightbooks!inner(name, active)")
    .eq("flightbooks.active", true)
    .not("title", "is", null)
    .order("sort_order", { ascending: true })
    .limit(60);

  if (organizationId) {
    sectionsQuery = sectionsQuery.eq("organization_id", organizationId);
  }

  const { data: rawSections, error: rawSectionsError } = await sectionsQuery;

  const sections: FlightbookSection[] = (rawSectionsError ? [] : (rawSections ?? [])).map((s) => {
    const fb = Array.isArray(s.flightbooks) ? s.flightbooks[0] : s.flightbooks;
    return { id: s.id, section_number: s.section_number, title: s.title, flightbook_name: (fb as { name: string })?.name ?? "Unknown" };
  });

  // Resolve an OpenAI key for embeddings (independent of the primary AI provider).
  const openAiKey: string | null = (() => {
    if (provider === "openai" && apiKey && apiKey.startsWith("sk-") && !apiKey.startsWith("sk-ant-")) return apiKey;
    const envKey = Deno.env.get("OPENAI_API_KEY") ?? "";
    return envKey && envKey.startsWith("sk-") && !envKey.startsWith("sk-ant-") ? envKey : null;
  })();

  const findingsPayload = [];

  for (const item of pendingItems) {
    let similarItems: SimilarItem[] = [];
    if (openAiKey && item.organization_id) {
      const queryText = [item.title, item.summary].filter(Boolean).join("\n");
      const embedding = await fetchEmbedding(queryText, openAiKey);
      if (embedding) {
        similarItems = await fetchSimilarItems(supabase, item.organization_id as string, embedding, item.id as string);
        // Persist the embedding so future items can match against this one
        await supabase.from("rss_items").update({ embedding: vectorLiteral(embedding) }).eq("id", item.id);
      }
    }
    const analysis = await aiAnalysis(item.title, item.summary ?? "", sections, provider, model, apiKey, similarItems);
    findingsPayload.push({
      rss_item_id: item.id,
      organization_id: item.organization_id ?? null,
      impact: analysis.impact,
      confidence: analysis.confidence,
      mapped_section: analysis.mapped_section,
      status: analysis.status,
      category: analysis.category,
      summary: analysis.summary,
    });
  }

  if (findingsPayload.length > 0) {
    const { error: insertError } = await supabase
      .from("ai_findings")
      .upsert(findingsPayload, { onConflict: "rss_item_id,organization_id" });
    if (insertError) {
      return new Response(JSON.stringify({ ok: false, error: insertError.message }), { status: 500 });
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      analyzed: findingsPayload.length,
      provider,
      model,
      bookSectionsUsed: sections.length,
      rssItemsConsidered: pendingItems.length,
    }),
    { status: 200 },
  );
});
