import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";

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

const CLAUDE_MODEL =
  Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-20250514";

/** Simple keyword-based fallback when no AI key is present. */
function heuristicAnalysis(title: string, summary: string): AnalysisResult {
  const text = `${title} ${summary}`.toLowerCase();

  if (text.includes("medical") || text.includes("licensing")) {
    return {
      impact: "High",
      confidence: "88%",
      mapped_section: "General — Aircrew / Licensing",
      status: "New",
      category: "Aircrew",
      summary: "Medical/licensing changes require immediate attention.",
    };
  }
  if (text.includes("fuel") || text.includes("ops") || text.includes("operation")) {
    return {
      impact: "Medium",
      confidence: "79%",
      mapped_section: "General — Operations",
      status: "Analyzed",
      category: "Operations",
      summary: "Operational procedures need a check for updated reserves.",
    };
  }
  if (text.includes("training") || text.includes("syllabus")) {
    return {
      impact: "Low",
      confidence: "84%",
      mapped_section: "General — Training",
      status: "Ready",
      category: "Training",
      summary: "Training documentation should reflect updated syllabus details.",
    };
  }

  return DEFAULT_RESULT;
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

type FlightbookSection = {
  id: string;
  section_number: string | null;
  title: string | null;
  body: string;
  flightbook_name: string;
};

async function aiAnalysis(
  title: string,
  summary: string,
  sections: FlightbookSection[],
): Promise<AnalysisResult> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return heuristicAnalysis(title, summary);
  }

  const client = new Anthropic({ apiKey });

  // Build a condensed section index for the prompt (title only, not full body)
  const sectionList = sections
    .slice(0, 40)
    .map((s) => {
      const ref = s.section_number ? `${s.section_number} ` : "";
      return `- [${s.flightbook_name}] ${ref}${s.title ?? "(untitled)"}`;
    })
    .join("\n");

  const hasBooks = sections.length > 0;

  const prompt = `You are a compliance assistant for an aviation flight school.
Analyse this EASA regulatory update and return a single JSON object with these keys:
- impact: "High", "Medium", or "Low"
- confidence: percentage string like "82%"
- mapped_section: the most relevant section from the flight book list below (use the exact format "[Book name] section_number title"), or "General" if none apply
- status: "New", "Analyzed", or "Ready"
- category: short label (e.g. Aircrew, Operations, Training, Safety, Airworthiness)
- summary: one sentence explaining what needs to be reviewed or updated

EASA Update:
Title: ${title}
Summary: ${summary}

${hasBooks
  ? `Flight book sections (identify which one is most affected):\n${sectionList}`
  : "No flight book sections have been uploaded yet. Use a general reference."}

Return only valid JSON, no markdown or commentary.`;

  try {
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const block = response.content?.[0];
    const text = block && block.type === "text" ? block.text : "";
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
      status: (["New", "Analyzed", "Ready"].includes(String(parsed.status))
        ? parsed.status
        : DEFAULT_RESULT.status) as AnalysisResult["status"],
      category: String(parsed.category ?? DEFAULT_RESULT.category),
      summary: String(parsed.summary ?? DEFAULT_RESULT.summary),
    };
  } catch {
    return heuristicAnalysis(title, summary);
  }
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

  // Fetch unanalyzed RSS items
  const { data: rssItems, error } = await supabase
    .from("rss_items")
    .select("id,title,summary,category,organization_id,source_id,published_at,ai_findings(id)")
    .is("ai_findings.id", null)
    .order("published_at", { ascending: false })
    .limit(25);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
  }

  // Fetch flightbook sections for context (active books only, titles only for token efficiency)
  const { data: rawSections } = await supabase
    .from("flightbook_sections")
    .select("id, section_number, title, body, flightbooks!inner(name, active)")
    .eq("flightbooks.active", true)
    .not("title", "is", null)
    .order("sort_order", { ascending: true })
    .limit(60);

  const sections: FlightbookSection[] = (rawSections ?? []).map((s) => {
    const fb = Array.isArray(s.flightbooks) ? s.flightbooks[0] : s.flightbooks;
    return {
      id: s.id,
      section_number: s.section_number,
      title: s.title,
      body: s.body,
      flightbook_name: (fb as { name: string })?.name ?? "Unknown",
    };
  });

  const findingsPayload = [];

  for (const item of rssItems ?? []) {
    const analysis = await aiAnalysis(item.title, item.summary ?? "", sections);
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
      .insert(findingsPayload);

    if (insertError) {
      return new Response(
        JSON.stringify({ ok: false, error: insertError.message }),
        { status: 500 },
      );
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      analyzed: findingsPayload.length,
      bookSectionsUsed: sections.length,
    }),
    { status: 200 },
  );
});
