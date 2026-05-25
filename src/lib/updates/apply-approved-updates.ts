import type { SupabaseClient } from "@supabase/supabase-js";
import { enrichFlightbookSectionEmbeddings } from "@/lib/ai/embeddings";
import { createFlightbookExport } from "@/lib/flightbook-exports";

type ApprovedUpdateApplication = {
  id: string;
  flightbook_section_id: string | null;
  ai_suggested_text: string | null;
  created_at: string;
};

type SectionForUpdate = {
  id: string;
  body: string | null;
  organization_id: string | null;
  flightbook_id: string | null;
  section_number: string | null;
  title: string | null;
  updated_at: string | null;
};

export async function applyApprovedUpdates(
  admin: SupabaseClient,
  input: {
    ids: string[];
    organizationId: string;
    userId: string;
    fallbackSectionId?: string | null;
    fallbackSuggestedText?: string | null;
  },
) {
  const { data: updates, error: updatesError } = await admin
    .from("proposed_updates")
    .select("id, flightbook_section_id, ai_suggested_text, created_at")
    .eq("organization_id", input.organizationId)
    .in("id", input.ids);

  if (updatesError) return { ok: false as const, error: updatesError.message };

  const updateRows = ((updates ?? []) as ApprovedUpdateApplication[])
    .map((row) => ({
      ...row,
      flightbook_section_id: row.flightbook_section_id ?? input.fallbackSectionId ?? null,
      ai_suggested_text: row.ai_suggested_text ?? input.fallbackSuggestedText ?? null,
    }))
    .filter((row) => row.flightbook_section_id && row.ai_suggested_text);

  if (updateRows.length === 0) {
    return { ok: true as const, applied: 0, exported: 0 };
  }

  const sectionIds = Array.from(new Set(updateRows.map((row) => row.flightbook_section_id as string)));
  const { data: sections, error: sectionsError } = await admin
    .from("flightbook_sections")
    .select("id, body, organization_id, flightbook_id, section_number, title, updated_at")
    .eq("organization_id", input.organizationId)
    .in("id", sectionIds);

  if (sectionsError) return { ok: false as const, error: sectionsError.message };

  const sectionMap = new Map(
    ((sections ?? []) as SectionForUpdate[]).map((section) => [section.id, section]),
  );

  for (const update of updateRows) {
    const section = sectionMap.get(update.flightbook_section_id as string);
    if (!section) {
      return { ok: false as const, error: "Flight book section not found for approved update." };
    }

    const sectionUpdatedAt = section.updated_at ? new Date(section.updated_at).getTime() : 0;
    const updateCreatedAt = new Date(update.created_at).getTime();
    if (sectionUpdatedAt > updateCreatedAt) {
      return {
        ok: false as const,
        conflict: true,
        error:
          "The flight book has been updated since this AI update was proposed. Review the current section text, then regenerate or revise the proposed update before approving.",
      };
    }
  }

  const appliedBookIds = new Set<string>();
  const updatedSectionIdsByBook = new Map<string, Set<string>>();
  const embeddingRefreshRows: Array<{
    id: string;
    organization_id: string;
    section_number: string | null;
    title: string | null;
    body: string;
  }> = [];
  let applied = 0;

  for (const update of updateRows) {
    const sectionId = update.flightbook_section_id as string;
    const section = sectionMap.get(sectionId);
    if (!section) continue;

    const { data: maxVerRow } = await admin
      .from("flightbook_section_versions")
      .select("version_number")
      .eq("flightbook_section_id", sectionId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = ((maxVerRow?.version_number as number | null) ?? 0) + 1;

    const { error: versionError } = await admin.from("flightbook_section_versions").insert({
      organization_id: input.organizationId,
      flightbook_section_id: sectionId,
      body: section.body ?? "",
      version_number: nextVersion,
      change_source: "approved_update",
      created_by: input.userId,
    });

    if (versionError) return { ok: false as const, error: versionError.message };

    const { error: sectionUpdateError } = await admin
      .from("flightbook_sections")
      .update({ body: update.ai_suggested_text, updated_at: new Date().toISOString() })
      .eq("id", sectionId)
      .eq("organization_id", input.organizationId);

    if (sectionUpdateError) return { ok: false as const, error: sectionUpdateError.message };
    if (section.flightbook_id) {
      appliedBookIds.add(section.flightbook_id);
      const sectionIdsForBook = updatedSectionIdsByBook.get(section.flightbook_id) ?? new Set<string>();
      sectionIdsForBook.add(sectionId);
      updatedSectionIdsByBook.set(section.flightbook_id, sectionIdsForBook);
    }
    embeddingRefreshRows.push({
      id: sectionId,
      organization_id: input.organizationId,
      section_number: section.section_number,
      title: section.title,
      body: update.ai_suggested_text as string,
    });
    applied += 1;
  }

  await enrichFlightbookSectionEmbeddings(admin, embeddingRefreshRows);

  let exported = 0;
  for (const flightbookId of appliedBookIds) {
    const exportResult = await createFlightbookExport(admin, {
      organizationId: input.organizationId,
      flightbookId,
      changeSource: "approved_update",
      createdBy: input.userId,
      approverId: input.userId,
      proposedUpdateId: updateRows.find((row) => {
        const sectionId = row.flightbook_section_id as string;
        return (updatedSectionIdsByBook.get(flightbookId) ?? new Set<string>()).has(sectionId);
      })?.id ?? null,
      note: `Generated automatically after ${applied} approved update${applied === 1 ? "" : "s"}.`,
      updatedSectionIds: Array.from(updatedSectionIdsByBook.get(flightbookId) ?? []),
    });
    if (!exportResult.ok) return { ok: false as const, error: exportResult.error };
    exported += 1;
  }

  return { ok: true as const, applied, exported };
}
