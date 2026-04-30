import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { notFound } from "next/navigation";

function isMissingSchemaError(error: { code?: string | null; message?: string | null }) {
  return (
    error.code === "PGRST205" ||
    /could not find the table/i.test(error.message ?? "") ||
    /relation .* does not exist/i.test(error.message ?? "")
  );
}

async function loadBook(id: string) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: book, error: bookError } = await admin
    .from("flightbooks")
    .select("id, name, doc_type, version_label, active, created_at")
    .eq("id", id)
    .maybeSingle();

  if (bookError && isMissingSchemaError(bookError)) return null;
  if (!book) return null;

  const { data: sections, error: sectionsError } = await admin
    .from("flightbook_sections")
    .select("id, section_number, title, body, sort_order")
    .eq("flightbook_id", id)
    .order("sort_order");

  if (sectionsError && isMissingSchemaError(sectionsError)) {
    return { book, sections: [] };
  }

  return { book, sections: sections ?? [] };
}

export default async function FlightbookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadBook(id);
  if (!data) notFound();

  const { book, sections } = data;

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
        <Link href={`/flightbooks/upload`} className="easa-btn secondary text-sm">
          Re-import
        </Link>
      </div>

      {sections.length === 0 ? (
        <div className="easa-card p-10 text-center">
          <p className="text-sm font-medium">No sections imported yet</p>
          <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
            Upload a PDF or text file on the upload page, then select this book.
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
    </div>
  );
}
