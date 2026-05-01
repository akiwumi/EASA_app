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

const DEFAULT_ORG_ID = "00000000-0000-4000-8000-000000000001";

type AiConfigRow = {
  provider: string | null;
  model: string | null;
  api_key: string | null;
};

type FindingRow = {
  id: string;
  impact: string | null;
  confidence: string | null;
  mapped_section: string | null;
  summary: string | null;
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

type ProposalSourceRow = {
  id: string;
  organization_id: string;
  ai_finding_id: string | null;
  ai_findings:
    | FindingRow
    | FindingRow[]
    | null;
};

function isMissingSchemaError(error: { code?: string | null; message?: string | null }) {
  return (
    error.code === "PGRST205" ||
    /could not find the table/i.test(error.message ?? "") ||
    /relation .* does not exist/i.test(error.message ?? "")
  );
}

function isMissingColumnError(
  error: { code?: string | null; message?: string | null } | null | undefined,
  columnName: string,
) {
  return new RegExp(`column .*${columnName}.* does not exist`, "i").test(error?.message ?? "");
}

type ProposedUpdateInsertInput = {
  organization_id: string;
  reg_change_id?: string | null;
  flightbook_section_id?: string | null;
  classification: string;
  risk_level: string;
  ai_rationale: string | null;
  ai_suggested_text?: string | null;
  confidence_score: number | null;
  status: string;
  auto_approve_at?: string | null;
  ai_model: string;
  ai_generated_at: string;
};

export async function insertProposedUpdateWithFallback(
  admin: SupabaseClient,
  row: ProposedUpdateInsertInput,
) {
  const attempt = await admin.from("proposed_updates").insert(row).select("id").single();
  if (!attempt.error || !isMissingColumnError(attempt.error, "reg_change_id")) {
    return attempt;
  }

  const { reg_change_id: _regChangeId, ...fallbackRow } = row;
  return admin.from("proposed_updates").insert(fallbackRow).select("id").single();
}

export async function findLatestQueuedProposal(
  admin: SupabaseClient,
  organizationId: string,
  options: { regChangeId?: string | null; rationale?: string | null },
): Promise<
  | { data: { id: string } | null; usedFallback: boolean; error?: undefined }
  | { data?: undefined; usedFallback?: undefined; error: { message: string } }
> {
  if (options.regChangeId) {
    const byRegChange = await admin
      .from("proposed_updates")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("reg_change_id", options.regChangeId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!byRegChange.error) {
      if (byRegChange.data) return { data: byRegChange.data, usedFallback: false };
    } else if (!isMissingColumnError(byRegChange.error, "reg_change_id")) {
        return { error: { message: byRegChange.error.message } };
    }
  }

  if (!options.rationale) {
    return { data: null, usedFallback: true };
  }

  const byRationale = await admin
    .from("proposed_updates")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("ai_rationale", options.rationale)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (byRationale.error) return { error: { message: byRationale.error.message } };
  return { data: byRationale.data, usedFallback: true };
}

export function parseConfidence(str: string | null): number | null {
  if (!str) return null;
  const n = parseFloat(str.replace("%", ""));
  return Number.isNaN(n) ? null : n;
}

export function mapRiskLevel(impact: string | null): "high" | "medium" | "low" {
  const value = (impact ?? "").toLowerCase();
  if (value === "high") return "high";
  if (value === "low") return "low";
  return "medium";
}

function mapClassification(impact: string | null): "mandatory" | "recommended" | "watchlist" {
  const value = (impact ?? "").toLowerCase();
  if (value === "high") return "mandatory";
  if (value === "medium") return "recommended";
  return "watchlist";
}

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

function openAiTokenParam(model: string, tokens: number): Record<string, number> {
  // o1 / o3 / o4 reasoning models use max_completion_tokens; everything else uses max_tokens.
  return /^o\d/i.test(model) ? { max_completion_tokens: tokens } : { max_tokens: tokens };
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
      ...openAiTokenParam(model, 2048),
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
  const text = json.content?.find((b) => b.type === "text")?.text ?? null;
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
  const provider = (row?.provider ?? "anthropic").toLowerCase();
  const model = row?.model ?? "claude-sonnet-4-20250514";

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

export async function ensureQueuedUpdatesForOrg(
  admin: SupabaseClient,
  organizationId: string,
) {
  const { data: schedule } = await admin
    .from("schedules")
    .select("auto_approve_low, auto_approve_delay_hours")
    .eq("organization_id", organizationId)
    .maybeSingle();

  const { data: regChanges, error: regChangesError } = await admin
    .from("reg_changes")
    .select(`
      id,
      organization_id,
      ai_finding_id,
      ai_findings (
        id,
        impact,
        confidence,
        mapped_section,
        summary,
        organization_id,
        category,
        rss_items ( title, summary, link, published_at, category )
      )
    `)
    .eq("organization_id", organizationId)
    .not("ai_finding_id", "is", null)
    .order("detected_at", { ascending: false })
    .limit(200);

  if (regChangesError) {
    if (isMissingSchemaError(regChangesError)) {
      return {
        ok: false as const,
        error:
          "The regulation change tables are not set up yet. Run the Supabase schema migrations before generating AI drafts.",
      };
    }
    return { ok: false as const, error: regChangesError.message };
  }

  let existingUpdates:
    | {
        id: string;
        reg_change_id: string | null;
        ai_rationale: string | null;
      }[]
    | null = null;

  const existingWithRegChange = await admin
    .from("proposed_updates")
    .select("id, reg_change_id, ai_rationale")
    .eq("organization_id", organizationId);

  const existingError = existingWithRegChange.error;
  if (!existingError) {
    existingUpdates = (existingWithRegChange.data ?? []) as {
      id: string;
      reg_change_id: string | null;
      ai_rationale: string | null;
    }[];
  } else if (isMissingColumnError(existingError, "reg_change_id")) {
    const fallbackExisting = await admin
      .from("proposed_updates")
      .select("id, ai_rationale")
      .eq("organization_id", organizationId);

    if (fallbackExisting.error) {
      return { ok: false as const, error: fallbackExisting.error.message };
    }

    existingUpdates = (fallbackExisting.data ?? []).map((row) => ({
      id: String(row.id),
      reg_change_id: null,
      ai_rationale: (row.ai_rationale as string | null) ?? null,
    }));
  }

  if (existingError) {
    if (!isMissingColumnError(existingError, "reg_change_id")) {
      return { ok: false as const, error: existingError.message };
    }
  }

  const existingByRegChangeId = new Map<string, { id: string; ai_rationale: string | null }>();
  const existingByRationale = new Map<string, { id: string; reg_change_id: string | null }>();

  for (const row of existingUpdates ?? []) {
    if (row.reg_change_id) {
      existingByRegChangeId.set(String(row.reg_change_id), {
        id: String(row.id),
        ai_rationale: (row.ai_rationale as string | null) ?? null,
      });
    }
    if (row.ai_rationale) {
      existingByRationale.set(String(row.ai_rationale), {
        id: String(row.id),
        reg_change_id: (row.reg_change_id as string | null) ?? null,
      });
    }
  }

  const rowsToInsert: Record<string, unknown>[] = [];
  let linkedExisting = 0;

  for (const row of (regChanges ?? []) as ProposalSourceRow[]) {
    const regChangeId = String(row.id);
    const finding = unwrapMaybeArray(row.ai_findings);
    if (!finding) continue;

    if (existingByRegChangeId.has(regChangeId)) continue;

    const rationale = finding.summary ?? "";
    const matchingExisting = rationale ? existingByRationale.get(rationale) : null;
    if (matchingExisting?.id && !matchingExisting.reg_change_id) {
      const updateResult = await admin
        .from("proposed_updates")
        .update({
          reg_change_id: regChangeId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", matchingExisting.id);

      if (!updateResult.error || isMissingColumnError(updateResult.error, "reg_change_id")) {
        linkedExisting += 1;
      } else {
        return { ok: false as const, error: updateResult.error.message };
      }
      continue;
    }

    const riskLevel = mapRiskLevel(finding.impact);
    const autoApproveAt =
      riskLevel === "low" && schedule?.auto_approve_low
        ? new Date(
            Date.now() + Number(schedule.auto_approve_delay_hours ?? 24) * 60 * 60 * 1000,
          ).toISOString()
        : null;

    rowsToInsert.push({
      organization_id: organizationId,
      reg_change_id: regChangeId,
      classification: mapClassification(finding.impact),
      risk_level: riskLevel,
      ai_rationale: finding.summary,
      confidence_score: parseConfidence(finding.confidence),
      status: "pending",
      auto_approve_at: autoApproveAt,
      ai_model: "pipeline-auto-queue",
      ai_generated_at: new Date().toISOString(),
    });
  }

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await admin.from("proposed_updates").insert(rowsToInsert);
    if (insertError) {
      if (!isMissingColumnError(insertError, "reg_change_id")) {
        return { ok: false as const, error: insertError.message };
      }

      const fallbackRows = rowsToInsert.map(({ reg_change_id: _regChangeId, ...row }) => row);
      const { error: fallbackInsertError } = await admin.from("proposed_updates").insert(fallbackRows);
      if (fallbackInsertError) {
        return { ok: false as const, error: fallbackInsertError.message };
      }
    }
  }

  return {
    ok: true as const,
    created: rowsToInsert.length,
    linkedExisting,
  };
}

export async function generateDraftForProposedUpdate(
  admin: SupabaseClient,
  proposedUpdateId: string,
  notes?: string[],
  flightbookId?: string | null,
) {
  let proposedUpdate:
    | {
        id: string;
        organization_id: string | null;
        reg_change_id: string | null;
        ai_rationale: string | null;
      }
    | null = null;

  const proposedUpdateWithRegChange = await admin
    .from("proposed_updates")
    .select("id, organization_id, reg_change_id, ai_rationale")
    .eq("id", proposedUpdateId)
    .maybeSingle();

  const proposedUpdateError = proposedUpdateWithRegChange.error;
  if (!proposedUpdateError) {
    proposedUpdate = proposedUpdateWithRegChange.data as {
      id: string;
      organization_id: string | null;
      reg_change_id: string | null;
      ai_rationale: string | null;
    } | null;
  } else if (isMissingColumnError(proposedUpdateError, "reg_change_id")) {
    const fallbackProposal = await admin
      .from("proposed_updates")
      .select("id, organization_id, ai_rationale")
      .eq("id", proposedUpdateId)
      .maybeSingle();

    if (fallbackProposal.error) {
      return { ok: false as const, error: fallbackProposal.error.message };
    }

    proposedUpdate = fallbackProposal.data
      ? {
          id: String(fallbackProposal.data.id),
          organization_id: (fallbackProposal.data.organization_id as string | null) ?? null,
          reg_change_id: null,
          ai_rationale: (fallbackProposal.data.ai_rationale as string | null) ?? null,
        }
      : null;
  }

  if (proposedUpdateError && !isMissingColumnError(proposedUpdateError, "reg_change_id")) {
    return { ok: false as const, error: proposedUpdateError.message };
  }
  if (!proposedUpdate) return { ok: false as const, error: "Proposed update not found." };

  const orgId = (proposedUpdate.organization_id as string | null) ?? DEFAULT_ORG_ID;
  let finding: FindingRow | null = null;

  if (proposedUpdate.reg_change_id) {
    const { data, error } = await admin
      .from("reg_changes")
      .select(`
        id,
        ai_finding_id,
        ai_findings (
          id,
          impact,
          confidence,
          mapped_section,
          summary,
          organization_id,
          category,
          rss_items ( title, summary, link, published_at, category )
        )
      `)
      .eq("id", String(proposedUpdate.reg_change_id))
      .maybeSingle();

    if (error && !isMissingSchemaError(error)) {
      return { ok: false as const, error: error.message };
    }

    const regChange = unwrapMaybeArray(
      data as
        | {
            id: string;
            ai_finding_id: string | null;
            ai_findings: FindingRow | FindingRow[] | null;
          }
        | {
            id: string;
            ai_finding_id: string | null;
            ai_findings: FindingRow | FindingRow[] | null;
          }[]
        | null,
    );
    finding = unwrapMaybeArray(regChange?.ai_findings);
  }

  if (!finding && proposedUpdate.ai_rationale) {
    const { data: fallbackFinding, error: fallbackFindingError } = await admin
      .from("ai_findings")
      .select(`
        id,
        impact,
        confidence,
        mapped_section,
        summary,
        organization_id,
        category,
        rss_items ( title, summary, link, published_at, category )
      `)
      .eq("organization_id", orgId)
      .eq("summary", String(proposedUpdate.ai_rationale))
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fallbackFindingError) {
      return { ok: false as const, error: fallbackFindingError.message };
    }
    finding = (fallbackFinding as FindingRow | null) ?? null;
  }

  if (!finding) {
    return { ok: false as const, error: "No linked finding was found for this proposed update." };
  }

  const { error: refreshLinkError } = await admin
    .from("proposed_updates")
    .update({
      ai_rationale: finding.summary ?? proposedUpdate.ai_rationale ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", proposedUpdateId);

  if (refreshLinkError && !isMissingSchemaError(refreshLinkError)) {
    return { ok: false as const, error: refreshLinkError.message };
  }

  const aiConfig = await loadAiConfig(admin, orgId);
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
      flightbookId: flightbookId ?? null,
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
    notes,
  });

  let aiText: string;
  try {
    aiText = await callAI(aiConfig.provider, aiConfig.model, aiConfig.apiKey, prompt);
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "AI provider did not return a response." };
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

  const { error: updateError } = await admin
    .from("proposed_updates")
    .update({
      ai_suggested_text: parsedDraft.suggestedText,
      ai_rationale: parsedDraft.changeSummary || finding.summary || null,
      flightbook_section_id: primaryFlightbook.id,
      retrieval_context: retrievalContext,
      generation_prompt_version: GENERATION_PROMPT_VERSION,
      source_citations: sourceCitations,
      retrieved_at: new Date().toISOString(),
      ai_model: aiConfig.model,
      ai_generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", proposedUpdateId);

  if (updateError) {
    return { ok: false as const, error: updateError.message };
  }

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
  };
}

export async function generateDraftsForOrg(
  admin: SupabaseClient,
  organizationId: string,
  limit = 20,
) {
  const pendingWithRegChange = await admin
    .from("proposed_updates")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .is("ai_suggested_text", null)
    .not("reg_change_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  let pendingUpdates = pendingWithRegChange.data ?? null;
  if (pendingWithRegChange.error) {
    if (!isMissingColumnError(pendingWithRegChange.error, "reg_change_id")) {
      return { ok: false as const, error: pendingWithRegChange.error.message };
    }

    const fallbackPending = await admin
      .from("proposed_updates")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("status", "pending")
      .is("ai_suggested_text", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (fallbackPending.error) {
      return { ok: false as const, error: fallbackPending.error.message };
    }
    pendingUpdates = fallbackPending.data ?? null;
  }

  let generated = 0;
  const errors: { id: string; error: string }[] = [];

  for (const row of pendingUpdates ?? []) {
    const result = await generateDraftForProposedUpdate(admin, String(row.id));
    if (result.ok) {
      generated += 1;
    } else {
      errors.push({ id: String(row.id), error: result.error });
    }
  }

  return {
    ok: true as const,
    generated,
    attempted: (pendingUpdates ?? []).length,
    errors,
  };
}
