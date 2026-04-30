import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildRetrievalQuery,
  categoryToPart,
  retrieveFlightbookChunks,
  retrieveRegulationChunks,
  type RetrievedChunk,
} from "@/lib/ai/retrieval";
import {
  buildRevisionPrompt,
  extractGeneratedDraft,
  GENERATION_PROMPT_VERSION,
} from "@/lib/ai/rag-prompt";

const DEFAULT_ORG_ID = "00000000-0000-4000-8000-000000000001";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function callOpenAI(apiKey: string, model: string, baseUrl: string, prompt: string): Promise<string | null> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? null;
}

async function callAnthropic(apiKey: string, model: string, prompt: string): Promise<string | null> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, max_tokens: 2048, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { content?: { type: string; text: string }[] };
  return json.content?.find((b) => b.type === "text")?.text ?? null;
}

async function callGoogle(apiKey: string, model: string, prompt: string): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 2048 },
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

async function callAI(provider: string, model: string, apiKey: string, prompt: string): Promise<string | null> {
  if (provider === "openai") return callOpenAI(apiKey, model, "https://api.openai.com/v1", prompt);
  if (provider === "groq") return callOpenAI(apiKey, model, "https://api.groq.com/openai/v1", prompt);
  if (provider === "anthropic") return callAnthropic(apiKey, model, prompt);
  if (provider === "google") return callGoogle(apiKey, model, prompt);
  return null;
}

function makeFallbackDraft(
  primaryFlightbook: RetrievedChunk,
  regulationChunks: RetrievedChunk[],
  flightbookChunks: RetrievedChunk[],
  findingSummary: string,
) {
  const citations = [
    ...regulationChunks.slice(0, 3).map((chunk) => ({
      kind: "regulation_chunk",
      id: chunk.id,
      reason: "Retrieved as supporting regulation evidence",
    })),
    ...flightbookChunks.slice(0, 3).map((chunk) => ({
      kind: "flightbook_section",
      id: chunk.id,
      reason: "Retrieved as relevant flightbook context",
    })),
  ];

  return {
    suggestedText: primaryFlightbook.body,
    changeSummary: findingSummary || "Draft created from retrieved context.",
    whyThisSection: "Chosen because it was the strongest retrieved flightbook match.",
    confidence: regulationChunks.length > 0 ? "medium" : "low",
    citations,
  };
}

function compactCitation(chunk: RetrievedChunk) {
  return {
    kind: chunk.kind === "regulation" ? "regulation_chunk" : "flightbook_section",
    id: chunk.id,
    score: Number(chunk.score.toFixed(3)),
    section_number: chunk.sectionNumber,
    title: chunk.title,
    flightbook_name: chunk.flightbookName ?? null,
    quote: chunk.body.slice(0, 280),
  };
}

export async function POST(request: Request) {
  const { findingId, notes } = (await request.json()) as { findingId?: string; notes?: string[] };
  if (!findingId) return NextResponse.json({ error: "findingId required" }, { status: 400 });

  const admin = getAdminClient();

  const { data: finding } = await admin
    .from("ai_findings")
    .select(`id, impact, mapped_section, summary, organization_id, category,
      rss_items ( title, summary, link, published_at, category )`)
    .eq("id", findingId)
    .maybeSingle();

  if (!finding) return NextResponse.json({ error: "Finding not found" }, { status: 404 });

  const rss = Array.isArray(finding.rss_items) ? finding.rss_items[0] : finding.rss_items;
  const orgId: string = (finding.organization_id as string | null) ?? DEFAULT_ORG_ID;

  const { data: aiConfig } = await admin
    .from("ai_provider_config")
    .select("provider, model, api_key")
    .eq("organization_id", orgId)
    .maybeSingle();

  const provider: string = (aiConfig?.provider as string | null) ?? "anthropic";
  const model: string = (aiConfig?.model as string | null) ?? "claude-sonnet-4-20250514";
  const apiKey: string = (aiConfig?.api_key as string | null) ?? process.env.ANTHROPIC_API_KEY ?? "";

  if (!apiKey) {
    return NextResponse.json({ error: "No AI API key configured. Add one in Admin → AI settings." }, { status: 400 });
  }

  const updateTitle = (rss?.title as string | null) ?? "EASA Update";
  const updateSummary = (rss?.summary as string | null) ?? "";
  const findingSummary = (finding.summary as string | null) ?? "";
  const mappedSection = (finding.mapped_section as string | null) ?? "";
  const regPart = categoryToPart(
    ((finding.category as string | null) ?? (rss?.category as string | null) ?? null),
  );

  const retrievalQuery = buildRetrievalQuery({
    title: updateTitle,
    rssSummary: updateSummary,
    findingSummary,
    mappedSection,
    regPart,
  });

  const [regulationChunks, flightbookChunks] = await Promise.all([
    retrieveRegulationChunks(admin, {
      organizationId: orgId,
      queryText: retrievalQuery,
      regPart,
      limit: 5,
      minSimilarity: 0.2,
    }),
    retrieveFlightbookChunks(admin, {
      organizationId: orgId,
      queryText: retrievalQuery,
      regPart,
      limit: 5,
      minSimilarity: 0.2,
    }),
  ]);

  const primaryFlightbook = flightbookChunks[0];
  if (!primaryFlightbook) {
    return NextResponse.json(
      { error: "No flight book sections found. Upload a flight book first." },
      { status: 404 },
    );
  }

  const prompt = buildRevisionPrompt({
    updateTitle,
    updateSummary,
    findingSummary,
    regPart,
    primaryFlightbook,
    regulationChunks,
    flightbookChunks,
    notes,
  });

  const aiText = await callAI(provider, model, apiKey, prompt);
  if (!aiText) {
    return NextResponse.json({ error: "AI provider did not return a response." }, { status: 502 });
  }

  const parsedDraft =
    extractGeneratedDraft(aiText) ??
    makeFallbackDraft(primaryFlightbook, regulationChunks, flightbookChunks, findingSummary);

  const sourceCitations = [
    ...regulationChunks.map(compactCitation),
    ...flightbookChunks.map(compactCitation),
  ];

  const retrievalContext = {
    regPart,
    retrievalQuery,
    regulationChunkIds: regulationChunks.map((chunk) => chunk.id),
    flightbookChunkIds: flightbookChunks.map((chunk) => chunk.id),
    primaryFlightbookSectionId: primaryFlightbook.id,
  };

  await admin
    .from("proposed_updates")
    .update({
      ai_suggested_text: parsedDraft.suggestedText,
      ai_rationale:
        parsedDraft.changeSummary || (finding.summary as string | null) || null,
      flightbook_section_id: primaryFlightbook.id,
      retrieval_context: retrievalContext,
      generation_prompt_version: GENERATION_PROMPT_VERSION,
      source_citations: sourceCitations,
      retrieved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("ai_rationale", (finding.summary as string | null) ?? "")
    .eq("organization_id", orgId);

  return NextResponse.json({
    ok: true,
    suggestedText: parsedDraft.suggestedText,
    sectionId: primaryFlightbook.id,
    sectionTitle: primaryFlightbook.title,
    sectionNumber: primaryFlightbook.sectionNumber,
    flightbookName: primaryFlightbook.flightbookName ?? "Unknown",
    currentBody: primaryFlightbook.body,
    citations: sourceCitations,
    whyThisSection: parsedDraft.whyThisSection,
    changeSummary: parsedDraft.changeSummary,
    confidence: parsedDraft.confidence,
    regulationChunks: regulationChunks.map(compactCitation),
    flightbookChunks: flightbookChunks.map(compactCitation),
  });
}
