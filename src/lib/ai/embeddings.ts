import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export const EMBEDDING_DIMENSIONS = 1536;
export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
export const MAX_EMBEDDING_INPUT_TOKENS = 5000;

type EmbeddingConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

export function normalizeEmbeddingInput(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export function estimateTokenCount(text: string) {
  const normalized = normalizeEmbeddingInput(text);
  return Math.max(1, Math.ceil(normalized.length / 4));
}

export function clampEmbeddingInput(text: string, maxTokens = MAX_EMBEDDING_INPUT_TOKENS) {
  const normalized = normalizeEmbeddingInput(text);
  if (!normalized) return "";
  if (estimateTokenCount(normalized) <= maxTokens) return normalized;

  const maxChars = maxTokens * 4;
  let trimmed = normalized.slice(0, maxChars);
  const lastWhitespace = trimmed.lastIndexOf(" ");
  if (lastWhitespace > maxChars * 0.8) {
    trimmed = trimmed.slice(0, lastWhitespace);
  }

  return trimmed.trim();
}

export function hashChunk(text: string) {
  return crypto.createHash("sha256").update(normalizeEmbeddingInput(text)).digest("hex");
}

function isOpenAiCompatibleKey(key: string) {
  // Anthropic keys ("sk-ant-…") must not be sent to OpenAI's embeddings endpoint.
  return key.length > 10 && key.startsWith("sk-") && !key.startsWith("sk-ant-");
}

async function loadEmbeddingConfig(
  admin: SupabaseClient,
  organizationId: string,
): Promise<EmbeddingConfig | null> {
  const { data: aiConfig } = await admin
    .from("ai_provider_config")
    .select("provider, api_key")
    .eq("organization_id", organizationId)
    .maybeSingle();

  const provider = String(aiConfig?.provider ?? "").toLowerCase();
  const dbApiKey = String(aiConfig?.api_key ?? "");

  if (provider === "openai" && dbApiKey && isOpenAiCompatibleKey(dbApiKey)) {
    return {
      apiKey: dbApiKey,
      baseUrl: "https://api.openai.com/v1",
      model: process.env.OPENAI_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL,
    };
  }

  const envKey = process.env.OPENAI_API_KEY ?? "";
  if (isOpenAiCompatibleKey(envKey)) {
    return {
      apiKey: envKey,
      baseUrl: "https://api.openai.com/v1",
      model: process.env.OPENAI_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL,
    };
  }

  return null;
}

export async function embedTexts(
  admin: SupabaseClient,
  organizationId: string,
  texts: string[],
): Promise<number[][] | null> {
  const config = await loadEmbeddingConfig(admin, organizationId);
  if (!config) return null;

  const inputs = texts.map((text) => clampEmbeddingInput(text)).filter(Boolean);
  if (inputs.length === 0) return [];

  const res = await fetch(`${config.baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      input: inputs,
      encoding_format: "float",
    }),
  });

  if (!res.ok) {
    console.warn(`Embedding request failed with status ${res.status}; falling back to non-embedding retrieval.`);
    return null;
  }

  const json = (await res.json()) as { data?: { embedding?: number[] }[] };
  return (json.data ?? []).map((row) => row.embedding ?? []);
}

export async function embedSingleText(
  admin: SupabaseClient,
  organizationId: string,
  text: string,
): Promise<number[] | null> {
  const vectors = await embedTexts(admin, organizationId, [text]);
  return vectors?.[0] ?? null;
}

type FlightbookSectionRow = {
  id: string;
  organization_id: string;
  section_number: string | null;
  title: string | null;
  body: string;
};

type DocumentSectionRow = {
  id: string;
  organization_id: string | null;
  section_number: string | null;
  title: string | null;
  body: string;
  metadata?: Record<string, unknown> | null;
};

type RssItemRow = {
  id: string;
  organization_id: string | null;
  title: string | null;
  summary: string | null;
  category: string | null;
};

export async function enrichRssItemEmbeddings(
  admin: SupabaseClient,
  rows: RssItemRow[],
) {
  if (rows.length === 0) return;
  const organizationId = rows.find((r) => r.organization_id)?.organization_id;
  if (!organizationId) return;

  const texts = rows.map((row) =>
    [row.title, row.category, row.summary].filter(Boolean).join("\n"),
  );

  const embeddings = await embedTexts(admin, organizationId, texts);
  if (!embeddings || embeddings.length === 0) return;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const embedding = embeddings[i];
    if (!embedding?.length) continue;
    await admin.from("rss_items").update({ embedding }).eq("id", row.id);
  }
}

export async function enrichFlightbookSectionEmbeddings(
  admin: SupabaseClient,
  rows: FlightbookSectionRow[],
) {
  if (rows.length === 0) return;
  const organizationId = rows[0].organization_id;
  const texts = rows.map((row) =>
    [row.section_number, row.title, row.body].filter(Boolean).join("\n"),
  );

  const embeddings = await embedTexts(admin, organizationId, texts);
  if (!embeddings || embeddings.length === 0) return;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const embedding = embeddings[i];
    if (!embedding?.length) continue;

    await admin
      .from("flightbook_sections")
      .update({
        embedding,
        token_count: estimateTokenCount(texts[i]),
        chunk_hash: hashChunk(texts[i]),
        metadata: {
          section_number: row.section_number,
          title: row.title,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
  }
}

export async function enrichDocumentSectionEmbeddings(
  admin: SupabaseClient,
  rows: DocumentSectionRow[],
) {
  if (rows.length === 0) return;
  const organizationId = rows[0].organization_id;
  if (!organizationId) return;

  const texts = rows.map((row) =>
    [row.section_number, row.title, row.body].filter(Boolean).join("\n"),
  );

  const embeddings = await embedTexts(admin, organizationId, texts);
  if (!embeddings || embeddings.length === 0) return;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const embedding = embeddings[i];
    if (!embedding?.length) continue;

    await admin
      .from("document_sections")
      .update({
        embedding,
        token_count: estimateTokenCount(texts[i]),
        chunk_hash: hashChunk(texts[i]),
        metadata: row.metadata ?? {},
      })
      .eq("id", row.id);
  }
}
