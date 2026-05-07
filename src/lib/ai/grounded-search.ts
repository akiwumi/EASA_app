import type { SupabaseClient } from "@supabase/supabase-js";

type AiConfigRow = {
  provider: string | null;
  model: string | null;
  api_key: string | null;
};

export type GroundedSearchSource = {
  kind: "manual" | "approved_update";
  label: string;
  href: string;
  excerpt: string;
  secondaryLabel?: string | null;
};

function compactWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

async function extractProviderError(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as Record<string, unknown>;
    const msg =
      (json?.error as { message?: string } | null)?.message ??
      (json?.error as string | null) ??
      (json?.message as string | null) ??
      null;
    if (msg) return `${res.status}: ${msg}`;
  } catch {
    // fall through
  }
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
      ...openAiTokenParam(model, 700, baseUrl),
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
    body: JSON.stringify({ model, max_tokens: 700, messages: [{ role: "user", content: prompt }] }),
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
      generationConfig: { maxOutputTokens: 700 },
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

function buildPrompt(query: string, sources: GroundedSearchSource[]) {
  const sourceBlock = sources
    .map((source, index) => {
      const label = source.secondaryLabel ? `${source.label} | ${source.secondaryLabel}` : source.label;
      return [
        `[${index + 1}] ${source.kind === "manual" ? "Manual" : "Approved update"}: ${label}`,
        `Link: ${source.href}`,
        `Excerpt: ${compactWhitespace(source.excerpt).slice(0, 900)}`,
      ].join("\n");
    })
    .join("\n\n");

  return [
    "You are answering a search question for a flight school compliance app.",
    "Use only the supplied excerpts. Do not invent or assume facts.",
    "If the excerpts are insufficient, say so plainly.",
    "Keep the answer under 180 words and include source numbers like [1] or [2] inline.",
    "",
    `Question: ${query}`,
    "",
    "Sources:",
    sourceBlock,
  ].join("\n");
}

export async function generateGroundedSearchAnswer(
  admin: SupabaseClient,
  organizationId: string,
  query: string,
  sources: GroundedSearchSource[],
): Promise<
  | {
      answer: string;
      provider: string;
      warning?: undefined;
    }
  | {
      answer: null;
      provider: null;
      warning: string;
    }
> {
  if (!sources.length) {
    return {
      answer: null,
      provider: null,
      warning: "No stored sources matched this query yet.",
    };
  }

  const aiConfig = await loadAiConfig(admin, organizationId);
  if (!aiConfig) {
    return {
      answer: null,
      provider: null,
      warning: "Grounded AI answer is unavailable until an AI provider is configured in Admin → AI settings.",
    };
  }

  try {
    const answer = await callAI(aiConfig.provider, aiConfig.model, aiConfig.apiKey, buildPrompt(query, sources));
    return {
      answer: compactWhitespace(answer),
      provider: aiConfig.provider,
    };
  } catch (error) {
    return {
      answer: null,
      provider: null,
      warning: error instanceof Error ? error.message : "AI provider did not return a grounded answer.",
    };
  }
}
