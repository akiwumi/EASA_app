"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Upload, CheckCircle, XCircle, FileText, ArrowDownUp } from "lucide-react";
import DeleteFlightbookButton from "@/components/flightbooks/DeleteFlightbookButton";
import DownloadFlightbookButton from "@/components/flightbooks/DownloadFlightbookButton";
import type { FlightbookExportSummary, FlightbookSummary } from "@/lib/types/domain";

interface Props {
  books: FlightbookSummary[];
}

type SortOrder = "newest" | "oldest";

type GeneratedCopy = FlightbookExportSummary & {
  flightbookId: string;
  flightbookName: string;
  docType: string;
};

function sortByDate<T>(items: T[], order: SortOrder, getDate: (item: T) => string) {
  return [...items].sort((a, b) => {
    const diff = new Date(a ? getDate(a) : 0).getTime() - new Date(b ? getDate(b) : 0).getTime();
    return order === "newest" ? -diff : diff;
  });
}

export default function FlightbooksBrowser({ books }: Props) {
  const [originalSort, setOriginalSort] = useState<SortOrder>("newest");
  const [generatedSort, setGeneratedSort] = useState<SortOrder>("newest");

  const sortedBooks = useMemo(
    () => sortByDate(books, originalSort, (book) => book.created_at),
    [books, originalSort],
  );

  const generatedCopies = useMemo<GeneratedCopy[]>(
    () =>
      sortByDate(
        books.flatMap((book) =>
          (book.generatedCopies ?? []).map((copy) => ({
            ...copy,
            flightbookId: book.id,
            flightbookName: book.name,
            docType: book.doc_type,
          })),
        ),
        generatedSort,
        (copy) => copy.created_at,
      ),
    [books, generatedSort],
  );

  if (books.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Flight books</h1>
          <Link className="easa-btn primary flex items-center gap-2 text-sm" href="/flightbooks/upload">
            <Upload size={15} strokeWidth={1.75} /> Upload
          </Link>
        </div>
        <div className="easa-card p-10 text-center">
          <BookOpen size={36} strokeWidth={1.25} className="mx-auto text-[var(--easa-color-text-muted)]" />
          <p className="mt-3 text-sm font-medium">No flight books yet</p>
          <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
            Upload a PDF, TXT, MD, or JSON file to import your first flight book.
          </p>
          <Link className="easa-btn primary mt-4 inline-flex items-center gap-2" href="/flightbooks/upload">
            <Upload size={15} strokeWidth={1.75} /> Upload flight book
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Flight books</h1>
          <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
            {books.length} document{books.length !== 1 ? "s" : ""} · {books.reduce((s, b) => s + b.sectionCount, 0)} total sections indexed for AI comparison
          </p>
        </div>
        <Link className="easa-btn primary flex items-center gap-2 text-sm" href="/flightbooks/upload">
          <Upload size={15} strokeWidth={1.75} /> Upload
        </Link>
      </div>

      {generatedCopies.length > 0 && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Created flight books</h2>
              <p className="text-sm text-[var(--easa-color-text-muted)]">
                Date-stamped copies generated after approved updates.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-[var(--easa-color-text-muted)]">
              <ArrowDownUp size={14} strokeWidth={1.75} />
              <select
                className="easa-input py-1.5 text-sm"
                value={generatedSort}
                onChange={(event) => setGeneratedSort(event.target.value as SortOrder)}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {generatedCopies.map((copy) => (
              <div
                key={copy.id}
                className="easa-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText size={16} strokeWidth={1.75} className="text-[var(--easa-color-brand-primary)]" />
                      <p className="truncate text-sm font-semibold">{copy.flightbookName}</p>
                    </div>
                    <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
                      v{String(copy.version_number).padStart(4, "0")} · {new Date(copy.created_at).toLocaleString("en-GB")}
                    </p>
                    <p className="mt-1 text-xs capitalize text-[var(--easa-color-text-muted)]">
                      {copy.change_source.replace(/_/g, " ")} · {copy.docType}
                    </p>
                  </div>
                  <DownloadFlightbookButton id={copy.flightbookId} exportId={copy.id} compact />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Original flight books</h2>
            <p className="text-sm text-[var(--easa-color-text-muted)]">
              Uploaded source books parsed into indexed sections.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--easa-color-text-muted)]">
            <ArrowDownUp size={14} strokeWidth={1.75} />
            <select
              className="easa-input py-1.5 text-sm"
              value={originalSort}
              onChange={(event) => setOriginalSort(event.target.value as SortOrder)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
        </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sortedBooks.map((book) => (
          <div
            key={book.id}
            className="easa-card p-5 transition hover:shadow-[var(--easa-shadow-2)]"
          >
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/flightbooks/${book.id}`}
                className="min-w-0 flex-1"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--easa-color-surface-2)]">
                    <BookOpen size={18} strokeWidth={1.75} className="text-[var(--easa-color-brand-primary)]" />
                  </div>
                  {book.active
                    ? <CheckCircle size={15} strokeWidth={1.75} className="mt-0.5 shrink-0 text-[var(--easa-color-accent-green)]" />
                    : <XCircle size={15} strokeWidth={1.75} className="mt-0.5 shrink-0 text-[var(--easa-color-text-muted)]" />}
                </div>

                <p className="mt-3 font-semibold leading-tight">{book.name}</p>
                <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                  <span className="rounded-full bg-[var(--easa-color-surface-2)] px-2 py-0.5 font-medium">{book.doc_type}</span>
                  {book.version_label && (
                    <span className="rounded-full bg-[var(--easa-color-surface-2)] px-2 py-0.5 text-[var(--easa-color-text-muted)]">{book.version_label}</span>
                  )}
                  {book.manual_group && (
                    <span className="rounded-full bg-[var(--easa-color-surface-2)] px-2 py-0.5 text-[var(--easa-color-text-muted)]">{book.manual_group}</span>
                  )}
                </div>

                {(book.aircraft || book.tags.length > 0) && (
                  <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                    {book.aircraft && (
                      <span className="rounded-full bg-[color-mix(in_srgb,var(--easa-color-accent-blue)_12%,transparent)] px-2 py-0.5 text-[var(--easa-color-accent-blue)]">
                        {book.aircraft}
                      </span>
                    )}
                    {book.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-full bg-[var(--easa-color-surface-2)] px-2 py-0.5 text-[var(--easa-color-text-muted)]">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between text-xs text-[var(--easa-color-text-muted)]">
                  <span>{book.sectionCount} section{book.sectionCount !== 1 ? "s" : ""}</span>
                  <span>{new Date(book.created_at).toLocaleDateString()}</span>
                </div>

                {(book.linkedLessonCount || book.pendingAssignmentCount) && (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="easa-badge is-blue">
                      {book.linkedLessonCount ?? 0} linked lesson{(book.linkedLessonCount ?? 0) !== 1 ? "s" : ""}
                    </span>
                    <span className={`easa-badge ${(book.pendingAssignmentCount ?? 0) > 0 ? "is-orange" : "is-muted"}`}>
                      {book.pendingAssignmentCount ?? 0} pending assignment{(book.pendingAssignmentCount ?? 0) !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}

                {book.sectionCount === 0 && (
                  <p className="mt-2 text-xs text-[var(--easa-color-accent-orange)]">
                    No sections — upload content so the AI can compare
                  </p>
                )}
              </Link>
              <DeleteFlightbookButton id={book.id} name={book.name} compact />
            </div>
          </div>
        ))}
      </div>
      </section>
    </div>
  );
}
