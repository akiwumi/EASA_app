import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import DeleteFlightbookButton from "@/components/flightbooks/DeleteFlightbookButton";
import DownloadFlightbookButton from "@/components/flightbooks/DownloadFlightbookButton";
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

  const admin = getSupabaseAdminClient();

  const { data: book, error: bookError } = await admin
    .from("flightbooks")
    .select("id, name, doc_type, version_label, active, created_at")
    .eq("id", id)
    .eq("organization_id", ctx.orgId)
    .maybeSingle();

  if (bookError && isMissingSchemaError(bookError)) return { auth: true as const, book: null, sections: [] };
  if (!book) return { auth: true as const, book: null, sections: [] };

  const { data: sections, error: sectionsError } = await admin
    .from("flightbook_sections")
    .select("id, section_number, title, body, sort_order")
    .eq("flightbook_id", id)
    .eq("organization_id", ctx.orgId)
    .order("sort_order");

  if (sectionsError && isMissingSchemaError(sectionsError)) {
    return { auth: true as const, book, sections: [], exports: [] };
  }

  const { data: exports, error: exportsError } = await admin
    .from("flightbook_exports")
    .select("id, version_number, change_source, created_at, note")
    .eq("flightbook_id", id)
    .eq("organization_id", ctx.orgId)
    .order("version_number", { ascending: false })
    .limit(12);

  if (exportsError && isMissingSchemaError(exportsError)) {
    return { auth: true as const, book, sections: sections ?? [], exports: [] };
  }

  return { auth: true as const, book, sections: sections ?? [], exports: exports ?? [] };
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
          <DownloadFlightbookButton id={book.id as string} />
          <DeleteFlightbookButton id={book.id as string} name={book.name as string} />
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
        <div className="easa-card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)]">
                <th className="w-28 px-4 py-3 text-left font-medium text-[var(--easa-color-text-muted)]">Section</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--easa-color-text-muted)]">Title</th>
                <th className="hidden px-4 py-3 text-left font-medium text-[var(--easa-color-text-muted)] lg:table-cell">Preview</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((sec) => (
                <tr key={sec.id} className="border-b border-[var(--easa-color-border)] last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-[var(--easa-color-text-muted)]">
                    {sec.section_number ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {sec.title ?? <span className="text-[var(--easa-color-text-muted)]">(untitled)</span>}
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <p className="max-w-[400px] truncate text-xs text-[var(--easa-color-text-muted)]">
                      {sec.body}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="easa-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Export history</h2>
            <p className="text-sm text-[var(--easa-color-text-muted)]">
              Download retained full-book versions generated after approvals or rollbacks.
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
                    {new Date(exportRow.created_at as string).toLocaleString("en-GB")} · {exportRow.change_source as string}
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
                  label="Download MD"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
