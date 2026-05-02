import { generateGroundedSearchAnswer, type GroundedSearchSource } from "@/lib/ai/grounded-search";
import { retrieveFlightbookChunks } from "@/lib/ai/retrieval";
import { getOrgAccessContext, getSupabaseAdminClient } from "@/lib/supabase/access";

export type SearchFilterOption = {
  id: string;
  label: string;
  helper?: string | null;
};

export type SearchPageData = {
  role: string;
  trainingSchemaReady: boolean;
  programmes: SearchFilterOption[];
  phases: Array<SearchFilterOption & { programmeId: string }>;
  flightbooks: Array<SearchFilterOption & { docType: string | null }>;
  documentTypes: string[];
};

export type SearchFiltersInput = {
  query: string;
  programmeId?: string | null;
  phaseId?: string | null;
  flightbookId?: string | null;
  documentType?: string | null;
  includeAnswer?: boolean;
};

type LessonLink = {
  id: string;
  title: string;
  lessonCode: string | null;
};

export type ManualSearchResult = {
  id: string;
  title: string;
  excerpt: string;
  href: string;
  score: number;
  flightbookId: string;
  flightbookName: string;
  documentType: string | null;
  sectionNumber: string | null;
  lessons: LessonLink[];
  programmes: string[];
  phases: string[];
};

export type ApprovedUpdateSearchResult = {
  id: string;
  title: string;
  excerpt: string;
  href: string;
  score: number;
  createdAt: string | null;
  flightbookId: string | null;
  flightbookName: string | null;
  documentType: string | null;
  sectionNumber: string | null;
  lessons: LessonLink[];
  programmes: string[];
  phases: string[];
  sourceLink: string | null;
};

export type SearchResponsePayload = {
  query: string;
  filters: {
    programmeId: string | null;
    phaseId: string | null;
    flightbookId: string | null;
    documentType: string | null;
  };
  answer: {
    text: string | null;
    provider: string | null;
    citations: GroundedSearchSource[];
  };
  warnings: string[];
  results: {
    manuals: ManualSearchResult[];
    approvedUpdates: ApprovedUpdateSearchResult[];
  };
};

type LessonContext = {
  lessonId: string;
  title: string;
  lessonCode: string | null;
  programmeId: string | null;
  programmeName: string | null;
  phaseId: string | null;
  phaseName: string | null;
};

function isMissingSchemaError(error: { code?: string | null; message?: string | null } | null | undefined) {
  return (
    error?.code === "PGRST205" ||
    error?.code === "42P01" ||
    /could not find the table/i.test(error?.message ?? "") ||
    /relation .* does not exist/i.test(error?.message ?? "")
  );
}

function unwrapJoin<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function buildExcerpt(text: string, query: string, limit = 240) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  const queryTokens = tokenize(query);
  const matchIndex = queryTokens
    .map((token) => normalized.toLowerCase().indexOf(token))
    .find((index) => index >= 0) ?? 0;

  const start = Math.max(0, matchIndex - 60);
  const excerpt = normalized.slice(start, start + limit);
  return `${start > 0 ? "…" : ""}${excerpt}${normalized.length > start + limit ? "…" : ""}`;
}

function keywordScore(haystack: string, query: string) {
  const normalized = haystack.toLowerCase();
  const terms = tokenize(query);
  if (!terms.length) return 0;

  let score = normalized.includes(query.toLowerCase()) ? 2 : 0;
  for (const term of terms) {
    if (normalized.includes(term)) score += 1;
  }
  return score;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}

function buildLessonContextMap(
  assignments: Array<{
    flightbookSectionId: string | null;
    lessonId: string;
    title: string;
    lessonCode: string | null;
    programmeId: string | null;
    programmeName: string | null;
    phaseId: string | null;
    phaseName: string | null;
  }>,
) {
  const map = new Map<string, LessonContext[]>();
  for (const assignment of assignments) {
    if (!assignment.flightbookSectionId) continue;
    const current = map.get(assignment.flightbookSectionId) ?? [];
    current.push({
      lessonId: assignment.lessonId,
      title: assignment.title,
      lessonCode: assignment.lessonCode,
      programmeId: assignment.programmeId,
      programmeName: assignment.programmeName,
      phaseId: assignment.phaseId,
      phaseName: assignment.phaseName,
    });
    map.set(assignment.flightbookSectionId, current);
  }
  return map;
}

async function loadLessonContextForSections(orgId: string, sectionIds: string[]) {
  if (!sectionIds.length) return new Map<string, LessonContext[]>();

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("lesson_documents")
    .select(`
      flightbook_section_id,
      training_lessons!inner (
        id,
        title,
        lesson_code,
        programme_id,
        phase_id,
        training_programmes ( name ),
        training_phases ( title )
      )
    `)
    .eq("organization_id", orgId)
    .in("flightbook_section_id", sectionIds);

  if (error && isMissingSchemaError(error)) {
    return new Map<string, LessonContext[]>();
  }

  const rows = (data ?? []).map((row) => {
    const lesson = unwrapJoin(row.training_lessons as
      | {
          id: string;
          title: string;
          lesson_code: string | null;
          programme_id: string | null;
          phase_id: string | null;
          training_programmes: { name: string | null } | { name: string | null }[] | null;
          training_phases: { title: string | null } | { title: string | null }[] | null;
        }
      | {
          id: string;
          title: string;
          lesson_code: string | null;
          programme_id: string | null;
          phase_id: string | null;
          training_programmes: { name: string | null } | { name: string | null }[] | null;
          training_phases: { title: string | null } | { title: string | null }[] | null;
        }[]
      | null);

    const programme = unwrapJoin(lesson?.training_programmes);
    const phase = unwrapJoin(lesson?.training_phases);

    return {
      flightbookSectionId: (row.flightbook_section_id as string | null) ?? null,
      lessonId: String(lesson?.id ?? ""),
      title: String(lesson?.title ?? "Lesson"),
      lessonCode: (lesson?.lesson_code as string | null) ?? null,
      programmeId: (lesson?.programme_id as string | null) ?? null,
      programmeName: (programme?.name as string | null) ?? null,
      phaseId: (lesson?.phase_id as string | null) ?? null,
      phaseName: (phase?.title as string | null) ?? null,
    };
  }).filter((row) => row.flightbookSectionId && row.lessonId);

  return buildLessonContextMap(rows);
}

function matchesLessonFilters(
  contexts: LessonContext[],
  filters: { programmeId?: string | null; phaseId?: string | null },
) {
  if (!filters.programmeId && !filters.phaseId) return true;
  if (!contexts.length) return false;

  return contexts.some((context) => {
    if (filters.programmeId && context.programmeId !== filters.programmeId) return false;
    if (filters.phaseId && context.phaseId !== filters.phaseId) return false;
    return true;
  });
}

export async function loadSearchPageData(): Promise<SearchPageData | null> {
  const ctx = await getOrgAccessContext();
  if (!ctx) return null;

  const admin = getSupabaseAdminClient();
  const [{ data: programmes, error: programmesError }, { data: phases, error: phasesError }, { data: flightbooks, error: flightbooksError }] =
    await Promise.all([
      admin
        .from("training_programmes")
        .select("id, code, name")
        .eq("organization_id", ctx.orgId)
        .order("name"),
      admin
        .from("training_phases")
        .select("id, programme_id, title")
        .eq("organization_id", ctx.orgId)
        .order("sort_order"),
      admin
        .from("flightbooks")
        .select("id, name, doc_type")
        .eq("organization_id", ctx.orgId)
        .order("name"),
    ]);

  const trainingSchemaReady = !(programmesError && isMissingSchemaError(programmesError)) &&
    !(phasesError && isMissingSchemaError(phasesError));

  return {
    role: ctx.role,
    trainingSchemaReady,
    programmes: (programmes ?? []).map((programme) => ({
      id: String(programme.id),
      label: `${programme.code ? `${programme.code} · ` : ""}${programme.name as string}`,
    })),
    phases: (phases ?? []).map((phase) => ({
      id: String(phase.id),
      programmeId: String(phase.programme_id),
      label: String(phase.title),
    })),
    flightbooks: (flightbooksError && isMissingSchemaError(flightbooksError))
      ? []
      : (flightbooks ?? []).map((flightbook) => ({
          id: String(flightbook.id),
          label: String(flightbook.name),
          docType: (flightbook.doc_type as string | null) ?? null,
        })),
    documentTypes: uniqueStrings((flightbooks ?? []).map((flightbook) => flightbook.doc_type as string | null)).sort(),
  };
}

async function searchManualSections(orgId: string, filters: SearchFiltersInput): Promise<ManualSearchResult[]> {
  const admin = getSupabaseAdminClient();
  const chunks = await retrieveFlightbookChunks(admin, {
    organizationId: orgId,
    queryText: filters.query,
    limit: 10,
    minSimilarity: 0.15,
    flightbookId: filters.flightbookId ?? null,
  });

  if (!chunks.length) return [];

  const { data: sections, error } = await admin
    .from("flightbook_sections")
    .select(`
      id,
      flightbook_id,
      section_number,
      title,
      flightbooks!inner (
        id,
        name,
        doc_type
      )
    `)
    .eq("organization_id", orgId)
    .in("id", chunks.map((chunk) => chunk.id));

  if (error && isMissingSchemaError(error)) return [];

  const sectionMeta = new Map(
    (sections ?? []).map((row) => {
      const flightbook = unwrapJoin(row.flightbooks as
        | { id: string; name: string; doc_type: string | null }
        | { id: string; name: string; doc_type: string | null }[]
        | null);
      return [
        String(row.id),
        {
          flightbookId: String(flightbook?.id ?? row.flightbook_id ?? ""),
          flightbookName: String(flightbook?.name ?? "Flight book"),
          documentType: (flightbook?.doc_type as string | null) ?? null,
          sectionNumber: (row.section_number as string | null) ?? null,
          sectionTitle: (row.title as string | null) ?? null,
        },
      ];
    }),
  );

  const lessonContextBySection = await loadLessonContextForSections(orgId, chunks.map((chunk) => chunk.id));

  return chunks
    .map((chunk) => {
      const meta = sectionMeta.get(chunk.id);
      if (!meta?.flightbookId) return null;

      const contexts = lessonContextBySection.get(chunk.id) ?? [];
      if (filters.documentType && meta.documentType !== filters.documentType) return null;
      if (!matchesLessonFilters(contexts, filters)) return null;

      const lessons = uniqueStrings(contexts.map((context) => context.lessonId)).map((lessonId) => {
        const lesson = contexts.find((context) => context.lessonId === lessonId)!;
        return {
          id: lessonId,
          title: lesson.title,
          lessonCode: lesson.lessonCode,
        };
      });

      return {
        id: chunk.id,
        title: meta.sectionTitle ?? chunk.title ?? "Untitled section",
        excerpt: buildExcerpt(chunk.body, filters.query),
        href: `/flightbooks/${meta.flightbookId}`,
        score: Number(chunk.score.toFixed(3)),
        flightbookId: meta.flightbookId,
        flightbookName: meta.flightbookName,
        documentType: meta.documentType,
        sectionNumber: meta.sectionNumber ?? chunk.sectionNumber ?? null,
        lessons,
        programmes: uniqueStrings(contexts.map((context) => context.programmeName)),
        phases: uniqueStrings(contexts.map((context) => context.phaseName)),
      } satisfies ManualSearchResult;
    })
    .filter((result): result is ManualSearchResult => Boolean(result))
    .sort((a, b) => b.score - a.score);
}

async function searchApprovedUpdates(orgId: string, filters: SearchFiltersInput): Promise<ApprovedUpdateSearchResult[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("proposed_updates")
    .select(`
      id,
      ai_rationale,
      ai_suggested_text,
      created_at,
      flightbook_section_id,
      flightbook_sections (
        id,
        flightbook_id,
        section_number,
        title,
        flightbooks (
          id,
          name,
          doc_type
        )
      ),
      reg_changes (
        section_ref,
        diff_text,
        ai_findings (
          summary,
          rss_items (
            title,
            summary,
            link
          )
        )
      )
    `)
    .eq("organization_id", orgId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(80);

  if (error && isMissingSchemaError(error)) {
    return [];
  }

  const sectionIds = uniqueStrings((data ?? []).map((row) => row.flightbook_section_id as string | null));
  const lessonContextBySection = await loadLessonContextForSections(orgId, sectionIds);

  return (data ?? [])
    .map((row) => {
      const section = unwrapJoin(row.flightbook_sections as
        | {
            id: string;
            flightbook_id: string | null;
            section_number: string | null;
            title: string | null;
            flightbooks:
              | { id: string; name: string; doc_type: string | null }
              | { id: string; name: string; doc_type: string | null }[]
              | null;
          }
        | {
            id: string;
            flightbook_id: string | null;
            section_number: string | null;
            title: string | null;
            flightbooks:
              | { id: string; name: string; doc_type: string | null }
              | { id: string; name: string; doc_type: string | null }[]
              | null;
          }[]
        | null);
      const flightbook = unwrapJoin(section?.flightbooks);
      const regChange = unwrapJoin(row.reg_changes as
        | {
            section_ref: string | null;
            diff_text: string | null;
            ai_findings:
              | {
                  summary: string | null;
                  rss_items:
                    | { title: string | null; summary: string | null; link: string | null }
                    | { title: string | null; summary: string | null; link: string | null }[]
                    | null;
                }
              | {
                  summary: string | null;
                  rss_items:
                    | { title: string | null; summary: string | null; link: string | null }
                    | { title: string | null; summary: string | null; link: string | null }[]
                    | null;
                }[]
              | null;
          }
        | {
            section_ref: string | null;
            diff_text: string | null;
            ai_findings:
              | {
                  summary: string | null;
                  rss_items:
                    | { title: string | null; summary: string | null; link: string | null }
                    | { title: string | null; summary: string | null; link: string | null }[]
                    | null;
                }
              | {
                  summary: string | null;
                  rss_items:
                    | { title: string | null; summary: string | null; link: string | null }
                    | { title: string | null; summary: string | null; link: string | null }[]
                    | null;
                }[]
              | null;
          }[]
        | null);
      const finding = unwrapJoin(regChange?.ai_findings);
      const rss = unwrapJoin(finding?.rss_items);

      const combinedText = [
        rss?.title,
        rss?.summary,
        finding?.summary,
        regChange?.diff_text,
        row.ai_rationale,
        row.ai_suggested_text,
        section?.title,
      ].filter(Boolean).join("\n");
      const score = keywordScore(combinedText, filters.query);
      if (score <= 0) return null;

      const contexts = row.flightbook_section_id
        ? (lessonContextBySection.get(String(row.flightbook_section_id)) ?? [])
        : [];

      const currentFlightbookId = (flightbook?.id as string | null) ?? (section?.flightbook_id as string | null) ?? null;
      const currentDocType = (flightbook?.doc_type as string | null) ?? null;

      if (filters.flightbookId && currentFlightbookId !== filters.flightbookId) return null;
      if (filters.documentType && currentDocType !== filters.documentType) return null;
      if (!matchesLessonFilters(contexts, filters)) return null;

      const lessons = uniqueStrings(contexts.map((context) => context.lessonId)).map((lessonId) => {
        const lesson = contexts.find((context) => context.lessonId === lessonId)!;
        return {
          id: lessonId,
          title: lesson.title,
          lessonCode: lesson.lessonCode,
        };
      });

      return {
        id: String(row.id),
        title: (rss?.title as string | null) ?? (row.ai_rationale as string | null) ?? "Approved update",
        excerpt: buildExcerpt(
          String(row.ai_suggested_text ?? row.ai_rationale ?? regChange?.diff_text ?? finding?.summary ?? ""),
          filters.query,
        ),
        href: `/updates/${row.id as string}`,
        score,
        createdAt: (row.created_at as string | null) ?? null,
        flightbookId: currentFlightbookId,
        flightbookName: (flightbook?.name as string | null) ?? null,
        documentType: currentDocType,
        sectionNumber: (section?.section_number as string | null) ?? (regChange?.section_ref as string | null) ?? null,
        lessons,
        programmes: uniqueStrings(contexts.map((context) => context.programmeName)),
        phases: uniqueStrings(contexts.map((context) => context.phaseName)),
        sourceLink: (rss?.link as string | null) ?? null,
      } satisfies ApprovedUpdateSearchResult;
    })
    .filter((result): result is ApprovedUpdateSearchResult => Boolean(result))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

export async function runSearch(filters: SearchFiltersInput): Promise<SearchResponsePayload | { error: string; status: number }> {
  const ctx = await getOrgAccessContext();
  if (!ctx) {
    return { error: "Unauthorized", status: 401 };
  }

  const query = filters.query.trim();
  if (query.length < 2) {
    return {
      query,
      filters: {
        programmeId: filters.programmeId ?? null,
        phaseId: filters.phaseId ?? null,
        flightbookId: filters.flightbookId ?? null,
        documentType: filters.documentType ?? null,
      },
      answer: { text: null, provider: null, citations: [] },
      warnings: ["Enter at least two characters to search stored manuals and approved updates."],
      results: { manuals: [], approvedUpdates: [] },
    };
  }

  const [manuals, approvedUpdates] = await Promise.all([
    searchManualSections(ctx.orgId, filters),
    searchApprovedUpdates(ctx.orgId, filters),
  ]);

  const citations: GroundedSearchSource[] = [
    ...manuals.slice(0, 4).map((result) => ({
      kind: "manual" as const,
      label: `${result.flightbookName}${result.sectionNumber ? ` · ${result.sectionNumber}` : ""}`,
      secondaryLabel: result.title,
      href: result.href,
      excerpt: result.excerpt,
    })),
    ...approvedUpdates.slice(0, 4).map((result) => ({
      kind: "approved_update" as const,
      label: result.title,
      secondaryLabel: result.flightbookName
        ? `${result.flightbookName}${result.sectionNumber ? ` · ${result.sectionNumber}` : ""}`
        : result.sectionNumber,
      href: result.href,
      excerpt: result.excerpt,
    })),
  ];

  const warnings: string[] = [];
  const admin = getSupabaseAdminClient();
  const answerResult = filters.includeAnswer === false
    ? { answer: null, provider: null, warning: undefined }
    : await generateGroundedSearchAnswer(admin, ctx.orgId, query, citations);

  if ("warning" in answerResult && answerResult.warning) {
    warnings.push(answerResult.warning);
  }
  if (!manuals.length && !approvedUpdates.length) {
    warnings.push("No stored manual sections or approved updates matched this query with the current filters.");
  }

  return {
    query,
    filters: {
      programmeId: filters.programmeId ?? null,
      phaseId: filters.phaseId ?? null,
      flightbookId: filters.flightbookId ?? null,
      documentType: filters.documentType ?? null,
    },
    answer: {
      text: answerResult.answer,
      provider: answerResult.provider,
      citations,
    },
    warnings,
    results: {
      manuals,
      approvedUpdates,
    },
  };
}
