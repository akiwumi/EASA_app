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

function buildWhyThisSection(primaryFlightbook: RetrievedChunk, regulationChunks: RetrievedChunk[]) {
  const topFlightbookScore = Number(primaryFlightbook.score.toFixed(3));
  const topRegulationScore = regulationChunks[0] ? Number(regulationChunks[0].score.toFixed(3)) : null;
  const sectionRef = primaryFlightbook.sectionNumber ?? primaryFlightbook.title ?? "this section";

  if (topRegulationScore != null) {
    return `Matched to ${sectionRef} because it had the strongest flightbook similarity (${topFlightbookScore}) and aligned regulation evidence (${topRegulationScore}).`;
  }

  return `Matched to ${sectionRef} because it had the strongest flightbook similarity score (${topFlightbookScore}).`;
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
      confidence,
      rss_item_id,
      rss_items ( title, summary, category, link, published_at )
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
    link?: string | null;
    published_at?: string | null;
  } | {
    title?: string | null;
    summary?: string | null;
    category?: string | null;
    link?: string | null;
    published_at?: string | null;
  }[] | null);
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
      whyThisSection: buildWhyThisSection(primaryFlightbook, regulationChunks),
      rssTitle: rss?.title ?? null,
      rssSummary: rss?.summary ?? null,
      rssLink: (rss?.link as string | null | undefined) ?? null,
      rssPublishedAt: (rss?.published_at as string | null | undefined) ?? null,
      regPart,
      sourceCitations: [
        ...regulationChunks.slice(0, 3).map(compactCitation),
        ...flightbookChunks.slice(0, 3).map(compactCitation),
      ],
      trigger: {
        title: rss?.title ?? "EASA update",
        summary: rss?.summary ?? null,
        link: (rss?.link as string | null | undefined) ?? null,
        publishedAt: (rss?.published_at as string | null | undefined) ?? null,
        category: (rss?.category as string | null | undefined) ?? (finding.category as string | null | undefined) ?? null,
        confidence: (finding.confidence as string | null | undefined) ?? null,
      },
      citations: [
        ...regulationChunks.map(compactCitation),
        ...flightbookChunks.slice(1).map(compactCitation),
      ],
    },
  };
}
