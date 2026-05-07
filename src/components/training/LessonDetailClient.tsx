"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type {
  FlightbookOption,
  FlightbookSectionOption,
  LessonDocumentRow,
  TrainingLessonRow,
} from "@/services/training";

function unwrapName(value: LessonDocumentRow["flightbooks"]) {
  if (Array.isArray(value)) return value[0]?.name ?? null;
  return value?.name ?? null;
}

function unwrapSection(value: LessonDocumentRow["flightbook_sections"]) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default function LessonDetailClient({
  lesson,
  documents,
  flightbooks,
  sections,
  canManage,
}: {
  lesson: TrainingLessonRow;
  documents: LessonDocumentRow[];
  flightbooks: FlightbookOption[];
  sections: FlightbookSectionOption[];
  canManage: boolean;
}) {
  const [title, setTitle] = useState("");
  const [flightbookId, setFlightbookId] = useState(flightbooks[0]?.id ?? "");
  const [flightbookSectionId, setFlightbookSectionId] = useState("");
  const [required, setRequired] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const filteredSections = useMemo(
    () => sections.filter((section) => !flightbookId || section.flightbook_id === flightbookId),
    [flightbookId, sections],
  );

  async function attachDocument() {
    if (!flightbookSectionId) return;
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/training/lesson-documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lessonId: lesson.id,
        flightbookId: flightbookId || null,
        flightbookSectionId,
        title: title.trim() || null,
        required,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(`Error: ${json.error ?? "Failed to attach document"}`);
      setSaving(false);
      return;
    }
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div className="easa-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--easa-color-text-muted)]">
              {lesson.lesson_code || "Lesson"} · {lesson.lesson_type}
            </p>
            <h1 className="easa-h1-mobile-app mt-2 text-2xl font-semibold">{lesson.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--easa-color-text-muted)]">
              {lesson.description || "No description yet."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="easa-btn secondary text-sm" href="/training/assignments">
              Assign reading
            </Link>
            <Link className="easa-btn secondary text-sm" href="/training/signoffs">
              Manage sign-offs
            </Link>
          </div>
        </div>
      </div>

      {canManage && (
        <div className="easa-card p-5">
          <h2 className="text-sm font-semibold">Attach manual reading</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              className="easa-input"
              placeholder="Display title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <select className="easa-input" value={flightbookId} onChange={(e) => setFlightbookId(e.target.value)}>
              <option value="">Select manual</option>
              {flightbooks.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.name}
                </option>
              ))}
            </select>
          </div>
          <select className="easa-input mt-3 w-full" value={flightbookSectionId} onChange={(e) => setFlightbookSectionId(e.target.value)}>
            <option value="">Select section</option>
            {filteredSections.map((section) => (
              <option key={section.id} value={section.id}>
                {(section.section_number ? `${section.section_number} · ` : "") + (section.title || "Untitled section")}
              </option>
            ))}
          </select>
          <label className="mt-3 flex items-center gap-2 text-sm text-[var(--easa-color-text-secondary)]">
            <input checked={required} onChange={(e) => setRequired(e.target.checked)} type="checkbox" />
            Required reading
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button className="easa-btn primary" disabled={saving || !flightbookSectionId} onClick={attachDocument}>
              {saving ? "Saving…" : "Attach reading"}
            </button>
            {message && <p className="text-sm text-[var(--easa-color-accent-pink)]">{message}</p>}
          </div>
        </div>
      )}

      <div className="easa-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Attached reading</h2>
            <p className="text-sm text-[var(--easa-color-text-muted)]">
              Link manual sections here so assignments point to the right approved material.
            </p>
          </div>
          <span className="easa-badge is-blue">
            {documents.length} document{documents.length !== 1 ? "s" : ""}
          </span>
        </div>

        {documents.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--easa-color-text-muted)]">
            No reading attached yet.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {documents.map((document) => {
              const bookName = unwrapName(document.flightbooks);
              const section = unwrapSection(document.flightbook_sections);
              return (
                <div key={document.id} className="rounded-[18px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{document.title || section?.title || "Manual reading"}</p>
                      <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
                        {bookName || "Manual"}{section?.section_number ? ` · ${section.section_number}` : ""}{section?.title ? ` · ${section.title}` : ""}
                      </p>
                    </div>
                    <span className={`easa-badge ${document.required ? "is-orange" : "is-muted"}`}>
                      {document.required ? "Required" : "Optional"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
