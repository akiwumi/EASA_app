import type { SupabaseClient } from "@supabase/supabase-js";
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

type AiConfigRow = {
  provider: string | null;
  model: string | null;
  api_key: string | null;
};

export type DraftPreviewFinding = {
  id: string;
  impact: string | null;
  confidence: string | null;
  mapped_section: string | null;
  summary: string | null;
  rss_item_id?: string | null;
  organization_id: string | null;
  category: string | null;
  rss_items:
    | {
        title: string | null;
        summary: string | null;
        link: string | null;
        published_at: string | null;
        category: string | null;
      }
    | {
        title: string | null;
        summary: string | null;
        link: string | null;
        published_at: string | null;
        category: string | null;
      }[]
    | null;
};

function unwrapMaybeArray<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function extractProviderError(res: Response): Promise<string> {
  try {
    const json = await res.json() as Record<string, unknown>;
    const msg =
      (json?.error as { message?: string } | null)?.message ??
      (json?.error as string | null) ??
      (json?.message as string | null) ??
      null;
    if (msg) return `${res.status}: ${msg}`;
  } catch { /* fall through */ }
  return `HTTP ${res.status} from AI provider`;
}

function openAiTokenParam(model: string, tokens: number, baseUrl: string): Record<string, number> {
  if (/api\.openai\.com/i.test(baseUrl) && (/^o\d/i.test(model) || /^gpt-5/i.test(model))) {
    return { max_completion_tokens: tokens };
  }
  return { max_tokens: tokens };
}

async function callOpenAI(
  apiKey: string,
  model: string,
  baseUrl: string,
  prompt: string,
): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      ...openAiTokenParam(model, 2048, baseUrl),
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(await extractProviderError(res));
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = json.choices?.[0]?.message?.content ?? null;
  if (!text) throw new Error("AI provider returned an empty response.");
  return text;
}

async function callAnthropic(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, max_tokens: 2048, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(await extractProviderError(res));
  const json = (await res.json()) as { content?: { type: string; text: string }[] };
  const text = json.content?.find((block) => block.type === "text")?.text ?? null;
  if (!text) throw new Error("AI provider returned an empty response.");
  return text;
}

async function callGoogle(apiKey: string, model: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 2048 },
    }),
  });
  if (!res.ok) throw new Error(await extractProviderError(res));
  const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  if (!text) throw new Error("AI provider returned an empty response.");
  return text;
}

async function callAI(provider: string, model: string, apiKey: string, prompt: string): Promise<string> {
  if (provider === "openai") return callOpenAI(apiKey, model, "https://api.openai.com/v1", prompt);
  if (provider === "groq") return callOpenAI(apiKey, model, "https://api.groq.com/openai/v1", prompt);
  if (provider === "anthropic") return callAnthropic(apiKey, model, prompt);
  if (provider === "google") return callGoogle(apiKey, model, prompt);
  throw new Error(`Unknown AI provider "${provider}". Check Admin → AI settings.`);
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

async function loadAiConfig(
  admin: SupabaseClient,
  organizationId: string,
): Promise<{ provider: string; model: string; apiKey: string } | null> {
  const { data } = await admin
    .from("ai_provider_config")
    .select("provider, model, api_key")
    .eq("organization_id", organizationId)
    .maybeSingle();

  const row = (data ?? null) as AiConfigRow | null;
  const provider = (row?.provider ?? "openai").toLowerCase();
  const model = row?.model ?? "gpt-4o";

  let apiKey = row?.api_key ?? "";
  if (!apiKey) {
    if (provider === "openai" || provider === "groq") {
      apiKey = process.env.OPENAI_API_KEY ?? "";
    } else if (provider === "google") {
      apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY ?? "";
    } else {
      apiKey = process.env.ANTHROPIC_API_KEY ?? "";
    }
  }

  return apiKey ? { provider, model, apiKey } : null;
}

export async function generateDraftPreview(
  admin: SupabaseClient,
  input: {
    organizationId: string;
    finding: DraftPreviewFinding;
    notes?: string[];
    flightbookId?: string | null;
  },
) {
  const { organizationId, finding } = input;
  const aiConfig = await loadAiConfig(admin, organizationId);
  if (!aiConfig) {
    return { ok: false as const, error: "No AI API key configured. Add one in Admin → AI settings." };
  }

  const rss = unwrapMaybeArray(finding.rss_items);
  const updateTitle = rss?.title ?? "EASA Update";
  const updateSummary = rss?.summary ?? "";
  const findingSummary = finding.summary ?? "";
  const mappedSection = finding.mapped_section ?? "";
  const regPart = categoryToPart(finding.category ?? rss?.category ?? null);
  const retrievalQuery = buildRetrievalQuery({
    title: updateTitle,
    rssSummary: updateSummary,
    findingSummary,
    mappedSection,
    regPart,
  });

  const [regulationChunks, flightbookChunks] = await Promise.all([
    retrieveRegulationChunks(admin, {
      organizationId,
      queryText: retrievalQuery,
      regPart,
      limit: 5,
      minSimilarity: 0.2,
    }),
    retrieveFlightbookChunks(admin, {
      organizationId,
      queryText: retrievalQuery,
      regPart,
      limit: 5,
      minSimilarity: 0.2,
      flightbookId: input.flightbookId || null,
    }),
  ]);

  const primaryFlightbook = flightbookChunks[0];
  if (!primaryFlightbook) {
    return { ok: false as const, error: "No flight book sections found. Upload a flight book first." };
  }

  const prompt = buildRevisionPrompt({
    updateTitle,
    updateSummary,
    findingSummary,
    regPart,
    primaryFlightbook,
    regulationChunks,
    flightbookChunks,
    notes: input.notes,
  });

  let aiText: string;
  try {
    aiText = await callAI(aiConfig.provider, aiConfig.model, aiConfig.apiKey, prompt);
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "AI provider did not return a response." };
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
  const now = new Date().toISOString();

  return {
    ok: true as const,
    data: {
      sectionId: primaryFlightbook.id,
      sectionTitle: primaryFlightbook.title,
      sectionNumber: primaryFlightbook.sectionNumber,
      flightbookName: primaryFlightbook.flightbookName ?? "Unknown",
      currentBody: primaryFlightbook.body,
      suggestedText: parsedDraft.suggestedText,
      citations: sourceCitations,
      whyThisSection: parsedDraft.whyThisSection,
      changeSummary: parsedDraft.changeSummary,
      confidence: parsedDraft.confidence,
      regulationChunks: regulationChunks.map(compactCitation),
      flightbookChunks: flightbookChunks.map(compactCitation),
    },
    draftUpdatePayload: {
      ai_suggested_text: parsedDraft.suggestedText,
      ai_rationale: parsedDraft.changeSummary || finding.summary || null,
      flightbook_section_id: primaryFlightbook.id,
      retrieval_context: retrievalContext,
      generation_prompt_version: GENERATION_PROMPT_VERSION,
      source_citations: sourceCitations,
      retrieved_at: now,
      ai_model: aiConfig.model,
      ai_generated_at: now,
      updated_at: now,
    },
  };
}

export async function generateDraftPreviewForFinding(
  admin: SupabaseClient,
  input: {
    organizationId: string;
    findingId: string;
    notes?: string[];
    flightbookId?: string | null;
  },
) {
  const { data, error } = await admin
    .from("ai_findings")
    .select(`
      id,
      impact,
      confidence,
      mapped_section,
      summary,
      rss_item_id,
      organization_id,
      category,
      rss_items ( title, summary, link, published_at, category )
    `)
    .eq("id", input.findingId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "Finding not found." };

  const preview = await generateDraftPreview(admin, {
    organizationId: input.organizationId,
    finding: data as DraftPreviewFinding,
    notes: input.notes,
    flightbookId: input.flightbookId,
  });

  if (!preview.ok) return preview;
  return { ok: true as const, data: preview.data };
}
