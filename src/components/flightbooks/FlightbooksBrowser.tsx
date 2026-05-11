"use client";

import Link from "next/link";
import { BookOpen, Upload, CheckCircle, XCircle, Download, FileText } from "lucide-react";
import DeleteFlightbookButton from "@/components/flightbooks/DeleteFlightbookButton";
import type { FlightbookSummary } from "@/lib/types/domain";

interface Props {
  books: FlightbookSummary[];
}

function formatBytes(bytes: number | null): string | null {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FlightbooksBrowser({ books }: Props) {
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

  const totalSections = books.reduce((s, b) => s + b.sectionCount, 0);
  const withFiles = books.filter((b) => b.file_ref).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Flight books</h1>
          <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
            {books.length} document{books.length !== 1 ? "s" : ""} · {totalSections} sections indexed
            {withFiles > 0 && ` · ${withFiles} original file${withFiles !== 1 ? "s" : ""} stored`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link className="easa-btn secondary flex items-center gap-2 text-sm" href="/history">
            <FileText size={15} strokeWidth={1.75} /> History
          </Link>
          <Link className="easa-btn primary flex items-center gap-2 text-sm" href="/flightbooks/upload">
            <Upload size={15} strokeWidth={1.75} /> Upload
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {books.map((book) => (
          <div
            key={book.id}
            className="easa-card p-5 transition hover:shadow-[var(--easa-shadow-2)] flex flex-col"
          >
            <div className="flex items-start justify-between gap-2 flex-1">
              <Link href={`/flightbooks/${book.id}`} className="min-w-0 flex-1">
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

                {(book.linkedLessonCount || book.pendingAssignmentCount) ? (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="easa-badge is-blue">
                      {book.linkedLessonCount ?? 0} linked lesson{(book.linkedLessonCount ?? 0) !== 1 ? "s" : ""}
                    </span>
                    <span className={`easa-badge ${(book.pendingAssignmentCount ?? 0) > 0 ? "is-orange" : "is-muted"}`}>
                      {book.pendingAssignmentCount ?? 0} pending
                    </span>
                  </div>
                ) : null}

                {book.sectionCount === 0 && (
                  <p className="mt-2 text-xs text-[var(--easa-color-accent-orange)]">
                    No sections — upload content so the AI can compare
                  </p>
                )}
              </Link>
              <DeleteFlightbookButton id={book.id} name={book.name} compact />
            </div>

            {/* File download row */}
            <div className="mt-4 pt-3 border-t border-[var(--easa-color-border)] flex items-center justify-between gap-2">
              {book.file_ref ? (
                <>
                  <span className="text-xs text-[var(--easa-color-text-muted)]">
                    {formatBytes(book.file_size_bytes) ?? "Original file stored"}
                  </span>
                  <a
                    href={`/api/flightbooks/${book.id}/file`}
                    download
                    className="easa-btn secondary flex items-center gap-1.5 text-xs px-3 py-1.5"
                  >
                    <Download size={13} strokeWidth={1.75} />
                    Download original
                  </a>
                </>
              ) : (
                <span className="text-xs text-[var(--easa-color-text-muted)] italic">
                  No original file · <Link href="/flightbooks/upload" className="underline">re-upload to store</Link>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
