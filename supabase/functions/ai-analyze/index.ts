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
  confidence: "72%",
  mapped_section: "Operations SOP 4.2",
  status: "Analyzed",
  category: "Operations",
  summary: "Proposed update requires a review by compliance.",
};

function heuristicAnalysis(title: string, summary: string): AnalysisResult {
  const text = `${title} ${summary}`.toLowerCase();

  if (text.includes("medical") || text.includes("licensing")) {
    return {
      impact: "High",
      confidence: "88%",
      mapped_section: "Training Manual 3.4.2",
      status: "New",
      category: "Aircrew",
      summary: "Medical/licensing changes require immediate attention.",
    };
  }

  if (text.includes("fuel") || text.includes("ops")) {
    return {
      impact: "Medium",
      confidence: "79%",
      mapped_section: "Operations SOP 4.2",
      status: "Analyzed",
      category: "Operations",
      summary: "Operational procedures need a check for updated reserves.",
    };
  }

  if (text.includes("training") || text.includes("syllabus")) {
    return {
      impact: "Low",
      confidence: "84%",
      mapped_section: "Training Manual 2.8.1",
      status: "Ready",
      category: "Training",
      summary: "Training documentation should reflect updated syllabus details.",
    };
  }

  return DEFAULT_RESULT;
}

async function aiAnalysis(
  title: string,
  summary: string,
): Promise<AnalysisResult> {
  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAiKey) {
    return heuristicAnalysis(title, summary);
  }

  const prompt = `
You are a compliance assistant. Analyze this EASA RSS update and return JSON with
impact (High/Medium/Low), confidence (percentage string), mapped_section,
status (New/Analyzed/Ready), category, summary.
Update:
Title: ${title}
Summary: ${summary}
`.trim();

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    return heuristicAnalysis(title, summary);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content ?? "";

  try {
    const parsed = JSON.parse(content);
    return {
      impact: parsed.impact ?? DEFAULT_RESULT.impact,
      confidence: parsed.confidence ?? DEFAULT_RESULT.confidence,
      mapped_section: parsed.mapped_section ?? DEFAULT_RESULT.mapped_section,
      status: parsed.status ?? DEFAULT_RESULT.status,
      category: parsed.category ?? DEFAULT_RESULT.category,
      summary: parsed.summary ?? DEFAULT_RESULT.summary,
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
      JSON.stringify({
        ok: false,
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
      }),
      { status: 400 },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: rssItems, error } = await supabase
    .from("rss_items")
    .select(
      "id,title,summary,category,organization_id,source_id,published_at,ai_findings(id)",
    )
    .is("ai_findings.id", null)
    .order("published_at", { ascending: false })
    .limit(25);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
    });
  }

  const findingsPayload = [];

  for (const item of rssItems ?? []) {
    const analysis = await aiAnalysis(item.title, item.summary ?? "");
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
    }),
    { status: 200 },
  );
});
