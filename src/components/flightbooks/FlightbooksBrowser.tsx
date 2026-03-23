"use client";

import Link from "next/link";
import { BookOpen, Upload, CheckCircle, XCircle } from "lucide-react";

interface Flightbook {
  id: string;
  name: string;
  doc_type: string;
  version_label: string | null;
  active: boolean;
  created_at: string;
  sectionCount: number;
}

interface Props {
  books: Flightbook[];
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
            Upload a PDF, TXT, or JSON file to import your first flight book.
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {books.map((book) => (
          <Link
            key={book.id}
            href={`/flightbooks/${book.id}`}
            className="easa-card block p-5 transition hover:shadow-[var(--easa-shadow-2)]"
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
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-[var(--easa-color-text-muted)]">
              <span>{book.sectionCount} section{book.sectionCount !== 1 ? "s" : ""}</span>
              <span>{new Date(book.created_at).toLocaleDateString()}</span>
            </div>

            {book.sectionCount === 0 && (
              <p className="mt-2 text-xs text-[var(--easa-color-accent-orange)]">
                No sections — upload content so the AI can compare
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
