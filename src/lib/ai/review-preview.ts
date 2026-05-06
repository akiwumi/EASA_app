import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildRetrievalQuery,
  categoryToPart,
  retrieveFlightbookChunks,
  retrieveRegulationChunks,
  type RetrievedChunk,
} from "@/lib/ai/retrieval";

function unwrapMaybeArray<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function compactCitation(chunk: RetrievedChunk) {
  return {
    kind: chunk.kind === "regulation" ? "regulation_chunk" : "flightbook_section",
    id: chunk.id,
    score: Number(chunk.score.toFixed(3)),
    section_number: chunk.sectionNumber,
    title: chunk.title,
    flightbook_name: chunk.flightbookName ?? null,
    quote: chunk.body.slice(0, 280),
  };
}

export async function buildReviewPreview(
  admin: SupabaseClient,
  input: { findingId: string; flightbookId?: string | null; defaultOrgId: string },
) {
  const { data: finding } = await admin
    .from("ai_findings")
    .select(`
      id,
      organization_id,
      summary,
      mapped_section,
      category,
      rss_items ( title, summary, category )
    `)
    .eq("id", input.findingId)
    .maybeSingle();

  if (!finding) {
    return { ok: false as const, error: "Finding not found." };
  }

  const rss = unwrapMaybeArray(finding.rss_items as {
    title?: string | null;
    summary?: string | null;
    category?: string | null;
  } | { title?: string | null; summary?: string | null; category?: string | null }[] | null);
  const orgId = (finding.organization_id as string | null) ?? input.defaultOrgId;
  const regPart = categoryToPart((finding.category as string | null) ?? rss?.category ?? null);
  const retrievalQuery = buildRetrievalQuery({
    title: rss?.title ?? null,
    rssSummary: rss?.summary ?? null,
    findingSummary: (finding.summary as string | null) ?? null,
    mappedSection: (finding.mapped_section as string | null) ?? null,
    regPart,
  });

  const [regulationChunks, flightbookChunks] = await Promise.all([
    retrieveRegulationChunks(admin, {
      organizationId: orgId,
      queryText: retrievalQuery,
      regPart,
      limit: 4,
      minSimilarity: 0.2,
    }),
    retrieveFlightbookChunks(admin, {
      organizationId: orgId,
      queryText: retrievalQuery,
      regPart,
      limit: 4,
      minSimilarity: 0.2,
      flightbookId: input.flightbookId ?? null,
    }),
  ]);

  const primaryFlightbook = flightbookChunks[0];
  if (!primaryFlightbook) {
    return { ok: false as const, error: "No mapped flight book section found yet." };
  }

  return {
    ok: true as const,
    data: {
      sectionId: primaryFlightbook.id,
      sectionTitle: primaryFlightbook.title,
      sectionNumber: primaryFlightbook.sectionNumber,
      flightbookName: primaryFlightbook.flightbookName ?? "Unknown",
      currentBody: primaryFlightbook.body,
      whyThisSection: "Chosen because it was the strongest retrieved flightbook match.",
      citations: [
        ...regulationChunks.map(compactCitation),
        ...flightbookChunks.slice(1).map(compactCitation),
      ],
    },
  };
}
