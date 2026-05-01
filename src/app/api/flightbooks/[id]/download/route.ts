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
  const format = searchParams.get("format") === "txt" ? "txt" : "md";
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
      format === "txt"
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
    format === "txt" ? buildText(exportPayload) : buildMarkdown(exportPayload);
  const filenameBase = sanitizeFilename(exportPayload.name || "flightbook");
  const filename = `${filenameBase}-current.${format}`;

  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type":
        format === "txt" ? "text/plain; charset=utf-8" : "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
