"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, RotateCcw, Copy, ExternalLink, Loader2, GitCompare, AlertCircle } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { diffLines, hasChanges } from "@/lib/utils/text-diff";
import { confidenceConfig, getConfidenceLevel } from "@/lib/utils/confidence";

function decodeAndStripHtml(raw: string): string {
  // Repeatedly decode HTML entities until stable (handles double-encoding like &amp;lt;)
  let text = raw;
  for (let i = 0; i < 3; i++) {
    const decoded = text
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ");
    if (decoded === text) break;
    text = decoded;
  }
  // Strip any remaining HTML tags
  return text.replace(/<[^>]*>/g, " ").replace(/\s{2,}/g, " ").trim();
}

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

async function readJsonSafely(res: Response) {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as GenerateResult;
  } catch {
    return { error: text };
  }
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
  canManage?: boolean;
  whyThisSection?: string | null;
  sourceCitations?: Array<{
    kind?: string | null;
    id?: string | null;
    score?: number | null;
    section_number?: string | null;
    title?: string | null;
    flightbook_name?: string | null;
    quote?: string | null;
  }>;
}

type ReviewSection = "trigger" | "match" | "draft";

type SwipeIntent = "approve" | "dismiss" | null;

function riskBadgeClass(risk: string) {
  if (risk === "high") return "easa-badge is-red";
  if (risk === "medium") return "easa-badge is-orange";
  return "easa-badge is-green";
}

function statusBadgeClass(status: string) {
  if (status === "approved") return "easa-badge is-green";
  if (status === "rejected") return "easa-badge is-red";
  if (status === "watchlist") return "easa-badge is-blue";
  if (status === "boneyard") return "easa-badge is-muted";
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
  canManage = false,
  whyThisSection,
  sourceCitations = [],
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [suggestedText, setSuggestedText] = useState(initialSuggestedText);
  const [draftText, setDraftText] = useState(initialSuggestedText ?? "");

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
  const [rejectMode, setRejectMode] = useState<"item" | "future">("item");
  const [dismissReason, setDismissReason] = useState("This regulation part does not apply to our operation.");
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");

  // AI generate state
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Copied state for suggested text
  const [copied, setCopied] = useState(false);

  // Inline diff toggle
  const [showDiff, setShowDiff] = useState(false);
  const [activeSection, setActiveSection] = useState<ReviewSection>("trigger");
  const [swipeIntent, setSwipeIntent] = useState<SwipeIntent>(null);
  const touchStartXRef = useRef<number | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const realtimeRef = useRef<any>(null);

  useEffect(() => {
    setDraftText(suggestedText ?? "");
  }, [suggestedText]);

  const loadNotes = useCallback(async () => {
    if (!updateId) {
      setNotes([]);
      setNotesLoading(false);
      return;
    }

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
    if (!updateId) return;

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
    if (!updateId || !noteBody.trim()) return;
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
    if (action === "approved" && flightbookSectionId && draftText.trim()) {
      body.flightbookSectionId = flightbookSectionId;
      body.aiSuggestedText = draftText.trim();
      body.clearAfterApproval = true;
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
          ? (json.error ?? "The flight book has been updated since this AI update was proposed. Review the current section text before approving.")
          : (json.error ?? "Action failed"),
      );
    } else {
      setStatus(typeof json.status === "string" ? json.status : action);
      if (action === "approved") {
        setSuggestedText(draftText.trim());
        router.push("/updates");
      }
      const messages: Record<string, string> = {
        approved: "Update approved. Flight book section updated.",
        boneyard: "Update approved, flight book section updated, and queue item archived.",
        rejected: "Update rejected.",
        revision_requested: "Revision requested.",
        watchlist: "Moved to watchlist.",
        pending: "Reset to pending.",
      };
      setActionMsg(messages[action] ?? `Update ${action}.`);
      setRejectOpen(false);
      setRevisionOpen(false);
      setRejectMode("item");
      setDismissReason("This regulation part does not apply to our operation.");
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

    try {
      const res = await fetch("/api/findings/generate-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          findingId,
          notes: notes.length > 0 ? notes.map((n) => n.body) : undefined,
        }),
      });
      const json = await readJsonSafely(res);

      if (!res.ok || json?.error) {
        setGenerateError(json?.error ?? "AI generation failed");
      } else {
        setSuggestedText(json?.suggestedText ?? null);
      }
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : "AI generation failed");
    }
    setGenerating(false);
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const actionsDone = status === "approved" || status === "boneyard" || status === "rejected";
  const confidenceLevel = getConfidenceLevel(confidenceScore, aiConfidence);
  const confidenceMeta = confidenceConfig[confidenceLevel];
  const lowConfidence = confidenceLevel === "low";
  const swipeEnabled = !actionsDone && canManage;

  function onCardTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (!swipeEnabled) return;
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
  }

  function onCardTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (!swipeEnabled) return;
    if (touchStartXRef.current == null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const deltaX = endX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (Math.abs(deltaX) < 60) return;
    if (deltaX > 0) {
      setSwipeIntent("approve");
      setRejectOpen(false);
      setRevisionOpen(false);
    } else {
      setSwipeIntent("dismiss");
      setRejectOpen(true);
      setRejectMode("item");
      setRevisionOpen(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Badge strip */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={riskBadgeClass(riskLevel)}>{riskLevel} risk</span>
        <span className="easa-badge is-blue capitalize">{classification.replace(/_/g, " ")}</span>
        <span className={statusBadgeClass(status)}>{(status === "boneyard" ? "archived" : status).replace(/_/g, " ")}</span>
        <span className={confidenceMeta.badgeClass}>{confidenceMeta.label}</span>
        {confidenceScore != null && <span className="easa-badge is-muted">{Math.round(Number(confidenceScore))}%</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`easa-btn secondary text-sm ${activeSection === "trigger" ? "ring-1 ring-[var(--easa-color-brand-primary)]" : ""}`}
          onClick={() => setActiveSection("trigger")}
        >
          1) Trigger
        </button>
        <button
          type="button"
          className={`easa-btn secondary text-sm ${activeSection === "match" ? "ring-1 ring-[var(--easa-color-brand-primary)]" : ""}`}
          onClick={() => setActiveSection("match")}
        >
          2) Match
        </button>
        <button
          type="button"
          className={`easa-btn secondary text-sm ${activeSection === "draft" ? "ring-1 ring-[var(--easa-color-brand-primary)]" : ""}`}
          onClick={() => setActiveSection("draft")}
        >
          3) Draft
        </button>
      </div>

      {/* Trigger + Match */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left panel — EASA regulatory change */}
        <div className={`easa-card space-y-4 p-6 ${activeSection !== "trigger" ? "opacity-70" : ""}`}>
          <h2 className="text-base font-semibold">1) Trigger</h2>

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
                {decodeAndStripHtml(rssSummary)}
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
        <div className={`easa-card space-y-4 p-6 ${activeSection !== "match" ? "opacity-70" : ""}`}>
          <h2 className="text-base font-semibold">2) Match</h2>

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

          {whyThisSection ? (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--easa-color-text-muted)]">
                Why this section
              </p>
              <p className="text-sm leading-relaxed text-[var(--easa-color-text-secondary)]">
                {whyThisSection}
              </p>
            </div>
          ) : null}

          {sourceCitations.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--easa-color-text-muted)]">
                Top source citations
              </p>
              <div className="space-y-2">
                {sourceCitations.slice(0, 3).map((citation, index) => (
                  <div
                    key={`${citation.id ?? "citation"}-${index}`}
                    className="rounded-lg border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-2"
                  >
                    <p className="text-xs font-medium text-[var(--easa-color-text-secondary)]">
                      {(citation.kind ?? "source").replace(/_/g, " ")}
                      {citation.section_number ? ` · §${citation.section_number}` : ""}
                      {citation.title ? ` · ${citation.title}` : ""}
                    </p>
                    {citation.quote ? (
                      <p className="mt-1 text-xs leading-relaxed text-[var(--easa-color-text-muted)]">
                        “{citation.quote}”
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

        </div>
      </div>

      {/* Draft */}
      <div className={`easa-card space-y-4 p-6 ${activeSection !== "draft" ? "opacity-70" : ""}`}>
        <h2 className="text-base font-semibold">3) Draft</h2>
        {suggestedText ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--easa-color-accent-green)]">
                AI suggested revision
              </p>
              <div className="flex items-center gap-1.5">
                {sectionBody && hasChanges(diffLines(sectionBody, suggestedText)) && (
                  <button
                    type="button"
                    className={`easa-btn secondary flex items-center gap-1.5 px-2 py-1 text-xs ${showDiff ? "ring-1 ring-[var(--easa-color-brand-primary)]" : ""}`}
                    onClick={() => setShowDiff((v) => !v)}
                    title="Toggle inline diff"
                  >
                    <GitCompare size={13} strokeWidth={1.75} />
                    {showDiff ? "Hide diff" : "Show diff"}
                  </button>
                )}
                <button
                  type="button"
                  className="easa-btn secondary flex items-center gap-1.5 px-2 py-1 text-xs"
                  onClick={() => copyText(suggestedText)}
                >
                  <Copy size={13} strokeWidth={1.75} />
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
            <p className="text-xs leading-5 text-[var(--easa-color-text-muted)]">
              AI draft only. Check the source evidence and manual wording before approval.
              Your approval creates the controlled version.
            </p>

            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--easa-color-text-muted)]">
                Editable draft
              </p>
              <textarea
                className="easa-input w-full resize-y text-sm leading-relaxed"
                rows={10}
                value={draftText}
                onChange={(event) => setDraftText(event.target.value)}
                disabled={!canManage || actionLoading || actionsDone}
              />
            </div>

            {showDiff && sectionBody ? (
              <div className="max-h-72 overflow-auto rounded-xl border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-3 font-mono text-xs leading-relaxed">
                {diffLines(sectionBody, draftText).map((token, i) => (
                  <div
                    key={i}
                    className={
                      token.type === "delete"
                        ? "bg-[color-mix(in_srgb,var(--easa-color-accent-pink)_15%,transparent)] text-[var(--easa-color-accent-pink)] line-through"
                        : token.type === "insert"
                        ? "bg-[color-mix(in_srgb,var(--easa-color-accent-green)_15%,transparent)] text-[var(--easa-color-accent-green)]"
                        : "text-[var(--easa-color-text-secondary)]"
                    }
                  >
                    <span className="mr-2 select-none text-[var(--easa-color-text-muted)] opacity-50">
                      {token.type === "delete" ? "−" : token.type === "insert" ? "+" : " "}
                    </span>
                    {token.text || <span className="opacity-0">_</span>}
                  </div>
                ))}
              </div>
            ) : (
              <pre
                className="max-h-60 overflow-auto rounded-xl border border-[var(--easa-color-accent-green)] p-3 text-xs leading-relaxed whitespace-pre-wrap"
                style={{ background: "color-mix(in srgb, var(--easa-color-accent-green) 8%, transparent)" }}
              >
                {draftText}
              </pre>
            )}
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
                No AI finding linked. Cannot generate draft.
              </p>
            )}
          </div>
        )}
      </div>

      {lowConfidence ? (
        <div className="rounded-xl border border-[var(--easa-color-accent-orange)] bg-[color-mix(in_srgb,var(--easa-color-accent-orange)_10%,transparent)] px-4 py-3">
          <p className="flex items-center gap-2 text-sm">
            <AlertCircle size={15} strokeWidth={1.75} />
            Low confidence match — please verify this section is the correct one before approving.
          </p>
        </div>
      ) : null}

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
      <div className="easa-card p-5" onTouchStart={onCardTouchStart} onTouchEnd={onCardTouchEnd}>
        {!canManage && (
          <p className="mb-3 text-sm text-[var(--easa-color-text-muted)]">
            Read-only view. Approval actions are limited to admin, editor, and compliance manager roles.
          </p>
        )}
        {actionMsg && (
          <p className="mb-3 text-sm text-[var(--easa-color-accent-green)]">{actionMsg}</p>
        )}
        {actionError && (
          <p className="mb-3 text-sm text-[var(--easa-color-accent-pink)]">{actionError}</p>
        )}
        {!actionsDone && canManage && (
          <p className="mb-3 text-sm leading-6 text-[var(--easa-color-text-muted)]">
            Final human review required. Approving applies the reviewed text to the flight book,
            records the decision, and keeps the previous version available in Time machine.
          </p>
        )}

        <div className="flex flex-wrap items-start gap-3">
          {/* Approve */}
          {swipeIntent === "approve" ? (
            <button
              type="button"
              className="easa-btn primary flex items-center gap-2 text-sm"
              disabled={!canManage || actionLoading || actionsDone}
              onClick={() => {
                void performAction("approved");
                setSwipeIntent(null);
              }}
              style={
                actionsDone
                  ? undefined
                  : { background: "var(--easa-color-accent-green)", color: "#fff", borderColor: "var(--easa-color-accent-green)" }
              }
            >
              <CheckCircle size={16} strokeWidth={1.75} />
              Confirm approve
            </button>
          ) : (
            <button
              type="button"
              className="easa-btn primary flex items-center gap-2 text-sm"
              disabled={!canManage || actionLoading || actionsDone}
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
          )}

          {/* Not relevant dismiss */}
          {!rejectOpen ? (
            <button
              type="button"
              className="easa-btn secondary flex items-center gap-2 text-sm"
              disabled={!canManage || actionLoading || actionsDone}
              onClick={() => { setRejectOpen(true); setRevisionOpen(false); }}
            >
              <XCircle size={16} strokeWidth={1.75} />
              Not relevant — dismiss
            </button>
          ) : (
            <div className="flex w-full flex-col gap-2 rounded-xl border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-3">
              <p className="text-sm">
                Dismiss this item only, or also hide future related findings for your school?
              </p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={rejectMode === "item"}
                  onChange={() => setRejectMode("item")}
                />
                Dismiss this item only
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={rejectMode === "future"}
                  onChange={() => setRejectMode("future")}
                />
                Dismiss and hide future related findings
              </label>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--easa-color-text-muted)]">
                  Confirm no action needed
                </p>
                <p className="text-sm">
                  Confirm: I have reviewed this change and confirm no update to our manuals is required.
                </p>
                <label className="block text-xs text-[var(--easa-color-text-muted)]">
                  Reason (optional)
                </label>
                <input
                  className="easa-input w-full text-sm"
                  value={dismissReason}
                  onChange={(event) => setDismissReason(event.target.value)}
                  placeholder="This regulation part does not apply to our operation."
                />
              </div>
              <button
                type="button"
                className="easa-btn secondary text-sm"
                disabled={!canManage || actionLoading}
                onClick={async () => {
                  setActionLoading(true);
                  setActionError(null);

                  const response = await fetch("/api/findings/mark-not-relevant", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      findingId,
                      proposedUpdateId: updateId,
                      dismissalReason: dismissReason,
                      ...(rejectMode === "future"
                        ? { filterRegPart: regPart, filterCategory: classification }
                        : {}),
                    }),
                  });
                  const payload = await response.json().catch(() => ({} as { error?: string }));

                  if (!response.ok) {
                    setActionError(payload.error ?? "Dismiss action failed.");
                    setActionLoading(false);
                  } else {
                    router.push("/updates");
                  }
                }}
              >
                {swipeIntent === "dismiss" ? "Confirm dismissal" : "Confirm dismiss"}
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
              disabled={!canManage || actionLoading || actionsDone}
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
                disabled={!canManage || actionLoading}
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
        {swipeEnabled ? (
          <p className="mt-3 text-xs text-[var(--easa-color-text-muted)]">
            Mobile swipe: right to reveal approve confirm, left to reveal dismiss confirm.
          </p>
        ) : null}

        {actionsDone && (
          <p className="mt-3 text-xs text-[var(--easa-color-text-muted)]">
            Actions are disabled. Update is already {status}. Version history remains available in Time machine.
          </p>
        )}
      </div>
    </div>
  );
}
