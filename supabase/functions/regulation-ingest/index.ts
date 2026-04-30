import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type SourceRow = {
  id: string;
  url: string;
  organization_id: string | null;
};

type Chunk = {
  sectionNumber: string | null;
  title: string | null;
  body: string;
  sortOrder: number;
};

const SOURCE_FILES_BUCKET = "easa-source-files";

function cleanHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<\/(p|div|section|article|li|h1|h2|h3|h4|h5|h6|br|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function extractHtmlTitle(html: string) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch?.[1]) return cleanHtml(titleMatch[1]).slice(0, 200);
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match?.[1]) return cleanHtml(h1Match[1]).slice(0, 200);
  return "EASA Regulation Source";
}

function inferPart(url: string, title: string) {
  const haystack = `${url} ${title}`.toLowerCase();
  const entries: [string, string][] = [
    ["part-fcl", "Part-FCL"],
    ["part-med", "Part-MED"],
    ["part-ora", "Part-ORA"],
    ["part-dto", "Part-DTO"],
    ["part-oro", "Part-ORO"],
    ["part-cat", "Part-CAT"],
    ["part-ncc", "Part-NCC"],
    ["part-nco", "Part-NCO"],
    ["part-spa", "Part-SPA"],
    ["part-aro", "Part-ARO"],
    ["part-145", "Part-145"],
    ["part-m", "Part-M"],
  ];
  for (const [needle, label] of entries) {
    if (haystack.includes(needle)) return label;
  }
  return "General";
}

function estimateTokenCount(text: string) {
  return Math.max(1, Math.ceil(text.replace(/\s+/g, " ").trim().length / 4));
}

function toHexDigest(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function isEasaSourceUrl(url: string) {
  try {
    return new URL(url).hostname.endsWith("easa.europa.eu");
  } catch {
    return false;
  }
}

function detectStoredExtension(contentType: string | null, url: string) {
  const normalized = (contentType ?? "").toLowerCase();
  if (normalized.includes("pdf")) return "pdf";
  if (normalized.includes("xml")) return "xml";
  if (normalized.includes("plain")) return "txt";

  const pathname = (() => {
    try {
      return new URL(url).pathname.toLowerCase();
    } catch {
      return "";
    }
  })();

  if (pathname.endsWith(".pdf")) return "pdf";
  if (pathname.endsWith(".xml")) return "xml";
  if (pathname.endsWith(".txt")) return "txt";
  return "html";
}

function normalizeContentType(contentType: string | null) {
  return (contentType ?? "text/html").split(";")[0].trim().toLowerCase();
}

async function storeSourceArtifact(input: {
  supabase: ReturnType<typeof createClient>;
  source: SourceRow;
  contentHash: string;
  bytes: ArrayBuffer;
  contentType: string | null;
}) {
  if (!input.source.organization_id) return null;
  if (!isEasaSourceUrl(input.source.url)) return null;

  const extension = detectStoredExtension(input.contentType, input.source.url);
  const normalizedContentType = normalizeContentType(input.contentType);
  const objectPath =
    `${input.source.organization_id}/${input.source.id}/${contentHash}.${extension}`;

  const { error } = await input.supabase.storage
    .from(SOURCE_FILES_BUCKET)
    .upload(objectPath, new Uint8Array(input.bytes), {
      contentType: normalizedContentType,
      upsert: true,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  return {
    bucket: SOURCE_FILES_BUCKET,
    path: objectPath,
    mimeType: normalizedContentType,
    bytes: input.bytes.byteLength,
  };
}

function detectChunks(text: string) {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  const sectionRe = /^((\d{1,3})(\.\d{1,3}){0,5})\s{1,4}(.{2,160})$/;
  const headingRe = /^(Part|Section|Chapter|Appendix|Annex)\s+([A-Z0-9-]+)?[\s:–—-]+(.{2,160})$/i;

  const chunks: Chunk[] = [];
  let current: { sectionNumber: string | null; title: string | null; lines: string[] } | null = null;
  let order = 0;

  const pushCurrent = () => {
    if (!current) return;
    const body = current.lines.join("\n").trim();
    if (body.length < 40 && !current.title) return;
    chunks.push({
      sectionNumber: current.sectionNumber,
      title: current.title,
      body: body || "(empty)",
      sortOrder: order += 10,
    });
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (current) current.lines.push("");
      continue;
    }

    const numbered = line.match(sectionRe);
    const heading = !numbered ? line.match(headingRe) : null;

    if (numbered) {
      pushCurrent();
      current = { sectionNumber: numbered[1], title: numbered[4].trim(), lines: [] };
      continue;
    }

    if (heading) {
      pushCurrent();
      current = {
        sectionNumber: heading[2]?.trim() || null,
        title: `${heading[1]} ${heading[3]}`.trim(),
        lines: [],
      };
      continue;
    }

    if (!current) {
      current = { sectionNumber: null, title: "Preamble", lines: [line] };
    } else {
      current.lines.push(line);
    }
  }

  pushCurrent();

  if (chunks.length === 0) {
    return normalized
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 80)
      .map((paragraph, index) => ({
        sectionNumber: null,
        title: paragraph.split("\n")[0].slice(0, 120),
        body: paragraph,
        sortOrder: (index + 1) * 10,
      }));
  }

  const refined: Chunk[] = [];
  for (const chunk of chunks) {
    if (estimateTokenCount(chunk.body) <= 800) {
      refined.push(chunk);
      continue;
    }

    const paragraphs = chunk.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    let buffer = "";
    let partIndex = 1;

    for (const paragraph of paragraphs) {
      const candidate = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
      if (estimateTokenCount(candidate) > 800 && buffer) {
        refined.push({
          sectionNumber: chunk.sectionNumber,
          title: chunk.title ? `${chunk.title} (Part ${partIndex})` : `Part ${partIndex}`,
          body: buffer,
          sortOrder: chunk.sortOrder + partIndex - 1,
        });
        buffer = paragraph;
        partIndex += 1;
      } else {
        buffer = candidate;
      }
    }

    if (buffer) {
      refined.push({
        sectionNumber: chunk.sectionNumber,
        title: chunk.title ? `${chunk.title} (Part ${partIndex})` : `Part ${partIndex}`,
        body: buffer,
        sortOrder: chunk.sortOrder + partIndex - 1,
      });
    }
  }

  return refined;
}

async function loadEmbeddingConfig(supabase: ReturnType<typeof createClient>, organizationId: string | null) {
  if (!organizationId) return null;

  const { data: aiConfig } = await supabase
    .from("ai_provider_config")
    .select("provider, api_key")
    .eq("organization_id", organizationId)
    .maybeSingle();

  const provider = String(aiConfig?.provider ?? "").toLowerCase();
  const apiKey = String(aiConfig?.api_key ?? "");

  if (provider === "openai" && apiKey) {
    return {
      apiKey,
      model: Deno.env.get("OPENAI_EMBEDDING_MODEL") ?? "text-embedding-3-small",
    };
  }

  const envApiKey = Deno.env.get("OPENAI_API_KEY");
  if (envApiKey) {
    return {
      apiKey: envApiKey,
      model: Deno.env.get("OPENAI_EMBEDDING_MODEL") ?? "text-embedding-3-small",
    };
  }

  return null;
}

async function embedTexts(
  supabase: ReturnType<typeof createClient>,
  organizationId: string | null,
  texts: string[],
) {
  const config = await loadEmbeddingConfig(supabase, organizationId);
  if (!config || texts.length === 0) return null;

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      input: texts,
      encoding_format: "float",
    }),
  });

  if (!res.ok) return null;
  const json = await res.json() as { data?: { embedding?: number[] }[] };
  return (json.data ?? []).map((row) => row.embedding ?? []);
}

async function upsertRegDocument(
  supabase: ReturnType<typeof createClient>,
  source: SourceRow,
  title: string,
  part: string,
) {
  const { data: existing } = await supabase
    .from("reg_documents")
    .select("id")
    .eq("source_id", source.id)
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  const { data: created, error } = await supabase
    .from("reg_documents")
    .insert({
      organization_id: source.organization_id,
      source_id: source.id,
      title,
      part,
      url: source.url,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return created.id as string;
}

serve(async (request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({
      ok: false,
      error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
    }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const payload = await request.json().catch(() => ({}));
  const organizationId =
    typeof payload?.organizationId === "string" && payload.organizationId
      ? payload.organizationId
      : null;

  let sourcesQuery = supabase
    .from("sources")
    .select("id, url, organization_id")
    .eq("active", true)
    .eq("type", "html");

  if (organizationId) {
    sourcesQuery = sourcesQuery.eq("organization_id", organizationId);
  }

  const { data: sources, error: sourcesError } = await sourcesQuery;

  if (sourcesError) {
    return new Response(JSON.stringify({ ok: false, error: sourcesError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!sources || sources.length === 0) {
    return new Response(JSON.stringify({
      ok: true,
      processed: 0,
      snapshotsCreated: 0,
      sectionsCreated: 0,
      note: "No active HTML sources found.",
      results: [],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  const results: {
    source: string;
    status: string;
    snapshotCreated: boolean;
    sectionsCreated: number;
    error: string | null;
  }[] = [];

  let processed = 0;
  let snapshotsCreated = 0;
  let sectionsCreated = 0;
  let embeddedSections = 0;

  for (const source of sources as SourceRow[]) {
    try {
      processed += 1;
      const response = await fetch(source.url, {
        headers: { "User-Agent": "EASA-Regulation-Ingest/1.0" },
        signal: AbortSignal.timeout(20000),
      });

      if (!response.ok) {
        results.push({
          source: source.url,
          status: "fetch_error",
          snapshotCreated: false,
          sectionsCreated: 0,
          error: `HTTP ${response.status}`,
        });
        continue;
      }

      const responseBytes = await response.arrayBuffer();
      const html = new TextDecoder().decode(responseBytes);
      const contentHash = toHexDigest(
        await crypto.subtle.digest("SHA-256", responseBytes),
      );
      const contentType = response.headers.get("content-type");

      const title = extractHtmlTitle(html);
      const part = inferPart(source.url, title);
      const extractedText = cleanHtml(html);
      const storedArtifact = await storeSourceArtifact({
        supabase,
        source,
        contentHash,
        bytes: responseBytes,
        contentType,
      });

      const { data: snapshotRow, error: snapshotError } = await supabase
        .from("source_snapshots")
        .upsert({
          source_id: source.id,
          content_hash: contentHash,
          original_url: source.url,
          raw_storage_path: storedArtifact?.path ?? null,
          storage_bucket: storedArtifact?.bucket ?? null,
          storage_mime_type: storedArtifact?.mimeType ?? null,
          storage_bytes: storedArtifact?.bytes ?? null,
          extracted_text: extractedText,
          status: "processed",
        }, { onConflict: "source_id,content_hash" })
        .select("id")
        .single();

      if (snapshotError || !snapshotRow?.id) {
        results.push({
          source: source.url,
          status: "snapshot_error",
          snapshotCreated: false,
          sectionsCreated: 0,
          error: snapshotError?.message ?? "Unable to create snapshot",
        });
        continue;
      }

      const snapshotId = snapshotRow.id as string;
      const { count: existingSectionsCount } = await supabase
        .from("document_sections")
        .select("*", { count: "exact", head: true })
        .eq("snapshot_id", snapshotId);

      if ((existingSectionsCount ?? 0) > 0) {
        results.push({
          source: source.url,
          status: "unchanged",
          snapshotCreated: false,
          sectionsCreated: 0,
          error: null,
        });
        continue;
      }

      snapshotsCreated += 1;

      const regDocumentId = await upsertRegDocument(supabase, source, title, part);
      const chunks = detectChunks(extractedText);
      const rows = chunks.map((chunk) => ({
        snapshot_id: snapshotId,
        organization_id: source.organization_id,
        section_number: chunk.sectionNumber,
        title: chunk.title,
        body: chunk.body,
        sort_order: chunk.sortOrder,
        token_count: estimateTokenCount(chunk.body),
        chunk_hash: `${contentHash}:${chunk.sortOrder}`,
        metadata: {
          reg_document_id: regDocumentId,
          source_id: source.id,
          source_snapshot_id: snapshotId,
          part,
          section_number: chunk.sectionNumber,
          title: chunk.title,
          url: source.url,
          organization_id: source.organization_id,
        },
      }));

      const { data: insertedSections, error: insertSectionsError } = await supabase
        .from("document_sections")
        .insert(rows)
        .select("id, section_number, title, body");

      if (insertSectionsError) {
        results.push({
          source: source.url,
          status: "section_error",
          snapshotCreated: true,
          sectionsCreated: 0,
          error: insertSectionsError.message,
        });
        continue;
      }

      const sectionRows = insertedSections ?? [];
      sectionsCreated += sectionRows.length;

      try {
        const texts = sectionRows.map((row) => [row.section_number, row.title, row.body].filter(Boolean).join("\n"));
        const embeddings = await embedTexts(supabase, source.organization_id, texts);
        if (embeddings) {
          for (let i = 0; i < sectionRows.length; i += 1) {
            const embedding = embeddings[i];
            if (!embedding?.length) continue;
            await supabase
              .from("document_sections")
              .update({ embedding })
              .eq("id", sectionRows[i].id as string);
            embeddedSections += 1;
          }
        }
      } catch {
        // Ingestion still succeeds if embeddings are unavailable.
      }

      results.push({
        source: source.url,
        status: "processed",
        snapshotCreated: true,
        sectionsCreated: sectionRows.length,
        error: null,
      });
    } catch (error) {
      results.push({
        source: source.url,
        status: "error",
        snapshotCreated: false,
        sectionsCreated: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    processed,
    snapshotsCreated,
    sectionsCreated,
    embeddedSections,
    results,
  }), { status: 200, headers: { "Content-Type": "application/json" } });
});
