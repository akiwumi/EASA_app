"use client";

import { useState } from "react";

type SectionComment = {
  id: string;
  body: string;
  created_at: string;
  authorName: string | null;
};

type SectionUsage = {
  id: string;
  section_number: string | null;
  title: string | null;
  body: string;
  linkedLessons: { id: string; title: string; lesson_code: string | null; required: boolean }[];
  assignmentCount: number;
  pendingAssignmentCount: number;
  comments: SectionComment[];
};

type BookMeta = {
  id: string;
  name: string;
  doc_type: string;
  version_label: string | null;
  aircraft: string | null;
  manual_group: string | null;
  effective_date: string | null;
  import_notes: string | null;
  tags: string[];
  active: boolean;
};

export default function FlightbookDetailClient({
  book,
  sections,
  canManage,
  metadataReady,
  commentsReady,
}: {
  book: BookMeta;
  sections: SectionUsage[];
  canManage: boolean;
  metadataReady: boolean;
  commentsReady: boolean;
}) {
  const [aircraft, setAircraft] = useState(book.aircraft ?? "");
  const [manualGroup, setManualGroup] = useState(book.manual_group ?? "");
  const [effectiveDate, setEffectiveDate] = useState(book.effective_date ?? "");
  const [importNotes, setImportNotes] = useState(book.import_notes ?? "");
  const [tags, setTags] = useState(book.tags.join(", "));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentBusyId, setCommentBusyId] = useState<string | null>(null);

  async function saveMetadata() {
    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/flightbooks/${book.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aircraft: aircraft.trim() || null,
        manualGroup: manualGroup.trim() || null,
        effectiveDate: effectiveDate || null,
        importNotes: importNotes.trim() || null,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(`Error: ${json.error ?? "Failed to save metadata"}`);
      setSaving(false);
      return;
    }
    setMessage("Metadata saved.");
    setSaving(false);
  }

  async function addComment(sectionId: string) {
    const body = commentDrafts[sectionId]?.trim();
    if (!body) return;
    setCommentBusyId(sectionId);
    const res = await fetch("/api/flightbooks/section-comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId, body }),
    });
    if (res.ok) {
      window.location.reload();
      return;
    }
    setCommentBusyId(null);
  }

  return (
    <div className="space-y-6">
      {metadataReady && canManage && (
        <div className="easa-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Manual metadata</h2>
              <p className="text-sm text-[var(--easa-color-text-muted)]">
                Add tags and operating context so this manual is easier to find and use in training workflows.
              </p>
            </div>
            {message && (
              <p className={`text-sm ${message.startsWith("Error") ? "text-[var(--easa-color-accent-pink)]" : "text-[var(--easa-color-accent-green)]"}`}>
                {message}
              </p>
            )}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input className="easa-input" placeholder="Aircraft or fleet" value={aircraft} onChange={(e) => setAircraft(e.target.value)} />
            <input className="easa-input" placeholder="Manual group" value={manualGroup} onChange={(e) => setManualGroup(e.target.value)} />
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input className="easa-input" placeholder="Tag 1, Tag 2, Tag 3" value={tags} onChange={(e) => setTags(e.target.value)} />
            <input className="easa-input" type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
          </div>
          <textarea
            className="easa-input mt-3 min-h-28 w-full resize-y"
            placeholder="Import notes, scope, revision highlights, or reviewer context"
            value={importNotes}
            onChange={(e) => setImportNotes(e.target.value)}
          />
          <div className="mt-3">
            <button className="easa-btn primary" disabled={saving} onClick={saveMetadata}>
              {saving ? "Saving…" : "Save metadata"}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="easa-card p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--easa-color-text-muted)]">Manual type</p>
          <p className="mt-2 text-sm font-medium">{book.doc_type}</p>
        </div>
        <div className="easa-card p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--easa-color-text-muted)]">Aircraft / scope</p>
          <p className="mt-2 text-sm font-medium">{book.aircraft || "Not set"}</p>
        </div>
        <div className="easa-card p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--easa-color-text-muted)]">Manual group</p>
          <p className="mt-2 text-sm font-medium">{book.manual_group || "Not set"}</p>
        </div>
      </div>

      {book.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {book.tags.map((tag) => (
            <span key={tag} className="easa-chip">{tag}</span>
          ))}
        </div>
      )}

      {book.import_notes && (
        <div className="easa-card p-5">
          <h2 className="text-sm font-semibold">Import notes</h2>
          <p className="mt-2 text-sm text-[var(--easa-color-text-secondary)]">{book.import_notes}</p>
        </div>
      )}

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.id} className="easa-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--easa-color-text-muted)]">
                  {section.section_number || "Section"}
                </p>
                <h2 className="mt-2 text-lg font-semibold">{section.title || "Untitled section"}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="easa-badge is-blue">
                  {section.linkedLessons.length} linked lesson{section.linkedLessons.length !== 1 ? "s" : ""}
                </span>
                <span className={`easa-badge ${section.pendingAssignmentCount > 0 ? "is-orange" : "is-green"}`}>
                  {section.pendingAssignmentCount > 0 ? `${section.pendingAssignmentCount} pending` : `${section.assignmentCount} assignment${section.assignmentCount !== 1 ? "s" : ""}`}
                </span>
              </div>
            </div>

            <p className="mt-3 line-clamp-4 text-sm text-[var(--easa-color-text-muted)]">
              {section.body}
            </p>

            {section.linkedLessons.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {section.linkedLessons.map((lesson) => (
                  <span key={lesson.id} className={`rounded-full px-3 py-2 text-sm ${lesson.required ? "bg-[color-mix(in_srgb,var(--easa-color-accent-blue)_16%,transparent)] text-[var(--easa-color-accent-blue)]" : "bg-[var(--easa-color-surface-2)] text-[var(--easa-color-text-secondary)]"}`}>
                    {(lesson.lesson_code ? `${lesson.lesson_code} · ` : "") + lesson.title}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 rounded-[18px] bg-[var(--easa-color-surface-2)] p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">Section comments</h3>
                <span className="text-xs text-[var(--easa-color-text-muted)]">
                  {section.comments.length} comment{section.comments.length !== 1 ? "s" : ""}
                </span>
              </div>

              {section.comments.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--easa-color-text-muted)]">
                  {commentsReady ? "No comments yet." : "Comments will appear after the Phase 5 migration is applied."}
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {section.comments.map((comment) => (
                    <div key={comment.id} className="rounded-2xl bg-[var(--easa-color-surface-1)] p-3">
                      <p className="text-sm text-[var(--easa-color-text-secondary)]">{comment.body}</p>
                      <p className="mt-2 text-xs text-[var(--easa-color-text-muted)]">
                        {comment.authorName || "Team member"} · {new Date(comment.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {commentsReady && (
                <div className="mt-3">
                  <textarea
                    className="easa-input min-h-24 w-full resize-y"
                    placeholder="Add context for instructors, reviewers, or manual owners"
                    value={commentDrafts[section.id] ?? ""}
                    onChange={(e) => setCommentDrafts((current) => ({ ...current, [section.id]: e.target.value }))}
                  />
                  <div className="mt-3">
                    <button className="easa-btn secondary" disabled={commentBusyId === section.id || !(commentDrafts[section.id] ?? "").trim()} onClick={() => addComment(section.id)}>
                      {commentBusyId === section.id ? "Saving…" : "Add comment"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
