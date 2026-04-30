import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export const EMBEDDING_DIMENSIONS = 1536;
export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

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

export function hashChunk(text: string) {
  return crypto.createHash("sha256").update(normalizeEmbeddingInput(text)).digest("hex");
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

  if (provider === "openai" && dbApiKey) {
    return {
      apiKey: dbApiKey,
      baseUrl: "https://api.openai.com/v1",
      model: process.env.OPENAI_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL,
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      apiKey: process.env.OPENAI_API_KEY,
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

  const inputs = texts.map(normalizeEmbeddingInput).filter(Boolean);
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
    throw new Error(`Embedding request failed with status ${res.status}`);
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
