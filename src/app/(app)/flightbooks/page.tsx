import { redirect } from "next/navigation";
import FlightbooksBrowser from "@/components/flightbooks/FlightbooksBrowser";
import { getOrgAccessContext, getSupabaseAdminClient } from "@/lib/supabase/access";
import type { FlightbookSummary } from "@/lib/types/domain";

type BaseFlightbookRow = Omit<FlightbookSummary, "sectionCount" | "linkedLessonCount" | "pendingAssignmentCount">;

function isMissingSchemaError(error: { code?: string | null; message?: string | null }) {
  return (
    error.code === "PGRST205" ||
    /could not find the table/i.test(error.message ?? "") ||
    /relation .* does not exist/i.test(error.message ?? "")
  );
}

async function loadBooks() {
  const ctx = await getOrgAccessContext();
  if (!ctx) return null;

  const admin = getSupabaseAdminClient();

  const primaryQuery = await admin
    .from("flightbooks")
    .select("id, name, doc_type, version_label, aircraft, manual_group, effective_date, import_notes, tags, active, created_at, file_ref, file_size_bytes, file_content_type")
    .eq("organization_id", ctx.orgId)
    .order("created_at", { ascending: false });

  const books = primaryQuery.data;
  const booksError = primaryQuery.error;

  if (booksError && /column .* does not exist/i.test(booksError.message ?? "")) {
    const fallback = await admin
      .from("flightbooks")
      .select("id, name, doc_type, version_label, active, created_at")
      .eq("organization_id", ctx.orgId)
      .order("created_at", { ascending: false });

    if (fallback.error && isMissingSchemaError(fallback.error)) return [];
    if (!fallback.data?.length) return [];

    const normalized = fallback.data.map((row) => ({
      ...row,
      aircraft: null,
      manual_group: null,
      effective_date: null,
      import_notes: null,
      tags: [],
      file_ref: null,
      file_size_bytes: null,
      file_content_type: null,
    }));
    return enrichBooks(admin, ctx.orgId, normalized as BaseFlightbookRow[]);
  }

  if (booksError && isMissingSchemaError(booksError)) return [];
  if (!books?.length) return [];
  return enrichBooks(admin, ctx.orgId, books as BaseFlightbookRow[]);
}

async function enrichBooks(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  orgId: string,
  books: BaseFlightbookRow[],
): Promise<FlightbookSummary[]> {
  const { data: counts, error: countsError } = await admin
    .from("flightbook_sections")
    .select("flightbook_id")
    .in("flightbook_id", books.map((b) => b.id));

  const lessonDocsResult = await admin
    .from("lesson_documents")
    .select("flightbook_id, lesson_id")
    .eq("organization_id", orgId)
    .in("flightbook_id", books.map((b) => b.id));

  const assignmentLessons = Array.from(
    new Set((lessonDocsResult.data ?? []).map((row) => row.lesson_id).filter(Boolean)),
  ) as string[];

  const assignmentsResult = assignmentLessons.length
    ? await admin
        .from("document_assignments")
        .select("lesson_id, status")
        .eq("organization_id", orgId)
        .in("lesson_id", assignmentLessons)
    : { data: [], error: null };

  if (countsError && isMissingSchemaError(countsError)) {
    return books.map((b) => ({ ...b, sectionCount: 0 }));
  }

  const countMap = new Map<string, number>();
  for (const row of counts ?? []) {
    countMap.set(row.flightbook_id, (countMap.get(row.flightbook_id) ?? 0) + 1);
  }

  const lessonCountMap = new Map<string, Set<string>>();
  for (const row of lessonDocsResult.data ?? []) {
    if (!row.flightbook_id || !row.lesson_id) continue;
    const current = lessonCountMap.get(row.flightbook_id) ?? new Set<string>();
    current.add(row.lesson_id);
    lessonCountMap.set(row.flightbook_id, current);
  }

  const assignmentRowsByLesson = new Map<string, { status: string }[]>();
  for (const row of assignmentsResult.data ?? []) {
    const current = assignmentRowsByLesson.get(row.lesson_id as string) ?? [];
    current.push({ status: String(row.status) });
    assignmentRowsByLesson.set(row.lesson_id as string, current);
  }

  return books.map((book) => {
    const lessonIds = Array.from(lessonCountMap.get(book.id) ?? []);
    const pendingAssignmentCount = lessonIds.reduce((sum, lessonId) => {
      const assignments = assignmentRowsByLesson.get(lessonId) ?? [];
      return sum + assignments.filter((assignment) => assignment.status === "assigned" || assignment.status === "pending").length;
    }, 0);

    return {
      ...book,
      aircraft: book.aircraft ?? null,
      manual_group: book.manual_group ?? null,
      effective_date: book.effective_date ?? null,
      import_notes: book.import_notes ?? null,
      tags: Array.isArray(book.tags) ? book.tags : [],
      file_ref: (book as { file_ref?: string | null }).file_ref ?? null,
      file_size_bytes: (book as { file_size_bytes?: number | null }).file_size_bytes ?? null,
      file_content_type: (book as { file_content_type?: string | null }).file_content_type ?? null,
      sectionCount: countMap.get(book.id) ?? 0,
      linkedLessonCount: lessonIds.length,
      pendingAssignmentCount,
    };
  });
}

export default async function FlightbooksPage() {
  const books = await loadBooks();
  if (books === null) {
    redirect("/login");
  }
  return <FlightbooksBrowser books={books} />;
}
