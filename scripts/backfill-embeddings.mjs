import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ORG_ID = process.env.ORG_ID ?? "00000000-0000-4000-8000-000000000001";
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
const MAX_EMBEDDING_INPUT_TOKENS = 5000;
const MIN_EMBEDDING_INPUT_CHARS = 4000;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY for embeddings.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function normalize(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

function tokenCount(text) {
  return Math.max(1, Math.ceil(normalize(text).length / 4));
}

function clampEmbeddingInput(text, maxTokens = MAX_EMBEDDING_INPUT_TOKENS) {
  const normalized = normalize(text);
  if (!normalized) return "";
  if (tokenCount(normalized) <= maxTokens) return normalized;

  const maxChars = maxTokens * 4;
  let trimmed = normalized.slice(0, maxChars);
  const lastWhitespace = trimmed.lastIndexOf(" ");
  if (lastWhitespace > maxChars * 0.8) {
    trimmed = trimmed.slice(0, lastWhitespace);
  }

  return trimmed.trim();
}

function shrinkEmbeddingInput(text) {
  const normalized = normalize(text);
  if (!normalized) return "";

  const nextLength = Math.max(MIN_EMBEDDING_INPUT_CHARS, Math.floor(normalized.length * 0.75));
  let trimmed = normalized.slice(0, nextLength);
  const lastWhitespace = trimmed.lastIndexOf(" ");
  if (lastWhitespace > nextLength * 0.8) {
    trimmed = trimmed.slice(0, lastWhitespace);
  }

  return trimmed.trim();
}

function extractOversizedInputIndex(errorText) {
  const match = errorText.match(/input\[(\d+)\]/i);
  if (!match) return null;
  return Number.parseInt(match[1], 10);
}

function chunkHash(text) {
  return crypto.createHash("sha256").update(normalize(text)).digest("hex");
}

async function embedTexts(texts) {
  const inputs = texts.map((text) => clampEmbeddingInput(text));

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: inputs,
        encoding_format: "float",
      }),
    });

    if (res.ok) {
      const json = await res.json();
      return {
        embeddings: (json.data ?? []).map((row) => row.embedding ?? []),
        inputs,
      };
    }

    const errorText = await res.text();
    const oversizedIndex = extractOversizedInputIndex(errorText);
    if (res.status === 400 && oversizedIndex !== null && inputs[oversizedIndex]) {
      const before = inputs[oversizedIndex];
      const after = shrinkEmbeddingInput(before);
      if (after && after.length < before.length) {
        console.warn(
          `Retrying embedding batch after shrinking input[${oversizedIndex}] from ${before.length} to ${after.length} chars.`,
        );
        inputs[oversizedIndex] = after;
        continue;
      }
    }

    throw new Error(`Embedding call failed: ${res.status} ${errorText}`);
  }

  throw new Error("Embedding call failed after repeated retries for oversized inputs.");
}

async function backfillFlightbookSections() {
  const { data: rows, error } = await admin
    .from("flightbook_sections")
    .select("id, section_number, title, body")
    .eq("organization_id", ORG_ID)
    .is("embedding", null)
    .limit(100);

  if (error) throw error;
  if (!rows || rows.length === 0) return 0;

  const texts = rows.map((row) => [row.section_number, row.title, row.body].filter(Boolean).join("\n"));
  const truncatedCount = texts.filter((text) => tokenCount(text) > MAX_EMBEDDING_INPUT_TOKENS).length;
  if (truncatedCount > 0) {
    console.warn(`Trimming ${truncatedCount} oversized flightbook section(s) before embedding.`);
  }
  const { embeddings, inputs } = await embedTexts(texts);

  for (let i = 0; i < rows.length; i += 1) {
    await admin
      .from("flightbook_sections")
      .update({
        embedding: embeddings[i],
        token_count: tokenCount(inputs[i]),
        chunk_hash: chunkHash(inputs[i]),
        updated_at: new Date().toISOString(),
      })
      .eq("id", rows[i].id);
  }

  return rows.length;
}

async function backfillDocumentSections() {
  const { data: rows, error } = await admin
    .from("document_sections")
    .select("id, section_number, title, body, metadata")
    .eq("organization_id", ORG_ID)
    .is("embedding", null)
    .limit(100);

  if (error) throw error;
  if (!rows || rows.length === 0) return 0;

  const texts = rows.map((row) => [row.section_number, row.title, row.body].filter(Boolean).join("\n"));
  const truncatedCount = texts.filter((text) => tokenCount(text) > MAX_EMBEDDING_INPUT_TOKENS).length;
  if (truncatedCount > 0) {
    console.warn(`Trimming ${truncatedCount} oversized document section(s) before embedding.`);
  }
  const { embeddings, inputs } = await embedTexts(texts);

  for (let i = 0; i < rows.length; i += 1) {
    await admin
      .from("document_sections")
      .update({
        embedding: embeddings[i],
        token_count: tokenCount(inputs[i]),
        chunk_hash: chunkHash(inputs[i]),
        metadata: rows[i].metadata ?? {},
      })
      .eq("id", rows[i].id);
  }

  return rows.length;
}

async function main() {
  const flightbookCount = await backfillFlightbookSections();
  const documentCount = await backfillDocumentSections();
  console.log(JSON.stringify({ ok: true, orgId: ORG_ID, flightbookCount, documentCount }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
