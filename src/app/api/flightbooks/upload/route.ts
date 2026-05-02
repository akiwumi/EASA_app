import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOrgAccessContext } from "@/lib/supabase/access";
import {
  embedTexts,
  estimateTokenCount,
  hashChunk,
} from "@/lib/ai/embeddings";

export const runtime = "nodejs";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

interface ParsedSection {
  sectionNumber: string | null;
  title: string | null;
  body: string;
  sortOrder: number;
}

function isMissingColumnError(error: { code?: string | null; message?: string | null }) {
  return error.code === "42703" || /column .* does not exist/i.test(error.message ?? "");
}

function chunkWholeDocument(text: string): ParsedSection[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return [];

  const sections: ParsedSection[] = [];
  const maxCharsPerChunk = 3500;
  let buffer = "";
  let chunkIndex = 1;

  for (const paragraph of paragraphs) {
    const candidate = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxCharsPerChunk && buffer) {
      sections.push({
        sectionNumber: null,
        title: `Document chunk ${chunkIndex}`,
        body: buffer,
        sortOrder: chunkIndex * 10,
      });
      buffer = paragraph;
      chunkIndex += 1;
    } else {
      buffer = candidate;
    }
  }

  if (buffer) {
    sections.push({
      sectionNumber: null,
      title: `Document chunk ${chunkIndex}`,
      body: buffer,
      sortOrder: chunkIndex * 10,
    });
  }

  return sections;
}

/** Detect section boundaries, but fall back to full-document chunking if heading parsing loses too much content. */
function detectSections(text: string): ParsedSection[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");

  const SECTION_RE = /^((\d{1,3})(\.\d{1,3}){0,4})\s{1,4}(.{2,140})$/;
  const HEADING_RE = /^(Chapter|Section|Part|Appendix|Annex)\s+[A-Z0-9.-]+[\s:–—-]+(.{2,140})$/i;
  const MARKDOWN_HEADING_RE = /^(#{1,6})\s+(.{2,140})$/;

  const sections: ParsedSection[] = [];
  let current: { number: string | null; title: string | null; lines: string[] } | null = null;
  let order = 0;

  function pushCurrent() {
    if (!current) return;
    const body = current.lines.join("\n").trim();
    if (body || current.title) {
      sections.push({
        sectionNumber: current.number,
        title: current.title,
        body: body || current.title || "(empty)",
        sortOrder: (order += 10),
      });
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (current) current.lines.push("");
      continue;
    }

    const secMatch = trimmed.match(SECTION_RE);
    const headMatch = !secMatch ? trimmed.match(HEADING_RE) : null;
    const markdownMatch = !secMatch && !headMatch ? trimmed.match(MARKDOWN_HEADING_RE) : null;

    if (secMatch || headMatch || markdownMatch) {
      pushCurrent();
      if (secMatch) {
        current = { number: secMatch[1], title: secMatch[4].trim(), lines: [] };
      } else if (headMatch) {
        current = { number: null, title: trimmed, lines: [] };
      } else {
        current = { number: null, title: markdownMatch?.[2].trim() ?? trimmed, lines: [] };
      }
      continue;
    }

    if (!current) {
      current = { number: null, title: "Preamble", lines: [line] };
    } else {
      current.lines.push(line);
    }
  }

  pushCurrent();

  const totalBodyChars = sections.reduce((sum, section) => sum + section.body.length, 0);
  const normalizedChars = normalized.trim().length;
  const bodyCoverage = normalizedChars > 0 ? totalBodyChars / normalizedChars : 0;
  const emptyOrHeadingOnly =
    sections.length > 0 &&
    sections.filter((section) => section.body.trim().length <= (section.title?.trim().length ?? 0) + 8).length /
      sections.length >
      0.4;

  if (sections.length === 0 || bodyCoverage < 0.6 || emptyOrHeadingOnly) {
    return chunkWholeDocument(normalized);
  }

  return sections;
}

/** Parse a JSON fixture file (sample-import.json format). */
function parseJsonFixture(json: unknown): { docName: string; docType: string; versionLabel: string | null; sections: ParsedSection[] }[] {
  const data = json as { documents?: { name?: string; docType?: string; versionLabel?: string; sections?: { sectionNumber?: string; title?: string; body?: string; sortOrder?: number }[] }[] };
  if (!data.documents) throw new Error("JSON must have a 'documents' array");
  return data.documents.map((doc) => ({
    docName: doc.name ?? "Untitled",
    docType: doc.docType ?? "Other",
    versionLabel: doc.versionLabel ?? null,
    sections: (doc.sections ?? []).map((s, i) => ({
      sectionNumber: s.sectionNumber ?? null,
      title: s.title ?? null,
      body: s.body ?? "",
      sortOrder: s.sortOrder ?? (i + 1) * 10,
    })),
  }));
}

export async function POST(request: Request) {
  const ctx = await getOrgAccessContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getAdminClient();
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const flightbookId = formData.get("flightbookId") as string | null;
  const docName = formData.get("docName") as string | null;
  const docType = (formData.get("docType") as string | null) ?? "Other";
  const versionLabel = formData.get("versionLabel") as string | null;
  const aircraft = formData.get("aircraft") as string | null;
  const manualGroup = formData.get("manualGroup") as string | null;
  const effectiveDate = formData.get("effectiveDate") as string | null;
  const importNotes = formData.get("importNotes") as string | null;
  const tags = ((formData.get("tags") as string | null) ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const orgId = ctx.orgId;
  const filename = file.name.toLowerCase();
  const bytes = Buffer.from(await file.arrayBuffer());

  let documents: { docName: string; docType: string; versionLabel: string | null; bookId?: string; sections: ParsedSection[] }[] = [];

  // ── JSON fixture ────────────────────────────────────────────────────────────
  if (filename.endsWith(".json")) {
    const json = JSON.parse(bytes.toString("utf8"));
    const parsed = parseJsonFixture(json);
    documents = parsed.map((d) => ({ ...d }));
  }

  // ── Plain text ──────────────────────────────────────────────────────────────
  else if (filename.endsWith(".txt") || filename.endsWith(".md")) {
    const text = bytes.toString("utf8");
    const sections = detectSections(text);
    documents = [{ docName: docName ?? file.name.replace(/\.[^.]+$/, ""), docType, versionLabel, sections }];
  }

  // ── PDF ─────────────────────────────────────────────────────────────────────
  else if (filename.endsWith(".pdf")) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
    const parsed = await pdfParse(bytes);
    const sections = detectSections(parsed.text);
    documents = [{ docName: docName ?? file.name.replace(/\.pdf$/i, ""), docType, versionLabel, sections }];
  }

  else {
    return NextResponse.json({ error: "Unsupported file type. Upload PDF, TXT, MD, or JSON." }, { status: 400 });
  }

  const results: { bookName: string; sectionsImported: number }[] = [];

  for (const doc of documents) {
    let bookId = doc.bookId ?? flightbookId;

    // Create flightbook record if not targeting an existing one
    if (!bookId) {
      const { data: book, error: bookErr } = await admin
        .from("flightbooks")
        .insert({
          organization_id: orgId,
          name: doc.docName,
          doc_type: doc.docType,
          version_label: doc.versionLabel,
          aircraft: aircraft?.trim() || null,
          manual_group: manualGroup?.trim() || null,
          effective_date: effectiveDate || null,
          import_notes: importNotes?.trim() || null,
          tags,
          active: true,
        })
        .select("id").single();
      if (bookErr && isMissingColumnError(bookErr)) {
        const fallbackBook = await admin
          .from("flightbooks")
          .insert({ organization_id: orgId, name: doc.docName, doc_type: doc.docType, version_label: doc.versionLabel, active: true })
          .select("id")
          .single();
        if (fallbackBook.error) return NextResponse.json({ error: fallbackBook.error.message }, { status: 400 });
        bookId = fallbackBook.data.id;
      } else if (bookErr) {
        return NextResponse.json({ error: bookErr.message }, { status: 400 });
      } else {
        bookId = book.id;
      }
    } else {
      // Clear existing sections so re-import is clean
      await admin.from("flightbook_sections").delete().eq("flightbook_id", bookId);
      const updateResult = await admin
        .from("flightbooks")
        .update({
          name: doc.docName,
          doc_type: doc.docType,
          version_label: doc.versionLabel,
          aircraft: aircraft?.trim() || null,
          manual_group: manualGroup?.trim() || null,
          effective_date: effectiveDate || null,
          import_notes: importNotes?.trim() || null,
          tags,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookId)
        .eq("organization_id", orgId);

      if (updateResult.error && isMissingColumnError(updateResult.error)) {
        const fallbackUpdate = await admin
          .from("flightbooks")
          .update({
            name: doc.docName,
            doc_type: doc.docType,
            version_label: doc.versionLabel,
            updated_at: new Date().toISOString(),
          })
          .eq("id", bookId)
          .eq("organization_id", orgId);
        if (fallbackUpdate.error) {
          return NextResponse.json({ error: fallbackUpdate.error.message }, { status: 400 });
        }
      } else if (updateResult.error) {
        return NextResponse.json({ error: updateResult.error.message }, { status: 400 });
      }
    }

    if (doc.sections.length === 0) {
      results.push({ bookName: doc.docName, sectionsImported: 0 });
      continue;
    }

    const rows = doc.sections.map((s) => {
      const combinedText = [s.sectionNumber, s.title, s.body].filter(Boolean).join("\n");
      return {
      organization_id: orgId,
      flightbook_id: bookId,
      section_number: s.sectionNumber,
      title: s.title,
      body: s.body || "(empty)",
      sort_order: s.sortOrder,
      token_count: estimateTokenCount(combinedText),
      chunk_hash: hashChunk(combinedText),
      metadata: {
        section_number: s.sectionNumber,
        title: s.title,
        source: "flightbook_upload",
      },
    };
    });

    const { data: insertedSections, error: secErr } = await admin
      .from("flightbook_sections")
      .insert(rows)
      .select("id, section_number, title, body, organization_id");
    if (secErr) return NextResponse.json({ error: secErr.message }, { status: 400 });

    try {
      const texts = (insertedSections ?? []).map((row) =>
        [row.section_number, row.title, row.body].filter(Boolean).join("\n"),
      );
      const embeddings = await embedTexts(admin, orgId, texts);
      if (embeddings && embeddings.length > 0) {
        for (let i = 0; i < insertedSections.length; i += 1) {
          const embedding = embeddings[i];
          if (!embedding?.length) continue;
          await admin
            .from("flightbook_sections")
            .update({
              embedding,
              updated_at: new Date().toISOString(),
            })
            .eq("id", insertedSections[i].id);
        }
      }
    } catch {
      // Keep uploads usable even if the embedding provider is unavailable.
    }

    results.push({ bookName: doc.docName, sectionsImported: doc.sections.length });
  }

  return NextResponse.json({ ok: true, results });
}
