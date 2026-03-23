import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function getOrgContext() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = getAdminClient();
  const { data: orgUser } = await admin
    .from("org_users").select("organization_id").eq("user_id", user.id).maybeSingle();
  return { userId: user.id, orgId: (orgUser?.organization_id ?? null) as string | null };
}

interface ParsedSection {
  sectionNumber: string | null;
  title: string | null;
  body: string;
  sortOrder: number;
}

/** Detect section boundaries by numbered heading patterns common in aviation manuals. */
function detectSections(text: string): ParsedSection[] {
  // Normalise line endings
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  const SECTION_RE = /^((\d{1,3})(\.\d{1,3}){0,4})\s{1,4}([A-Z].{2,80})$/;
  const HEADING_RE = /^(Chapter|Section|Part|Appendix|Annex)\s+\d+[\s:–—]/i;

  const sections: ParsedSection[] = [];
  let current: { number: string | null; title: string | null; lines: string[] } | null = null;
  let order = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    const secMatch = trimmed.match(SECTION_RE);
    const headMatch = !secMatch && trimmed.match(HEADING_RE);

    if (secMatch || headMatch) {
      if (current) {
        const body = current.lines.join("\n").trim();
        if (body || current.title) {
          sections.push({ sectionNumber: current.number, title: current.title, body, sortOrder: order += 10 });
        }
      }
      if (secMatch) {
        current = { number: secMatch[1], title: secMatch[4].trim(), lines: [] };
      } else {
        current = { number: null, title: trimmed, lines: [] };
      }
    } else if (current) {
      current.lines.push(line);
    } else if (trimmed) {
      // Content before first heading — create a preamble section
      current = { number: null, title: "Preamble", lines: [line] };
    }
  }

  if (current) {
    const body = current.lines.join("\n").trim();
    if (body || current.title) {
      sections.push({ sectionNumber: current.number, title: current.title, body, sortOrder: order += 10 });
    }
  }

  // Fall back: if no sections detected, treat each paragraph as a section
  if (sections.length === 0) {
    const paragraphs = text.split(/\n{2,}/);
    paragraphs.forEach((para, i) => {
      const p = para.trim();
      if (p.length > 20) {
        const firstLine = p.split("\n")[0].slice(0, 80);
        sections.push({ sectionNumber: null, title: firstLine, body: p, sortOrder: (i + 1) * 10 });
      }
    });
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
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getAdminClient();
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const flightbookId = formData.get("flightbookId") as string | null;
  const docName = formData.get("docName") as string | null;
  const docType = (formData.get("docType") as string | null) ?? "Other";
  const versionLabel = formData.get("versionLabel") as string | null;

  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const orgId = ctx.orgId ?? "00000000-0000-4000-8000-000000000001";
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
        .insert({ organization_id: orgId, name: doc.docName, doc_type: doc.docType, version_label: doc.versionLabel, active: true })
        .select("id").single();
      if (bookErr) return NextResponse.json({ error: bookErr.message }, { status: 400 });
      bookId = book.id;
    } else {
      // Clear existing sections so re-import is clean
      await admin.from("flightbook_sections").delete().eq("flightbook_id", bookId);
    }

    if (doc.sections.length === 0) {
      results.push({ bookName: doc.docName, sectionsImported: 0 });
      continue;
    }

    const rows = doc.sections.map((s) => ({
      organization_id: orgId,
      flightbook_id: bookId,
      section_number: s.sectionNumber,
      title: s.title,
      body: s.body || "(empty)",
      sort_order: s.sortOrder,
    }));

    const { error: secErr } = await admin.from("flightbook_sections").insert(rows);
    if (secErr) return NextResponse.json({ error: secErr.message }, { status: 400 });

    results.push({ bookName: doc.docName, sectionsImported: doc.sections.length });
  }

  return NextResponse.json({ ok: true, results });
}
