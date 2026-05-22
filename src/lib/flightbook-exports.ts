import type { SupabaseClient } from "@supabase/supabase-js";

type ExportSection = {
  id: string;
  section_number: string | null;
  title: string | null;
  body: string;
};

type ExportBook = {
  id: string;
  name: string;
  doc_type: string;
  version_label: string | null;
};

function sanitizeFilename(value: string) {
  return value
    .trim()
    .replace(/[^\w\s-]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function versionTag(versionNumber: number) {
  return `v${String(versionNumber).padStart(4, "0")}`;
}

function formatRevisionTimestamp(iso: string) {
  return iso.slice(0, 16).replace("T", " ");
}

function storageTimestamp(iso: string) {
  return iso.replace(/[:.]/g, "-");
}

function revisionLabel(versionNumber: number, exportedAt: string) {
  return `Rev ${String(versionNumber).padStart(4, "0")} - ${formatRevisionTimestamp(exportedAt)} UTC`;
}

function sectionHeading(section: ExportSection, updatedSectionIds?: Set<string>) {
  const heading = [section.section_number, section.title].filter(Boolean).join(" ") || "Untitled section";
  return updatedSectionIds?.has(section.id) ? `${heading} [UPDATED]` : heading;
}

function updatedSectionNote(updated: boolean, markdown: boolean) {
  if (!updated) return [];
  return markdown
    ? ["> Updated in this revision from approved EASA queue item(s).", ""]
    : ["Updated in this revision from approved EASA queue item(s).", ""];
}

export function buildMarkdown(input: {
  book: ExportBook;
  sections: ExportSection[];
  exportedAt: string;
  versionNumber: number;
  revisionLabel: string;
  updatedSectionIds?: Set<string>;
}) {
  const lines = [
    `# ${input.book.name}`,
    "",
    `- Document type: ${input.book.doc_type}`,
    `- Revision: ${input.revisionLabel}`,
    `- Previous version label: ${input.book.version_label ?? "Current"}`,
    `- Export version: ${versionTag(input.versionNumber)}`,
    `- Exported at: ${input.exportedAt}`,
    "",
  ];

  for (const section of input.sections) {
    const updated = input.updatedSectionIds?.has(section.id) ?? false;
    lines.push(`## ${sectionHeading(section, input.updatedSectionIds)}`);
    lines.push("");
    lines.push(...updatedSectionNote(updated, true));
    lines.push(section.body);
    lines.push("");
  }

  return lines.join("\n");
}

export function buildText(input: {
  book: ExportBook;
  sections: ExportSection[];
  exportedAt: string;
  versionNumber: number;
  revisionLabel: string;
  updatedSectionIds?: Set<string>;
}) {
  const title = input.book.name;
  const lines = [
    title,
    "=".repeat(title.length),
    "",
    `Document type: ${input.book.doc_type}`,
    `Revision: ${input.revisionLabel}`,
    `Previous version label: ${input.book.version_label ?? "Current"}`,
    `Export version: ${versionTag(input.versionNumber)}`,
    `Exported at: ${input.exportedAt}`,
    "",
  ];

  for (const section of input.sections) {
    const heading = sectionHeading(section, input.updatedSectionIds);
    const updated = input.updatedSectionIds?.has(section.id) ?? false;
    const safeHeading = heading || "Untitled section";
    lines.push(safeHeading);
    lines.push("-".repeat(Math.max(safeHeading.length, 16)));
    lines.push(...updatedSectionNote(updated, false));
    lines.push(section.body);
    lines.push("");
  }

  return lines.join("\n");
}

export async function createFlightbookExport(
  admin: SupabaseClient,
  input: {
    organizationId: string;
    flightbookId: string;
    changeSource: string;
    createdBy?: string | null;
    proposedUpdateId?: string | null;
    note?: string | null;
    updatedSectionIds?: string[];
  },
) {
  const { data: book, error: bookError } = await admin
    .from("flightbooks")
    .select("id, name, doc_type, version_label")
    .eq("id", input.flightbookId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (bookError) return { ok: false as const, error: bookError.message };
  if (!book) return { ok: false as const, error: "Flight book not found for export." };

  const { data: sections, error: sectionsError } = await admin
    .from("flightbook_sections")
    .select("id, section_number, title, body")
    .eq("flightbook_id", input.flightbookId)
    .eq("organization_id", input.organizationId)
    .order("sort_order", { ascending: true });

  if (sectionsError) return { ok: false as const, error: sectionsError.message };

  const { data: latestExport, error: latestExportError } = await admin
    .from("flightbook_exports")
    .select("version_number")
    .eq("flightbook_id", input.flightbookId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestExportError) return { ok: false as const, error: latestExportError.message };

  const nextVersion = ((latestExport?.version_number as number | null) ?? 0) + 1;
  const exportedAt = new Date().toISOString();
  const nextRevisionLabel = revisionLabel(nextVersion, exportedAt);
  const versionFolder = versionTag(nextVersion);
  const filenameBase = sanitizeFilename((book.name as string) || "flightbook");
  const timestampTag = storageTimestamp(exportedAt);
  const markdownPath = `${input.organizationId}/${input.flightbookId}/${versionFolder}/${filenameBase}-${versionFolder}-${timestampTag}.md`;
  const textPath = `${input.organizationId}/${input.flightbookId}/${versionFolder}/${filenameBase}-${versionFolder}-${timestampTag}.txt`;

  const exportInput = {
    book: book as ExportBook,
    sections: (sections ?? []).map((section) => ({
      id: section.id as string,
      section_number: (section.section_number as string | null) ?? null,
      title: (section.title as string | null) ?? null,
      body: (section.body as string) ?? "",
    })),
    exportedAt,
    versionNumber: nextVersion,
    revisionLabel: nextRevisionLabel,
    updatedSectionIds: new Set(input.updatedSectionIds ?? []),
  };

  const markdown = buildMarkdown(exportInput);
  const text = buildText(exportInput);
  const encoder = new TextEncoder();
  const markdownBytes = encoder.encode(markdown);
  const textBytes = encoder.encode(text);

  const { error: mdUploadError } = await admin.storage
    .from("exports")
    .upload(markdownPath, markdownBytes, {
      contentType: "text/markdown; charset=utf-8",
      upsert: true,
    });

  if (mdUploadError) return { ok: false as const, error: mdUploadError.message };

  const { error: txtUploadError } = await admin.storage
    .from("exports")
    .upload(textPath, textBytes, {
      contentType: "text/plain; charset=utf-8",
      upsert: true,
    });

  if (txtUploadError) return { ok: false as const, error: txtUploadError.message };

  const { data: exportRow, error: exportError } = await admin
    .from("flightbook_exports")
    .insert({
      organization_id: input.organizationId,
      flightbook_id: input.flightbookId,
      version_number: nextVersion,
      change_source: input.changeSource,
      proposed_update_id: input.proposedUpdateId ?? null,
      created_by: input.createdBy ?? null,
      markdown_storage_path: markdownPath,
      text_storage_path: textPath,
      markdown_bytes: markdownBytes.byteLength,
      text_bytes: textBytes.byteLength,
      note: input.note ?? null,
    })
    .select("id, version_number, markdown_storage_path, text_storage_path, created_at")
    .maybeSingle();

  if (exportError) return { ok: false as const, error: exportError.message };

  await admin
    .from("flightbooks")
    .update({
      version_label: nextRevisionLabel,
      updated_at: exportedAt,
    })
    .eq("id", input.flightbookId)
    .eq("organization_id", input.organizationId);

  return {
    ok: true as const,
    exportRow: {
      id: exportRow?.id as string,
      versionNumber: exportRow?.version_number as number,
      revisionLabel: nextRevisionLabel,
      markdownPath: exportRow?.markdown_storage_path as string,
      textPath: exportRow?.text_storage_path as string,
      createdAt: exportRow?.created_at as string,
    },
  };
}
