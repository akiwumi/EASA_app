import { NextResponse } from "next/server";
import { getOrgAccessContext, getSupabaseAdminClient } from "@/lib/supabase/access";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

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
  sections: { section_number: string | null; title: string | null; body: string; updated?: boolean }[];
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

async function buildDocx(input: {
  name: string;
  docType: string;
  versionLabel: string | null;
  exportedAt: string;
  sections: { section_number: string | null; title: string | null; body: string; updated?: boolean }[];
}) {
  const children: Paragraph[] = [
    new Paragraph({ text: input.name, heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: `Document type: ${input.docType}` }),
    new Paragraph({ text: `Revision: ${input.versionLabel ?? "Current"}` }),
    new Paragraph({ text: `Exported at: ${input.exportedAt}` }),
    new Paragraph({ text: "" }),
  ];

  for (const section of input.sections) {
    const heading = [section.section_number, section.title].filter(Boolean).join(" ") || "Untitled section";
    if (section.updated) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "UPDATED SECTION",
              bold: true,
              color: "B91C1C",
            }),
          ],
        }),
      );
    }
    children.push(new Paragraph({ text: heading, heading: HeadingLevel.HEADING_2 }));

    const blocks = section.body.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
    if (blocks.length === 0) {
      children.push(new Paragraph({ text: "" }));
    } else {
      for (const block of blocks) {
        children.push(new Paragraph({ children: [new TextRun({ text: block })] }));
      }
    }
  }

  const doc = new Document({
    sections: [{ children }],
  });

  return Packer.toBuffer(doc);
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

function toBinaryBody(content: Buffer) {
  return new Uint8Array(content);
}

function buildPdf(input: {
  name: string;
  docType: string;
  versionLabel: string | null;
  exportedAt: string;
  sections: { section_number: string | null; title: string | null; body: string; updated?: boolean }[];
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
  sections: { section_number: string | null; title: string | null; body: string; updated?: boolean }[];
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

function parseRetainedMarkdownExport(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const titleLine = lines.find((line) => line.startsWith("# "));
  const name = titleLine?.replace(/^#\s+/, "").trim() || "Retained export";
  const sections: { section_number: string | null; title: string | null; body: string; updated?: boolean }[] = [];
  let current:
    | { section_number: string | null; title: string | null; bodyLines: string[]; updated?: boolean }
    | null = null;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (current) {
        sections.push({
          section_number: current.section_number,
          title: current.title,
          body: current.bodyLines.join("\n").trim(),
          updated: current.updated,
        });
      }

      const rawHeading = line.replace(/^##\s+/, "").trim();
      const updated = /\s+\[UPDATED\]$/.test(rawHeading);
      const heading = rawHeading.replace(/\s+\[UPDATED\]$/, "");
      const sectionMatch = heading.match(/^(\S+)\s+(.+)$/);
      current = {
        section_number: sectionMatch?.[1] ?? null,
        title: sectionMatch?.[2] ?? heading,
        bodyLines: [],
        updated,
      };
    } else if (current) {
      if (current.updated && line === "> Updated in this revision from approved EASA queue item(s).") {
        continue;
      }
      current.bodyLines.push(line);
    }
  }

  if (current) {
    sections.push({
      section_number: current.section_number,
      title: current.title,
      body: current.bodyLines.join("\n").trim(),
      updated: current.updated,
    });
  }

  return {
    name,
    sections: sections.length > 0
      ? sections
      : [{ section_number: null, title: "Retained export", body: markdown }],
  };
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
  const format = requestedFormat === "txt" || requestedFormat === "docx" || requestedFormat === "pdf" ? requestedFormat : "md";
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
      format === "txt" || format === "pdf"
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

    if (format === "docx") {
      const parsedExport = parseRetainedMarkdownExport(text);
      const content = await buildDocx({
        name: parsedExport.name,
        docType: "flightbook",
        versionLabel: "Retained export",
        exportedAt: new Date().toISOString(),
        sections: parsedExport.sections,
      });
      return new Response(toBinaryBody(content), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${filenameBase}.docx"`,
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
      return new Response(toBinaryBody(content), {
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
      : format === "docx"
        ? await buildDocx(exportPayload)
        : format === "pdf"
          ? buildPdf(exportPayload)
          : buildMarkdown(exportPayload);
  const responseBody =
    typeof content === "string"
      ? content
      : toBinaryBody(content);
  const filenameBase = sanitizeFilename(exportPayload.name || "flightbook");
  const filename = `${filenameBase}-current.${format}`;

  return new Response(responseBody, {
    status: 200,
    headers: {
      "Content-Type":
        format === "txt"
          ? "text/plain; charset=utf-8"
          : format === "docx"
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : format === "pdf"
              ? "application/pdf"
              : "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
