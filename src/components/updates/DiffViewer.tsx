"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle, XCircle, RotateCcw, Copy, ExternalLink, Loader2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

interface Note {
  id: string;
  body: string;
  author_email: string | null;
  created_at: string;
}

interface GenerateResult {
  suggestedText?: string;
  error?: string;
}

interface Props {
  updateId: string;
  classification: string;
  riskLevel: string;
  confidenceScore: number | null;
  status: string;
  aiRationale: string | null;
  aiSuggestedText: string | null;
  flightbookSectionId: string | null;
  // Reg change
  regPart: string | null;
  sectionRef: string | null;
  changeType: string;
  diffText: string | null;
  findingId: string | null;
  // RSS/finding
  rssTitle: string | null;
  rssSummary: string | null;
  rssLink: string | null;
  publishedAt: string | null;
  aiImpact: string | null;
  aiConfidence: string | null;
  aiSummary: string | null;
  // Flight book section
  sectionNumber: string | null;
  sectionTitle: string | null;
  sectionBody: string | null;
  flightbookName: string | null;
}

function riskBadgeClass(risk: string) {
  if (risk === "high") return "easa-badge is-red";
  if (risk === "medium") return "easa-badge is-orange";
  return "easa-badge is-green";
}

function statusBadgeClass(status: string) {
  if (status === "approved") return "easa-badge is-green";
  if (status === "rejected") return "easa-badge is-red";
  if (status === "watchlist") return "easa-badge is-blue";
  return "easa-badge is-orange";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DiffViewer({
  updateId,
  classification,
  riskLevel,
  confidenceScore,
  status: initialStatus,
  aiRationale,
  aiSuggestedText: initialSuggestedText,
  flightbookSectionId,
  regPart,
  sectionRef,
  changeType,
  diffText,
  findingId,
  rssTitle,
  rssSummary,
  rssLink,
  publishedAt,
  aiImpact,
  aiConfidence,
  aiSummary,
  sectionNumber,
  sectionTitle,
  sectionBody,
  flightbookName,
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [suggestedText, setSuggestedText] = useState(initialSuggestedText);

  // Notes state
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [noteBody, setNoteBody] = useState("");
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  // Action state
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Inline inputs for reject / revision
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");

  // AI generate state
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Copied state for suggested text
  const [copied, setCopied] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const realtimeRef = useRef<any>(null);

  const loadNotes = useCallback(async () => {
    setNotesLoading(true);
    try {
      const res = await fetch(`/api/notes?updateId=${updateId}`);
      const json = await res.json();
      setNotes(json.notes ?? []);
    } catch {
      // best-effort
    } finally {
      setNotesLoading(false);
    }
  }, [updateId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Realtime — live note inserts from other users
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let cancelled = false;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled || !user) return;

      const channel = supabase
        .channel(`notes:${updateId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "update_notes",
            filter: `proposed_update_id=eq.${updateId}`,
          },
          (payload) => {
            const note = payload.new as Note;
            setNotes((prev) => {
              if (prev.some((n) => n.id === note.id)) return prev;
              return [...prev, note];
            });
          },
        )
        .subscribe();

      realtimeRef.current = channel;
    });

    return () => {
      cancelled = true;
      if (realtimeRef.current) {
        const sb = getSupabaseBrowserClient();
        sb?.removeChannel(realtimeRef.current);
        realtimeRef.current = null;
      }
    };
  }, [updateId]);

  async function submitNote() {
    if (!noteBody.trim()) return;
    setNoteSubmitting(true);
    setNoteError(null);
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updateId, body: noteBody.trim() }),
    });
    const json = await res.json();
    if (!res.ok) {
      setNoteError(json.error ?? "Failed to add note");
    } else {
      setNoteBody("");
      await loadNotes();
    }
    setNoteSubmitting(false);
  }

  async function performAction(action: string, comment?: string) {
    setActionLoading(true);
    setActionMsg(null);
    setActionError(null);

    const body: Record<string, unknown> = { ids: [updateId], action, comment };
    // When approving, pass section details so the API can apply the text to the flight book
    if (action === "approved" && flightbookSectionId && suggestedText) {
      body.flightbookSectionId = flightbookSectionId;
      body.aiSuggestedText = suggestedText;
    }

    const res = await fetch("/api/updates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      setActionError(
        json.conflict
          ? "Conflict detected: the flight book section was edited after this update was proposed. Open the flight book to review the current text before approving."
          : (json.error ?? "Action failed"),
      );
    } else {
      setStatus(action);
      const messages: Record<string, string> = {
        approved: "Update approved — flight book section updated.",
        rejected: "Update rejected.",
        revision_requested: "Revision requested.",
        watchlist: "Moved to watchlist.",
        pending: "Reset to pending.",
      };
      setActionMsg(messages[action] ?? `Update ${action}.`);
      setRejectOpen(false);
      setRevisionOpen(false);
      setRejectReason("");
      setRevisionNote("");
    }
    setActionLoading(false);
  }

  async function generateDraft() {
    if (!findingId) {
      setGenerateError("No AI finding linked to this update.");
      return;
    }
    setGenerating(true);
    setGenerateError(null);
    const res = await fetch("/api/findings/generate-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        findingId,
        notes: notes.length > 0 ? notes.map((n) => n.body) : undefined,
      }),
    });
    const json: GenerateResult = await res.json();
    if (!res.ok || json.error) {
      setGenerateError(json.error ?? "AI generation failed");
    } else {
      setSuggestedText(json.suggestedText ?? null);
    }
    setGenerating(false);
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const actionsDone = status === "approved" || status === "rejected";

  return (
    <div className="space-y-6">
      {/* Badge strip */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={riskBadgeClass(riskLevel)}>{riskLevel} risk</span>
        <span className="easa-badge is-blue capitalize">{classification.replace(/_/g, " ")}</span>
        <span className={statusBadgeClass(status)}>{status.replace(/_/g, " ")}</span>
        {confidenceScore != null && (
          <span className="easa-badge is-muted">
            {Math.round(Number(confidenceScore))}% confidence
          </span>
        )}
      </div>

      {/* Two-column grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left panel — EASA regulatory change */}
        <div className="easa-card space-y-4 p-6">
          <h2 className="text-base font-semibold">EASA regulatory change</h2>

          {/* Reg part + section ref */}
          <div className="flex flex-wrap gap-2">
            {regPart && (
              <span className="easa-badge is-purple">{regPart}</span>
            )}
            {sectionRef && (
              <span className="text-sm text-[var(--easa-color-text-muted)]">§{sectionRef}</span>
            )}
            <span className="easa-badge is-muted capitalize">{changeType.replace(/_/g, " ")}</span>
          </div>

          {/* RSS title */}
          {rssTitle && (
            <h3 className="text-sm font-semibold leading-snug">{rssTitle}</h3>
          )}

          {/* Published date */}
          {publishedAt && (
            <p className="text-xs text-[var(--easa-color-text-muted)]">
              Published {formatDate(publishedAt)}
            </p>
          )}

          {/* Diff text / AI analysis summary */}
          {(diffText || aiSummary) && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--easa-color-text-muted)]">
                AI analysis summary
              </p>
              <p className="text-sm leading-relaxed text-[var(--easa-color-text-secondary)]">
                {diffText ?? aiSummary}
              </p>
            </div>
          )}

          {/* RSS summary */}
          {rssSummary && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--easa-color-text-muted)]">
                Source summary
              </p>
              <p className="text-sm leading-relaxed text-[var(--easa-color-text-secondary)]">
                {rssSummary}
              </p>
            </div>
          )}

          {/* Source link */}
          {rssLink && (
            <a
              href={rssLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[var(--easa-color-accent-blue)] hover:underline"
            >
              <ExternalLink size={13} strokeWidth={1.75} />
              View source
            </a>
          )}

          {/* AI finding: impact + confidence */}
          {(aiImpact || aiConfidence) && (
            <div className="flex flex-wrap gap-2 border-t border-[var(--easa-color-border)] pt-4">
              {aiImpact && (
                <span className="easa-badge is-orange capitalize">
                  Impact: {aiImpact}
                </span>
              )}
              {aiConfidence && (
                <span className="easa-badge is-muted capitalize">
                  AI confidence: {aiConfidence}
                </span>
              )}
            </div>
          )}

          {/* AI rationale */}
          {aiRationale && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--easa-color-text-muted)]">
                AI rationale
              </p>
              <p className="text-sm leading-relaxed text-[var(--easa-color-text-secondary)]">
                {aiRationale}
              </p>
            </div>
          )}
        </div>

        {/* Right panel — flight book section */}
        <div className="easa-card space-y-4 p-6">
          <h2 className="text-base font-semibold">Flight book section</h2>

          {/* Section identifier */}
          <div>
            {(sectionNumber || sectionTitle) && (
              <p className="font-medium">
                {sectionNumber ? `§${sectionNumber}` : ""}{" "}
                {sectionTitle ?? ""}
              </p>
            )}
            {flightbookName && (
              <p className="mt-0.5 text-xs text-[var(--easa-color-text-muted)]">
                {flightbookName}
              </p>
            )}
          </div>

          {/* Current section body */}
          {sectionBody ? (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--easa-color-text-muted)]">
                Current text
              </p>
              <pre className="max-h-60 overflow-auto rounded-xl border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-3 text-xs leading-relaxed whitespace-pre-wrap">
                {sectionBody}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-[var(--easa-color-text-muted)]">No section body available.</p>
          )}

          {/* AI suggested revision */}
          {suggestedText ? (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--easa-color-accent-green)]">
                  AI suggested revision
                </p>
                <button
                  type="button"
                  className="easa-btn secondary flex items-center gap-1.5 px-2 py-1 text-xs"
                  onClick={() => copyText(suggestedText)}
                >
                  <Copy size={13} strokeWidth={1.75} />
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <pre
                className="max-h-60 overflow-auto rounded-xl border border-[var(--easa-color-accent-green)] p-3 text-xs leading-relaxed whitespace-pre-wrap"
                style={{ background: "color-mix(in srgb, var(--easa-color-accent-green) 8%, transparent)" }}
              >
                {suggestedText}
              </pre>
            </div>
          ) : (
            <div>
              {generateError && (
                <p className="mb-2 text-xs text-[var(--easa-color-accent-pink)]">{generateError}</p>
              )}
              <button
                type="button"
                className="easa-btn secondary flex items-center gap-2 text-sm"
                disabled={generating || !findingId}
                onClick={generateDraft}
              >
                {generating ? (
                  <Loader2 size={15} strokeWidth={1.75} className="animate-spin" />
                ) : (
                  <RotateCcw size={15} strokeWidth={1.75} />
                )}
                {generating ? "Generating…" : "Generate AI draft"}
              </button>
              {!findingId && (
                <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
                  No AI finding linked — cannot generate draft.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Notes thread */}
      <div className="easa-card space-y-4 p-5">
        <h2 className="text-base font-semibold">Notes</h2>

        {notesLoading ? (
          <p className="text-sm text-[var(--easa-color-text-muted)]">Loading notes…</p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-[var(--easa-color-text-muted)]">No notes yet.</p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="rounded-xl border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-3"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[var(--easa-color-text-secondary)]">
                    {note.author_email ?? "Unknown user"}
                  </span>
                  <span className="text-xs text-[var(--easa-color-text-muted)]">
                    {formatDateTime(note.created_at)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{note.body}</p>
              </div>
            ))}
          </div>
        )}

        {/* Add note form */}
        <div className="space-y-2">
          <textarea
            className="easa-input w-full resize-none"
            rows={3}
            placeholder="Add a note…"
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitNote();
            }}
          />
          {noteError && (
            <p className="text-xs text-[var(--easa-color-accent-pink)]">{noteError}</p>
          )}
          <button
            type="button"
            className="easa-btn secondary text-sm"
            disabled={noteSubmitting || !noteBody.trim()}
            onClick={submitNote}
          >
            {noteSubmitting ? "Adding…" : "Add note"}
          </button>
        </div>
      </div>

      {/* Action bar */}
      <div className="easa-card p-5">
        {actionMsg && (
          <p className="mb-3 text-sm text-[var(--easa-color-accent-green)]">{actionMsg}</p>
        )}
        {actionError && (
          <p className="mb-3 text-sm text-[var(--easa-color-accent-pink)]">{actionError}</p>
        )}

        <div className="flex flex-wrap items-start gap-3">
          {/* Approve */}
          <button
            type="button"
            className="easa-btn primary flex items-center gap-2 text-sm"
            disabled={actionLoading || actionsDone}
            onClick={() => performAction("approved")}
            style={
              actionsDone
                ? undefined
                : { background: "var(--easa-color-accent-green)", color: "#fff", borderColor: "var(--easa-color-accent-green)" }
            }
          >
            <CheckCircle size={16} strokeWidth={1.75} />
            Approve
          </button>

          {/* Reject */}
          {!rejectOpen ? (
            <button
              type="button"
              className="easa-btn secondary flex items-center gap-2 text-sm"
              disabled={actionLoading || actionsDone}
              onClick={() => { setRejectOpen(true); setRevisionOpen(false); }}
              style={actionsDone ? undefined : { color: "var(--easa-color-accent-pink)", borderColor: "var(--easa-color-accent-pink)" }}
            >
              <XCircle size={16} strokeWidth={1.75} />
              Reject
            </button>
          ) : (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <input
                className="easa-input text-sm"
                placeholder="Reason (optional)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <button
                type="button"
                className="easa-btn secondary text-sm"
                style={{ color: "var(--easa-color-accent-pink)", borderColor: "var(--easa-color-accent-pink)" }}
                disabled={actionLoading}
                onClick={() => performAction("rejected", rejectReason || undefined)}
              >
                Confirm reject
              </button>
              <button
                type="button"
                className="easa-btn secondary text-sm"
                disabled={actionLoading}
                onClick={() => setRejectOpen(false)}
              >
                Cancel
              </button>
            </div>
          )}

          {/* Request revision */}
          {!revisionOpen ? (
            <button
              type="button"
              className="easa-btn secondary flex items-center gap-2 text-sm"
              disabled={actionLoading || actionsDone}
              onClick={() => { setRevisionOpen(true); setRejectOpen(false); }}
            >
              <RotateCcw size={16} strokeWidth={1.75} />
              Request revision
            </button>
          ) : (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <input
                className="easa-input text-sm"
                placeholder="Revision note (optional)"
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
              />
              <button
                type="button"
                className="easa-btn secondary text-sm"
                disabled={actionLoading}
                onClick={() => performAction("revision_requested", revisionNote || undefined)}
              >
                Confirm
              </button>
              <button
                type="button"
                className="easa-btn secondary text-sm"
                disabled={actionLoading}
                onClick={() => setRevisionOpen(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {actionsDone && (
          <p className="mt-3 text-xs text-[var(--easa-color-text-muted)]">
            Actions are disabled — update is already {status}.
          </p>
        )}
      </div>
    </div>
  );
}
