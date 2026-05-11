import { NextResponse } from "next/server";
import { getOrgAccessContext, getSupabaseAdminClient } from "@/lib/supabase/access";

function sanitizeFilename(value: string) {
  return value
    .trim()
    .replace(/[^\w\s-]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function buildMarkdown(input: {
  name: string;
  docType: string;
  versionLabel: string | null;
  exportedAt: string;
  sections: { section_number: string | null; title: string | null; body: string }[];
}) {
  const lines = [
    `# ${input.name}`,
    "",
    `- Document type: ${input.docType}`,
    `- Version label: ${input.versionLabel ?? "Current"}`,
    `- Exported at: ${input.exportedAt}`,
    "",
  ];

  for (const section of input.sections) {
    const heading = [section.section_number, section.title].filter(Boolean).join(" ");
    lines.push(`## ${heading || "Untitled section"}`);
    lines.push("");
    lines.push(section.body);
    lines.push("");
  }

  return lines.join("\n");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildWordDoc(input: {
  name: string;
  docType: string;
  versionLabel: string | null;
  exportedAt: string;
  sections: { section_number: string | null; title: string | null; body: string }[];
}) {
  const sectionHtml = input.sections
    .map((section) => {
      const heading = [section.section_number, section.title].filter(Boolean).join(" ") || "Untitled section";
      const body = escapeHtml(section.body)
        .split(/\n{2,}/)
        .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
        .join("");
      return `<h2>${escapeHtml(heading)}</h2>${body}`;
    })
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(input.name)}</title>
  <style>
    body { font-family: Aptos, Arial, sans-serif; font-size: 11pt; line-height: 1.45; color: #111827; }
    h1 { font-size: 22pt; margin-bottom: 8pt; }
    h2 { font-size: 14pt; margin-top: 20pt; border-bottom: 1px solid #d1d5db; padding-bottom: 4pt; }
    .meta { color: #4b5563; margin-bottom: 18pt; }
    p { margin: 0 0 10pt; }
  </style>
</head>
<body>
  <h1>${escapeHtml(input.name)}</h1>
  <div class="meta">
    <div>Document type: ${escapeHtml(input.docType)}</div>
    <div>Revision: ${escapeHtml(input.versionLabel ?? "Current")}</div>
    <div>Exported at: ${escapeHtml(input.exportedAt)}</div>
  </div>
  ${sectionHtml}
</body>
</html>`;
}

function wrapText(text: string, maxChars: number) {
  const lines: string[] = [];
  for (const sourceLine of text.split(/\r?\n/)) {
    const words = sourceLine.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      if ((line + " " + word).trim().length > maxChars) {
        lines.push(line);
        line = word;
      } else {
        line = (line + " " + word).trim();
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildPdf(input: {
  name: string;
  docType: string;
  versionLabel: string | null;
  exportedAt: string;
  sections: { section_number: string | null; title: string | null; body: string }[];
}) {
  const contentLines = [
    input.name,
    "",
    `Document type: ${input.docType}`,
    `Revision: ${input.versionLabel ?? "Current"}`,
    `Exported at: ${input.exportedAt}`,
    "",
    ...input.sections.flatMap((section) => {
      const heading = [section.section_number, section.title].filter(Boolean).join(" ") || "Untitled section";
      return [heading, "", ...wrapText(section.body, 92), ""];
    }),
  ];

  const pages: string[][] = [];
  let current: string[] = [];
  for (const line of contentLines) {
    if (current.length >= 48) {
      pages.push(current);
      current = [];
    }
    current.push(line);
  }
  if (current.length) pages.push(current);

  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  const pageObjectIds = pages.map((_, index) => 3 + index * 2);
  objects.push(`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`);

  pages.forEach((pageLines, index) => {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    const streamLines = ["BT", "/F1 10 Tf", "50 790 Td", "14 TL"];
    pageLines.forEach((line, lineIndex) => {
      if (lineIndex > 0) streamLines.push("T*");
      streamLines.push(`(${escapePdfText(line)}) Tj`);
    });
    streamLines.push("ET");
    const stream = streamLines.join("\n");
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R >> >> /Contents ${contentId} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`);
  });

  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

function buildText(input: {
  name: string;
  docType: string;
  versionLabel: string | null;
  exportedAt: string;
  sections: { section_number: string | null; title: string | null; body: string }[];
}) {
  const lines = [
    input.name,
    "=".repeat(input.name.length),
    "",
    `Document type: ${input.docType}`,
    `Version label: ${input.versionLabel ?? "Current"}`,
    `Exported at: ${input.exportedAt}`,
    "",
  ];

  for (const section of input.sections) {
    const heading = [section.section_number, section.title].filter(Boolean).join(" ");
    lines.push(heading || "Untitled section");
    lines.push("-".repeat(Math.max(heading.length, 16)));
    lines.push(section.body);
    lines.push("");
  }

  return lines.join("\n");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getOrgAccessContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const requestedFormat = searchParams.get("format");
  const format = requestedFormat === "txt" || requestedFormat === "doc" || requestedFormat === "pdf" ? requestedFormat : "md";
  const exportId = searchParams.get("exportId");

  const admin = getSupabaseAdminClient();

  if (exportId) {
    const { data: exportRow } = await admin
      .from("flightbook_exports")
      .select("id, markdown_storage_path, text_storage_path")
      .eq("id", exportId)
      .eq("flightbook_id", id)
      .eq("organization_id", ctx.orgId)
      .maybeSingle();

    if (!exportRow) {
      return NextResponse.json({ error: "Export version not found" }, { status: 404 });
    }

    const objectPath =
      format === "txt" || format === "doc" || format === "pdf"
        ? (exportRow.text_storage_path as string)
        : (exportRow.markdown_storage_path as string);

    const { data: storageObject, error: storageError } = await admin.storage
      .from("exports")
      .download(objectPath);

    if (storageError || !storageObject) {
      return NextResponse.json(
        { error: storageError?.message ?? "Unable to download export artifact." },
        { status: 400 },
      );
    }

    const text = await storageObject.text();
    const filenameBase = sanitizeFilename(objectPath.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "flightbook");

    if (format === "doc") {
      const content = buildWordDoc({
        name: filenameBase,
        docType: "flightbook",
        versionLabel: "Retained export",
        exportedAt: new Date().toISOString(),
        sections: [{ section_number: null, title: "Retained export", body: text }],
      });
      return new Response(content, {
        status: 200,
        headers: {
          "Content-Type": "application/msword; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filenameBase}.doc"`,
        },
      });
    }

    if (format === "pdf") {
      const content = buildPdf({
        name: filenameBase,
        docType: "flightbook",
        versionLabel: "Retained export",
        exportedAt: new Date().toISOString(),
        sections: [{ section_number: null, title: "Retained export", body: text }],
      });
      return new Response(content, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filenameBase}.pdf"`,
        },
      });
    }

    const bytes = await storageObject.arrayBuffer();
    const filename = objectPath.split("/").pop() ?? `flightbook.${format}`;

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type":
          format === "txt" ? "text/plain; charset=utf-8" : "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  const { data: book } = await admin
    .from("flightbooks")
    .select("id, name, doc_type, version_label")
    .eq("id", id)
    .eq("organization_id", ctx.orgId)
    .maybeSingle();

  if (!book) {
    return NextResponse.json({ error: "Flight book not found" }, { status: 404 });
  }

  const { data: sections, error: sectionsError } = await admin
    .from("flightbook_sections")
    .select("section_number, title, body")
    .eq("flightbook_id", id)
    .eq("organization_id", ctx.orgId)
    .order("sort_order", { ascending: true });

  if (sectionsError) {
    return NextResponse.json({ error: sectionsError.message }, { status: 400 });
  }

  const exportPayload = {
    name: book.name as string,
    docType: book.doc_type as string,
    versionLabel: (book.version_label as string | null) ?? null,
    exportedAt: new Date().toISOString(),
    sections: (sections ?? []).map((section) => ({
      section_number: (section.section_number as string | null) ?? null,
      title: (section.title as string | null) ?? null,
      body: (section.body as string) ?? "",
    })),
  };

  const content =
    format === "txt"
      ? buildText(exportPayload)
      : format === "doc"
        ? buildWordDoc(exportPayload)
        : format === "pdf"
          ? buildPdf(exportPayload)
          : buildMarkdown(exportPayload);
  const filenameBase = sanitizeFilename(exportPayload.name || "flightbook");
  const filename = `${filenameBase}-current.${format}`;

  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type":
        format === "txt"
          ? "text/plain; charset=utf-8"
          : format === "doc"
            ? "application/msword; charset=utf-8"
            : format === "pdf"
              ? "application/pdf"
              : "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
