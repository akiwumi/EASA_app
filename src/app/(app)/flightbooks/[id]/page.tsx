import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import FlightbookDetailClient from "@/components/flightbooks/FlightbookDetailClient";
import DeleteFlightbookButton from "@/components/flightbooks/DeleteFlightbookButton";
import DownloadFlightbookButton from "@/components/flightbooks/DownloadFlightbookButton";
import SaveFlightbookVersionButton from "@/components/flightbooks/SaveFlightbookVersionButton";
import { getOrgAccessContext, getSupabaseAdminClient } from "@/lib/supabase/access";

function isMissingSchemaError(error: { code?: string | null; message?: string | null }) {
  return (
    error.code === "PGRST205" ||
    /could not find the table/i.test(error.message ?? "") ||
    /relation .* does not exist/i.test(error.message ?? "")
  );
}

async function loadBook(id: string) {
  const ctx = await getOrgAccessContext();
  if (!ctx) return { auth: false as const, book: null, sections: [] };
  const canManage = ["admin", "editor", "compliance_manager"].includes(ctx.role);

  const admin = getSupabaseAdminClient();

  const primaryBook = await admin
    .from("flightbooks")
    .select("id, name, doc_type, version_label, aircraft, manual_group, effective_date, import_notes, tags, active, created_at")
    .eq("id", id)
    .eq("organization_id", ctx.orgId)
    .maybeSingle();

  let book = primaryBook.data as
    | {
        id: string;
        name: string;
        doc_type: string;
        version_label: string | null;
        aircraft: string | null;
        manual_group: string | null;
        effective_date: string | null;
        import_notes: string | null;
        tags: string[] | null;
        active: boolean;
        created_at: string;
      }
    | null;
  let metadataReady = true;
  let bookError = primaryBook.error;

  if (bookError && /column .* does not exist/i.test(bookError.message ?? "")) {
    metadataReady = false;
    const fallbackBook = await admin
      .from("flightbooks")
      .select("id, name, doc_type, version_label, active, created_at")
      .eq("id", id)
      .eq("organization_id", ctx.orgId)
      .maybeSingle();
    book = fallbackBook.data
      ? {
          ...fallbackBook.data,
          aircraft: null,
          manual_group: null,
          effective_date: null,
          import_notes: null,
          tags: [],
        }
      : null;
    bookError = fallbackBook.error;
  }

  if (bookError && isMissingSchemaError(bookError)) return { auth: true as const, book: null, sections: [] };
  if (!book) return { auth: true as const, book: null, sections: [] };

  const { data: sections, error: sectionsError } = await admin
    .from("flightbook_sections")
    .select("id, section_number, title, body, sort_order")
    .eq("flightbook_id", id)
    .eq("organization_id", ctx.orgId)
    .order("sort_order");

  if (sectionsError && isMissingSchemaError(sectionsError)) {
    return { auth: true as const, book, sections: [], exports: [], canManage };
  }

  const lessonDocsResult = await admin
    .from("lesson_documents")
    .select(`
      id,
      required,
      lesson_id,
      flightbook_section_id,
      training_lessons ( id, title, lesson_code )
    `)
    .eq("organization_id", ctx.orgId)
    .eq("flightbook_id", id);

  const lessonIds = Array.from(
    new Set((lessonDocsResult.data ?? []).map((row) => row.lesson_id).filter(Boolean)),
  ) as string[];

  const assignmentsResult = lessonIds.length
    ? await admin
        .from("document_assignments")
        .select("lesson_id, status")
        .eq("organization_id", ctx.orgId)
        .in("lesson_id", lessonIds)
    : { data: [], error: null };

  const commentsResult = await admin
    .from("flightbook_section_comments")
    .select("id, flightbook_section_id, author_id, body, created_at")
    .eq("organization_id", ctx.orgId)
    .order("created_at", { ascending: false });

  const commentsReady = !(
    commentsResult.error &&
    (isMissingSchemaError(commentsResult.error) || /column .* does not exist/i.test(commentsResult.error.message ?? ""))
  );

  const authorIds = Array.from(
    new Set((commentsResult.data ?? []).map((row) => row.author_id).filter(Boolean)),
  ) as string[];

  const profilesResult = authorIds.length
    ? await admin
        .from("user_profiles")
        .select("id, display_name")
        .in("id", authorIds)
    : { data: [], error: null };

  const { data: exports, error: exportsError } = await admin
    .from("flightbook_exports")
    .select("id, version_number, change_source, created_at, note")
    .eq("flightbook_id", id)
    .eq("organization_id", ctx.orgId)
    .order("version_number", { ascending: false })
    .limit(12);

  if (exportsError && isMissingSchemaError(exportsError)) {
    return {
      auth: true as const,
      book,
      sections: sections ?? [],
      exports: [],
      metadataReady,
      sectionUsage: [],
      commentsReady,
      canManage,
    };
  }

  const lessonsBySection = new Map<
    string,
    { id: string; title: string; lesson_code: string | null; required: boolean }[]
  >();

  for (const row of lessonDocsResult.data ?? []) {
    if (!row.flightbook_section_id) continue;
    const lessonValue = Array.isArray(row.training_lessons)
      ? row.training_lessons[0]
      : row.training_lessons;
    if (!lessonValue) continue;
    const current = lessonsBySection.get(row.flightbook_section_id) ?? [];
    current.push({
      id: lessonValue.id as string,
      title: lessonValue.title as string,
      lesson_code: (lessonValue.lesson_code as string | null) ?? null,
      required: Boolean(row.required),
    });
    lessonsBySection.set(row.flightbook_section_id, current);
  }

  const assignmentsByLesson = new Map<string, { status: string }[]>();
  for (const row of assignmentsResult.data ?? []) {
    const current = assignmentsByLesson.get(row.lesson_id as string) ?? [];
    current.push({ status: String(row.status) });
    assignmentsByLesson.set(row.lesson_id as string, current);
  }

  const profileMap = new Map((profilesResult.data ?? []).map((profile) => [profile.id as string, profile.display_name as string | null]));
  const commentsBySection = new Map<string, { id: string; body: string; created_at: string; authorName: string | null }[]>();
  for (const row of commentsResult.data ?? []) {
    const current = commentsBySection.get(row.flightbook_section_id as string) ?? [];
    current.push({
      id: row.id as string,
      body: row.body as string,
      created_at: row.created_at as string,
      authorName: row.author_id ? profileMap.get(row.author_id as string) ?? null : null,
    });
    commentsBySection.set(row.flightbook_section_id as string, current);
  }

  const sectionUsage = (sections ?? []).map((section) => {
    const linkedLessons = lessonsBySection.get(section.id as string) ?? [];
    const lessonIdsForSection = linkedLessons.map((lesson) => lesson.id);
    const assignmentCount = lessonIdsForSection.reduce(
      (sum, lessonId) => sum + (assignmentsByLesson.get(lessonId)?.length ?? 0),
      0,
    );
    const pendingAssignmentCount = lessonIdsForSection.reduce(
      (sum, lessonId) =>
        sum +
        (assignmentsByLesson.get(lessonId)?.filter((assignment) => assignment.status === "assigned" || assignment.status === "pending").length ?? 0),
      0,
    );
    return {
      id: section.id as string,
      section_number: (section.section_number as string | null) ?? null,
      title: (section.title as string | null) ?? null,
      body: section.body as string,
      linkedLessons,
      assignmentCount,
      pendingAssignmentCount,
      comments: commentsBySection.get(section.id as string) ?? [],
    };
  });

  return {
    auth: true as const,
    book,
    sections: sections ?? [],
    exports: exports ?? [],
    metadataReady,
    sectionUsage,
    commentsReady,
    canManage,
  };
}

export default async function FlightbookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadBook(id);
  if (!data.auth) {
    redirect("/login");
  }
  if (!data.book) notFound();

  const { book, sections, exports } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--easa-color-text-muted)]">
            <Link href="/flightbooks" className="hover:underline">Flight books</Link>
            <span>›</span>
            <span>{book.doc_type}</span>
          </div>
          <h1 className="mt-1 text-xl font-semibold">{book.name}</h1>
          <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
            {sections.length} section{sections.length !== 1 ? "s" : ""}
            {book.version_label ? ` · ${book.version_label}` : ""}
            {" · "}
            <span className={book.active ? "text-[var(--easa-color-accent-green)]" : "text-[var(--easa-color-text-muted)]"}>
              {book.active ? "Active" : "Inactive"}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/flightbooks/upload`} className="easa-btn secondary text-sm">
            Re-import
          </Link>
          {data.canManage && <SaveFlightbookVersionButton id={book.id as string} />}
          <DownloadFlightbookButton id={book.id as string} />
          {data.canManage && <DeleteFlightbookButton id={book.id as string} name={book.name as string} />}
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="easa-card p-10 text-center">
          <p className="text-sm font-medium">No sections imported yet</p>
          <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
            Upload a PDF, TXT, or MD file on the upload page, then select this book.
          </p>
          <Link href="/flightbooks/upload" className="easa-btn primary mt-4 inline-flex">
            Upload content
          </Link>
        </div>
      ) : (
        <FlightbookDetailClient
          book={{
            id: book.id as string,
            name: book.name as string,
            doc_type: book.doc_type as string,
            version_label: (book.version_label as string | null) ?? null,
            aircraft: (book.aircraft as string | null) ?? null,
            manual_group: (book.manual_group as string | null) ?? null,
            effective_date: (book.effective_date as string | null) ?? null,
            import_notes: (book.import_notes as string | null) ?? null,
            tags: Array.isArray(book.tags) ? (book.tags as string[]) : [],
            active: Boolean(book.active),
          }}
          sections={data.sectionUsage ?? []}
          canManage={Boolean(data.canManage)}
          metadataReady={Boolean(data.metadataReady)}
          commentsReady={Boolean(data.commentsReady)}
        />
      )}

      <div className="easa-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Export history</h2>
            <p className="text-sm text-[var(--easa-color-text-muted)]">
              Download retained full-book versions generated after approvals, rollbacks, or manual saves.
            </p>
          </div>
          <span className="easa-badge is-blue">
            {exports.length} version{exports.length !== 1 ? "s" : ""}
          </span>
        </div>

        {exports.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--easa-color-text-muted)]">
            No retained full-book exports yet. Approving an update or rolling back a section will generate one automatically.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {exports.map((exportRow) => (
              <div
                key={exportRow.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    Full-book export v{String(exportRow.version_number).padStart(4, "0")}
                  </p>
                  <p className="text-xs text-[var(--easa-color-text-muted)]">
                    Rev {String(exportRow.version_number).padStart(4, "0")} · {new Date(exportRow.created_at as string).toLocaleString("en-GB")} · {exportRow.change_source as string}
                  </p>
                  {(exportRow.note as string | null) && (
                    <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
                      {exportRow.note as string}
                    </p>
                  )}
                </div>
                <DownloadFlightbookButton
                  id={book.id as string}
                  exportId={exportRow.id as string}
                  label="Download Word"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
