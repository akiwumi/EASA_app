import type { SupabaseClient } from "@supabase/supabase-js";
import { embedSingleText } from "@/lib/ai/embeddings";

export type RetrievedChunk = {
  id: string;
  kind: "regulation" | "flightbook";
  score: number;
  title: string | null;
  sectionNumber: string | null;
  body: string;
  metadata: Record<string, unknown>;
  flightbookName?: string;
};

export const CATEGORY_TO_PART: Record<string, string> = {
  aircrew: "Part-FCL",
  licensing: "Part-FCL",
  medical: "Part-MED",
  operations: "Part-ORO",
  training: "Part-ORA",
  safety: "Part-ARO",
  airworthiness: "Part-M",
  maintenance: "Part-145",
  commercial: "Part-CAT",
  "non-commercial": "Part-NCO",
  general: "General",
};

export function categoryToPart(category: string | null) {
  if (!category) return "General";
  return CATEGORY_TO_PART[category.toLowerCase().trim()] ?? "General";
}

export function buildRetrievalQuery(input: {
  title?: string | null;
  rssSummary?: string | null;
  findingSummary?: string | null;
  mappedSection?: string | null;
  regPart?: string | null;
}) {
  return [
    input.regPart ? `Regulation family: ${input.regPart}` : null,
    input.title ? `Title: ${input.title}` : null,
    input.rssSummary ? `Source summary: ${input.rssSummary}` : null,
    input.findingSummary ? `Finding summary: ${input.findingSummary}` : null,
    input.mappedSection ? `Mapped section hint: ${input.mappedSection}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function vectorLiteral(values: number[]) {
  return `[${values.join(",")}]`;
}

async function fallbackFlightbookSearch(
  admin: SupabaseClient,
  organizationId: string,
  queryText: string,
  limit: number,
) {
  const tokens = queryText
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2)
    .slice(0, 4);

  const ilike = tokens.join("%");
  const { data } = await admin
    .from("flightbook_sections")
    .select("id, section_number, title, body, metadata, flightbooks!inner(name, active)")
    .eq("organization_id", organizationId)
    .eq("flightbooks.active", true)
    .or(`title.ilike.%${ilike}%,body.ilike.%${ilike}%`)
    .limit(limit);

  return (data ?? []).map((row) => {
    const flightbook = Array.isArray(row.flightbooks) ? row.flightbooks[0] : row.flightbooks;
    return {
      id: row.id,
      kind: "flightbook" as const,
      score: 0.25,
      title: row.title,
      sectionNumber: row.section_number,
      body: row.body,
      metadata: (row.metadata as Record<string, unknown> | null) ?? {},
      flightbookName: (flightbook as { name?: string } | null)?.name ?? "Unknown",
    };
  });
}

async function fallbackRegulationSearch(
  admin: SupabaseClient,
  organizationId: string,
  queryText: string,
  regPart: string | null,
  limit: number,
) {
  const tokens = queryText
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2)
    .slice(0, 4);

  let query = admin
    .from("document_sections")
    .select("id, section_number, title, body, metadata")
    .eq("organization_id", organizationId)
    .limit(limit);

  if (regPart && regPart !== "General") {
    query = query.or(`metadata->>part.eq.${regPart},metadata->>reg_part.eq.${regPart}`);
  } else if (tokens.length > 0) {
    const ilike = tokens.join("%");
    query = query.or(`title.ilike.%${ilike}%,body.ilike.%${ilike}%`);
  }

  const { data } = await query;

  return (data ?? []).map((row) => ({
    id: row.id,
    kind: "regulation" as const,
    score: 0.25,
    title: row.title,
    sectionNumber: row.section_number,
    body: row.body,
    metadata: (row.metadata as Record<string, unknown> | null) ?? {},
  }));
}

export async function retrieveFlightbookChunks(
  admin: SupabaseClient,
  input: {
    organizationId: string;
    queryText: string;
    regPart?: string | null;
    limit?: number;
    minSimilarity?: number;
  },
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embedSingleText(admin, input.organizationId, input.queryText);
  const limit = input.limit ?? 5;

  if (!queryEmbedding) {
    return fallbackFlightbookSearch(admin, input.organizationId, input.queryText, limit);
  }

  const { data } = await admin.rpc("match_flightbook_sections", {
    query_embedding: vectorLiteral(queryEmbedding),
    match_count: limit,
    min_similarity: input.minSimilarity ?? 0.25,
    filter_organization_id: input.organizationId,
    filter_part: input.regPart ?? null,
  });

  const matches = (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    kind: "flightbook" as const,
    score: Number(row.similarity ?? 0),
    title: (row.title as string | null) ?? null,
    sectionNumber: (row.section_number as string | null) ?? null,
    body: String(row.body ?? ""),
    metadata: (row.metadata as Record<string, unknown> | null) ?? {},
    flightbookName: (row.flightbook_name as string | null) ?? "Unknown",
  }));

  return matches.length > 0
    ? matches
    : fallbackFlightbookSearch(admin, input.organizationId, input.queryText, limit);
}

export async function retrieveRegulationChunks(
  admin: SupabaseClient,
  input: {
    organizationId: string;
    queryText: string;
    regPart?: string | null;
    limit?: number;
    minSimilarity?: number;
  },
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embedSingleText(admin, input.organizationId, input.queryText);
  const limit = input.limit ?? 5;

  if (!queryEmbedding) {
    return fallbackRegulationSearch(
      admin,
      input.organizationId,
      input.queryText,
      input.regPart ?? null,
      limit,
    );
  }

  const { data } = await admin.rpc("match_document_sections", {
    query_embedding: vectorLiteral(queryEmbedding),
    match_count: limit,
    min_similarity: input.minSimilarity ?? 0.25,
    filter_organization_id: input.organizationId,
    filter_part: input.regPart ?? null,
    filter_source_id: null,
  });

  const matches = (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    kind: "regulation" as const,
    score: Number(row.similarity ?? 0),
    title: (row.title as string | null) ?? null,
    sectionNumber: (row.section_number as string | null) ?? null,
    body: String(row.body ?? ""),
    metadata: (row.metadata as Record<string, unknown> | null) ?? {},
  }));

  return matches.length > 0
    ? matches
    : fallbackRegulationSearch(
        admin,
        input.organizationId,
        input.queryText,
        input.regPart ?? null,
        limit,
      );
}
