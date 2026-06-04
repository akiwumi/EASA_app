import type { SupabaseClient } from "@supabase/supabase-js";

export type FlightbookMemoryType =
  | "section_summary"
  | "obligation"
  | "update_hint"
  | "risk_note"
  | "training_link";

export type MemoryStatusState = "none" | "learned" | "analyzing" | "stale" | "failed";

export type MemorySectionInput = {
  id: string;
  organization_id: string;
  flightbook_id: string;
  section_number: string | null;
  title: string | null;
  body: string;
  chunk_hash: string | null;
  metadata?: Record<string, unknown> | null;
};

export type NewMemoryInput = {
  organization_id: string;
  flightbook_id: string;
  flightbook_section_id: string;
  source_chunk_hash: string | null;
  memory_type: FlightbookMemoryType;
  title: string;
  content: string;
  tags: string[];
  confidence: number;
  metadata: Record<string, unknown>;
};

export type RetrievedMemory = {
  id: string;
  flightbookId: string | null;
  flightbookSectionId: string | null;
  memoryType: FlightbookMemoryType;
  title: string;
  content: string;
  tags: string[];
  confidence: number;
  sourceChunkHash: string | null;
  sectionTitle: string | null;
  sectionNumber: string | null;
  flightbookName: string | null;
};

export type MemoryStatus = {
  state: MemoryStatusState;
  activeMemoryCount: number;
  staleMemoryCount: number;
  latestRunStatus: string | null;
  latestRunError: string | null;
};

export type MemoryAnalysisResult =
  | { ok: true; runId: string | null; inserted: number; staleCount: number }
  | { ok: false; error: string; runId: string | null };

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function firstSentence(value: string, maxLength = 260) {
  const text = compactWhitespace(value);
  if (!text) return "";
  const sentence = text.match(/^.{40,}?[.!?](?:\s|$)/)?.[0]?.trim() ?? text;
  return sentence.length > maxLength ? `${sentence.slice(0, maxLength - 1).trim()}...` : sentence;
}

function extractTags(section: MemorySectionInput) {
  const source = [
    section.section_number,
    section.title,
    section.metadata?.part,
    section.metadata?.reg_part,
    section.metadata?.category,
    section.body,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  const tags = new Set<string>();
  for (const [tag, pattern] of [
    ["training", /train|lesson|instructor|student|ppl|ato/],
    ["operations", /operation|flight|dispatch|crew|duty/],
    ["safety", /safety|risk|occurrence|hazard|emergency/],
    ["compliance", /easa|part-|oro|ora|fcl|med|require|compliance/],
    ["records", /record|document|log|certificate|archive/],
  ] as const) {
    if (pattern.test(source)) tags.add(tag);
  }
  if (tags.size === 0) tags.add("flightbook");
  return Array.from(tags);
}

export function isMissingMemorySchemaError(
  error: { code?: string | null; message?: string | null } | null | undefined,
) {
  return (
    ["PGRST200", "PGRST205", "42P01", "42703"].includes(error?.code ?? "") ||
    /could not find (?:a |the )?(?:relationship|table|column)/i.test(error?.message ?? "") ||
    /relation .* does not exist/i.test(error?.message ?? "")
  );
}

export function buildFallbackSectionMemories(section: MemorySectionInput): NewMemoryInput[] {
  const sectionLabel = [section.section_number, section.title].filter(Boolean).join(" ") || "Flight book section";
  const summary = firstSentence(section.body) || "Section text is available for Henry to reference.";
  const tags = extractTags(section);

  const memories: NewMemoryInput[] = [{
    organization_id: section.organization_id,
    flightbook_id: section.flightbook_id,
    flightbook_section_id: section.id,
    source_chunk_hash: section.chunk_hash,
    memory_type: "section_summary",
    title: `Summary: ${sectionLabel}`,
    content: summary,
    tags,
    confidence: 0.62,
    metadata: { generatedBy: "deterministic_fallback" },
  }];

  if (/(shall|must|required|responsib|ensure|compliance|record|maintain)/i.test(section.body)) {
    memories.push({
      organization_id: section.organization_id,
      flightbook_id: section.flightbook_id,
      flightbook_section_id: section.id,
      source_chunk_hash: section.chunk_hash,
      memory_type: "obligation",
      title: `Obligation: ${sectionLabel}`,
      content: `Review this section for duties, records, approvals, or training requirements. Evidence: ${summary}`,
      tags: Array.from(new Set([...tags, "obligation"])),
      confidence: 0.56,
      metadata: { generatedBy: "deterministic_fallback" },
    });
  }

  if (/(easa|part-|oro|ora|fcl|med|regulation|amc|gm|rule)/i.test(section.body)) {
    memories.push({
      organization_id: section.organization_id,
      flightbook_id: section.flightbook_id,
      flightbook_section_id: section.id,
      source_chunk_hash: section.chunk_hash,
      memory_type: "update_hint",
      title: `Update watch: ${sectionLabel}`,
      content: `If related EASA material changes, Henry should re-check this section before recommending manual updates. Evidence: ${summary}`,
      tags: Array.from(new Set([...tags, "update-watch"])),
      confidence: 0.54,
      metadata: { generatedBy: "deterministic_fallback" },
    });
  }

  return memories;
}

export async function markStaleMemoriesForSections(
  admin: SupabaseClient,
  input: {
    organizationId: string;
    sections: Array<{ id: string; chunk_hash: string | null }>;
  },
) {
  let staleCount = 0;

  for (const section of input.sections) {
    const { data, error } = await admin
      .from("ai_memories")
      .update({ stale_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("organization_id", input.organizationId)
      .eq("flightbook_section_id", section.id)
      .is("stale_at", null)
      .neq("source_chunk_hash", section.chunk_hash ?? "")
      .select("id");

    if (error) {
      if (isMissingMemorySchemaError(error)) return { staleCount };
      throw error;
    }
    staleCount += data?.length ?? 0;
  }

  return { staleCount };
}

function mapMemoryRows(rows: Record<string, unknown>[]): RetrievedMemory[] {
  return rows.map((row) => {
    const section = Array.isArray(row.flightbook_sections) ? row.flightbook_sections[0] : row.flightbook_sections;
    const flightbook = Array.isArray(row.flightbooks) ? row.flightbooks[0] : row.flightbooks;
    return {
      id: String(row.id),
      flightbookId: (row.flightbook_id as string | null) ?? null,
      flightbookSectionId: (row.flightbook_section_id as string | null) ?? null,
      memoryType: row.memory_type as FlightbookMemoryType,
      title: String(row.title ?? "Stored memory"),
      content: String(row.content ?? ""),
      tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
      confidence: Number(row.confidence ?? 0),
      sourceChunkHash: (row.source_chunk_hash as string | null) ?? null,
      sectionTitle: (section as { title?: string | null } | null)?.title ?? null,
      sectionNumber: (section as { section_number?: string | null } | null)?.section_number ?? null,
      flightbookName: (flightbook as { name?: string | null } | null)?.name ?? null,
    };
  });
}

export async function retrieveFlightbookMemories(
  admin: SupabaseClient,
  input: {
    organizationId: string;
    queryText: string;
    flightbookId?: string | null;
    sectionId?: string | null;
    limit?: number;
  },
): Promise<RetrievedMemory[]> {
  const limit = input.limit ?? 5;
  let query = admin
    .from("ai_memories")
    .select(`
      id,
      flightbook_id,
      flightbook_section_id,
      memory_type,
      title,
      content,
      tags,
      confidence,
      source_chunk_hash,
      flightbook_sections ( title, section_number ),
      flightbooks ( name )
    `)
    .eq("organization_id", input.organizationId)
    .is("stale_at", null)
    .order("confidence", { ascending: false })
    .limit(Math.max(limit * 4, limit));

  if (input.flightbookId) query = query.eq("flightbook_id", input.flightbookId);
  if (input.sectionId) query = query.eq("flightbook_section_id", input.sectionId);

  const { data, error } = await query;
  if (error) {
    if (isMissingMemorySchemaError(error)) return [];
    throw error;
  }

  const words = compactWhitespace(input.queryText.toLowerCase())
    .split(/\W+/)
    .filter((word) => word.length > 2)
    .slice(0, 8);

  const memories = mapMemoryRows((data ?? []) as Record<string, unknown>[]);
  if (words.length === 0) return memories.slice(0, limit);

  return memories
    .map((memory) => {
      const haystack = `${memory.title} ${memory.content} ${memory.tags.join(" ")}`.toLowerCase();
      const matches = words.filter((word) => haystack.includes(word)).length;
      return { memory, matches };
    })
    .filter((item) => item.matches > 0)
    .sort((a, b) => b.matches - a.matches || b.memory.confidence - a.memory.confidence)
    .map((item) => item.memory)
    .slice(0, limit);
}

export async function summarizeMemoryStatus(
  admin: SupabaseClient,
  input: { organizationId: string; flightbookId: string },
): Promise<MemoryStatus> {
  const [{ data: runs, error: runError }, { count: activeMemoryCount, error: activeError }, { count: staleMemoryCount, error: staleError }] =
    await Promise.all([
      admin
        .from("ai_memory_runs")
        .select("status, error_message", { count: "exact" })
        .eq("organization_id", input.organizationId)
        .eq("flightbook_id", input.flightbookId)
        .order("created_at", { ascending: false })
        .limit(1),
      admin
        .from("ai_memories")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", input.organizationId)
        .eq("flightbook_id", input.flightbookId)
        .is("stale_at", null),
      admin
        .from("ai_memories")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", input.organizationId)
        .eq("flightbook_id", input.flightbookId)
        .not("stale_at", "is", null),
    ]);

  for (const error of [runError, activeError, staleError]) {
    if (error) {
      if (isMissingMemorySchemaError(error)) {
        return { state: "none", activeMemoryCount: 0, staleMemoryCount: 0, latestRunStatus: null, latestRunError: null };
      }
      throw error;
    }
  }

  const latestRun = runs?.[0] as { status?: string | null; error_message?: string | null } | undefined;
  const latestRunStatus = latestRun?.status ?? null;
  const stale = staleMemoryCount ?? 0;
  const active = activeMemoryCount ?? 0;
  const state: MemoryStatusState =
    latestRunStatus === "running" || latestRunStatus === "queued"
      ? "analyzing"
      : latestRunStatus === "failed"
        ? "failed"
        : stale > 0
          ? "stale"
          : active > 0
            ? "learned"
            : "none";

  return {
    state,
    activeMemoryCount: active,
    staleMemoryCount: stale,
    latestRunStatus,
    latestRunError: latestRun?.error_message ?? null,
  };
}

export async function runFlightbookMemoryAnalysis(
  admin: SupabaseClient,
  input: {
    organizationId: string;
    flightbookId: string;
    scope?: "flightbook_upload" | "manual_reanalysis" | "section_refresh";
  },
): Promise<MemoryAnalysisResult> {
  let runId: string | null = null;

  const { data: run, error: runError } = await admin
    .from("ai_memory_runs")
    .insert({
      organization_id: input.organizationId,
      flightbook_id: input.flightbookId,
      status: "running",
      scope: input.scope ?? "manual_reanalysis",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();

  if (runError) {
    if (isMissingMemorySchemaError(runError)) return { ok: false, error: "Memory schema is not installed.", runId };
    throw runError;
  }
  runId = run?.id ? String(run.id) : null;

  try {
    const { data: sections, error: sectionError } = await admin
      .from("flightbook_sections")
      .select("id, organization_id, flightbook_id, section_number, title, body, chunk_hash, metadata")
      .eq("organization_id", input.organizationId)
      .eq("flightbook_id", input.flightbookId)
      .order("sort_order", { ascending: true });

    if (sectionError) throw sectionError;

    const typedSections = (sections ?? []) as MemorySectionInput[];
    const { staleCount } = await markStaleMemoriesForSections(admin, {
      organizationId: input.organizationId,
      sections: typedSections.map((section) => ({ id: section.id, chunk_hash: section.chunk_hash })),
    });

    const sectionIds = typedSections.map((section) => section.id);
    const { data: activeExisting, error: existingError } = sectionIds.length > 0
      ? await admin
        .from("ai_memories")
        .select("flightbook_section_id, source_chunk_hash")
        .eq("organization_id", input.organizationId)
        .eq("flightbook_id", input.flightbookId)
        .is("stale_at", null)
        .in("flightbook_section_id", sectionIds)
      : { data: [], error: null };

    if (existingError) throw existingError;

    const currentMemoryKeys = new Set(
      (activeExisting ?? []).map((memory) =>
        `${memory.flightbook_section_id ?? ""}:${memory.source_chunk_hash ?? ""}`,
      ),
    );
    const sectionsNeedingMemory = typedSections.filter(
      (section) => !currentMemoryKeys.has(`${section.id}:${section.chunk_hash ?? ""}`),
    );

    const memories = sectionsNeedingMemory.flatMap(buildFallbackSectionMemories).map((memory) => ({
      ...memory,
      memory_run_id: runId,
    }));

    if (memories.length > 0) {
      const { error: insertError } = await admin.from("ai_memories").insert(memories);
      if (insertError) throw insertError;
    }

    await admin
      .from("ai_memory_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        stats: {
          sections: typedSections.length,
          skippedUnchanged: typedSections.length - sectionsNeedingMemory.length,
          inserted: memories.length,
          staleCount,
        },
      })
      .eq("id", runId);

    return { ok: true, runId, inserted: memories.length, staleCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Memory analysis failed.";
    if (runId) {
      await admin
        .from("ai_memory_runs")
        .update({ status: "failed", completed_at: new Date().toISOString(), error_message: message })
        .eq("id", runId);
    }
    return { ok: false, error: message, runId };
  }
}
