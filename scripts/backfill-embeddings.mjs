import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ORG_ID = process.env.ORG_ID ?? "00000000-0000-4000-8000-000000000001";
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";

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

function chunkHash(text) {
  return crypto.createHash("sha256").update(normalize(text)).digest("hex");
}

async function embedTexts(texts) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts.map(normalize),
      encoding_format: "float",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Embedding call failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  return (json.data ?? []).map((row) => row.embedding ?? []);
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
  const embeddings = await embedTexts(texts);

  for (let i = 0; i < rows.length; i += 1) {
    await admin
      .from("flightbook_sections")
      .update({
        embedding: embeddings[i],
        token_count: tokenCount(texts[i]),
        chunk_hash: chunkHash(texts[i]),
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
  const embeddings = await embedTexts(texts);

  for (let i = 0; i < rows.length; i += 1) {
    await admin
      .from("document_sections")
      .update({
        embedding: embeddings[i],
        token_count: tokenCount(texts[i]),
        chunk_hash: chunkHash(texts[i]),
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
