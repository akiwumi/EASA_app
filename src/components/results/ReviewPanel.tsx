"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Wand2, CheckCircle, ChevronRight, AlertCircle, Loader2 } from "lucide-react";

interface EasaUpdate {
  title: string;
  summary: string | null;
  link: string | null;
  publishedAt: string | null;
  category: string | null;
  aiSummary: string;
  mappedSection: string;
}

function parseMappedSectionLabel(label: string) {
  const trimmed = label.trim();
  if (!trimmed) {
    return {
      manualName: null,
      sectionRef: null,
      displayLabel: "Best match will be resolved when the draft is generated.",
    };
  }

  const match = trimmed.match(/^(.*?)(\d+(?:\.\d+)+)$/);
  if (!match) {
    return {
      manualName: trimmed,
      sectionRef: null,
      displayLabel: trimmed,
    };
  }

  return {
    manualName: match[1]?.trim() || null,
    sectionRef: match[2] ?? null,
    displayLabel: trimmed,
  };
}

interface SectionDraft {
  sectionId: string;
  sectionTitle: string | null;
  sectionNumber: string | null;
  flightbookName: string;
  currentBody: string;
  suggestedText: string;
  changeSummary?: string;
  whyThisSection?: string;
  confidence?: string;
  citations?: {
    kind: string;
    id: string;
    score?: number;
    section_number?: string | null;
    title?: string | null;
    flightbook_name?: string | null;
    quote?: string | null;
  }[];
}

type Step = "review" | "generating" | "draft" | "approving" | "approved";

async function readJsonSafely(res: Response) {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: text };
  }
}

function parseSectionDraft(json: Record<string, unknown> | null): SectionDraft | null {
  if (!json) return null;

  const {
    sectionId,
    sectionTitle,
    sectionNumber,
    flightbookName,
    currentBody,
    suggestedText,
    changeSummary,
    whyThisSection,
    confidence,
    citations,
  } = json;

  if (
    typeof sectionId !== "string" ||
    typeof flightbookName !== "string" ||
    typeof currentBody !== "string" ||
    typeof suggestedText !== "string"
  ) {
    return null;
  }

  return {
    sectionId,
    sectionTitle: typeof sectionTitle === "string" ? sectionTitle : null,
    sectionNumber: typeof sectionNumber === "string" ? sectionNumber : null,
    flightbookName,
    currentBody,
    suggestedText,
    changeSummary: typeof changeSummary === "string" ? changeSummary : undefined,
    whyThisSection: typeof whyThisSection === "string" ? whyThisSection : undefined,
    confidence: typeof confidence === "string" ? confidence : undefined,
    citations: Array.isArray(citations)
      ? citations
          .filter((citation): citation is Record<string, unknown> => typeof citation === "object" && citation !== null)
          .map((citation) => ({
            kind: typeof citation.kind === "string" ? citation.kind : "unknown",
            id: typeof citation.id === "string" ? citation.id : "",
            score: typeof citation.score === "number" ? citation.score : undefined,
            section_number: typeof citation.section_number === "string" ? citation.section_number : null,
            title: typeof citation.title === "string" ? citation.title : null,
            flightbook_name: typeof citation.flightbook_name === "string" ? citation.flightbook_name : null,
            quote: typeof citation.quote === "string" ? citation.quote : null,
          }))
      : undefined,
  };
}

type Flightbook = { id: string; name: string };

export default function ReviewPanel({
  findingId,
  update,
}: {
  findingId: string;
  update: EasaUpdate;
}) {
  const mappedSection = parseMappedSectionLabel(update.mappedSection);
  const [step, setStep] = useState<Step>("review");
  const [draft, setDraft] = useState<SectionDraft | null>(null);
  const [editedText, setEditedText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [flightbooks, setFlightbooks] = useState<Flightbook[]>([]);
  const [selectedFlightbookId, setSelectedFlightbookId] = useState<string>("");

  useEffect(() => {
    fetch("/api/flightbooks")
      .then((r) => r.json())
      .then((json: { flightbooks?: Flightbook[] }) => {
        const books = json.flightbooks ?? [];
        setFlightbooks(books);
      })
      .catch(() => {});
  }, []);

  async function generateDraft() {
    setStep("generating");
    setError(null);

    try {
      const res = await fetch("/api/findings/generate-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          findingId,
          ...(selectedFlightbookId ? { flightbookId: selectedFlightbookId } : {}),
        }),
      });
      const json = await readJsonSafely(res);

      if (!res.ok) {
        setError(String(json?.error ?? "Failed to generate draft"));
        setStep("review");
        return;
      }

      const nextDraft = parseSectionDraft(json);
      if (!nextDraft) {
        setError("Received an unexpected draft response.");
        setStep("review");
        return;
      }

      setDraft(nextDraft);
      setEditedText(nextDraft.suggestedText);
      setStep("draft");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to generate draft");
      setStep("review");
    }
  }

  async function approveUpdate() {
    if (!draft) return;
    setStep("approving");
    setError(null);
    const res = await fetch("/api/findings/approve-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ findingId, sectionId: draft.sectionId, approvedText: editedText }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to apply update");
      setStep("draft");
      return;
    }
    setStep("approved");
  }

  return (
    <div className="space-y-6">
      {/* ── Step 1 & 2: Side-by-side comparison ─────────────────────────────── */}
      {(step === "review" || step === "generating") && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Left – EASA update */}
            <div className="easa-card flex flex-col p-6 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--easa-color-text-muted)]">
                EASA regulatory update
              </p>
              <h2 className="text-base font-semibold leading-snug">{update.title}</h2>
              {update.publishedAt && (
                <p className="text-xs text-[var(--easa-color-text-muted)]">
                  {update.publishedAt}
                  {update.category ? ` · ${update.category}` : ""}
                </p>
              )}
              {update.summary && (
                <p className="text-sm leading-relaxed text-[var(--easa-color-text-secondary)] flex-1">
                  {update.summary}
                </p>
              )}
              <div className="rounded-[10px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-3 py-2">
                <p className="text-xs text-[var(--easa-color-text-muted)]">AI analysis</p>
                <p className="mt-0.5 text-sm">{update.aiSummary}</p>
              </div>
              {update.link && (
                <a
                  href={update.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--easa-color-accent-blue)] underline break-all"
                >
                  View source ↗
                </a>
              )}
            </div>

            {/* Right – mapped section context */}
            <div className="easa-card flex flex-col p-6 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--easa-color-text-muted)]">
                Relevant flight book section
              </p>
              <div className="grid gap-3 rounded-[10px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-3 py-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-[var(--easa-color-text-muted)]">Flight book hint</p>
                  <p className="mt-0.5 text-sm font-medium">
                    {mappedSection.manualName ?? "Best-match lookup pending"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--easa-color-text-muted)]">Section hint</p>
                  <p className="mt-0.5 text-sm font-medium">
                    {mappedSection.sectionRef ?? "Resolved during draft generation"}
                  </p>
                </div>
              </div>
              <div className="rounded-[10px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-3 py-3">
                <p className="text-xs text-[var(--easa-color-text-muted)]">Mapped label</p>
                <p className="mt-0.5 text-sm">{mappedSection.displayLabel}</p>
              </div>
              <p className="text-sm text-[var(--easa-color-text-muted)]">
                {update.aiSummary || "The system will retrieve the closest current section text before drafting."}
              </p>
              <p className="text-sm text-[var(--easa-color-text-muted)] flex-1">
                Generate the draft to load the current wording, compare evidence, and approve the revision manually.
              </p>
            </div>
          </div>

          {flightbooks.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--easa-color-text-muted)]">
                Flight book to update
              </label>
              <select
                className="easa-input text-sm"
                value={selectedFlightbookId}
                onChange={(e) => setSelectedFlightbookId(e.target.value)}
                disabled={step === "generating"}
              >
                <option value="">Let AI choose the best match</option>
                {flightbooks.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-[10px] border border-[var(--easa-color-accent-pink)]/30 bg-[var(--easa-color-accent-pink)]/8 px-4 py-3 text-sm text-[var(--easa-color-accent-pink)]">
              <AlertCircle size={15} strokeWidth={1.75} />
              {error}
            </div>
          )}

          <button
            className="easa-btn primary flex items-center gap-2"
            disabled={step === "generating"}
            onClick={generateDraft}
          >
            {step === "generating" ? (
              <>
                <Loader2 size={15} strokeWidth={1.75} className="animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Wand2 size={15} strokeWidth={1.75} />
                Generate AI draft
              </>
            )}
          </button>
        </>
      )}

      {/* ── Step 3: Draft comparison ──────────────────────────────────────────── */}
      {(step === "draft" || step === "approving") && draft && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Left – current section */}
            <div className="easa-card flex flex-col p-6 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--easa-color-text-muted)]">
                  Current text
                </p>
                <span className="easa-badge is-orange">Before</span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-sm font-semibold">
                  {[draft.sectionNumber, draft.sectionTitle].filter(Boolean).join(" — ") || "Untitled"}
                </p>
                <span className="text-xs text-[var(--easa-color-text-muted)]">{draft.flightbookName}</span>
              </div>
              <pre className="flex-1 whitespace-pre-wrap text-sm leading-relaxed text-[var(--easa-color-text-secondary)] font-sans overflow-auto max-h-[420px]">
                {draft.currentBody}
              </pre>
            </div>

            {/* Right – AI suggested / editable */}
            <div className="easa-card flex flex-col p-6 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--easa-color-text-muted)]">
                  AI suggested revision
                </p>
                <span className="easa-badge is-green">After</span>
              </div>
              <p className="text-xs text-[var(--easa-color-text-muted)]">
                Review and edit below before approving.
              </p>
              {(draft.changeSummary || draft.whyThisSection || draft.confidence) && (
                <div className="rounded-[10px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-3 py-2 text-xs space-y-1">
                  {draft.changeSummary && (
                    <p><span className="text-[var(--easa-color-text-muted)]">Change:</span> {draft.changeSummary}</p>
                  )}
                  {draft.whyThisSection && (
                    <p><span className="text-[var(--easa-color-text-muted)]">Why this section:</span> {draft.whyThisSection}</p>
                  )}
                  {draft.confidence && (
                    <p><span className="text-[var(--easa-color-text-muted)]">Confidence:</span> {draft.confidence}</p>
                  )}
                </div>
              )}
              <textarea
                className="easa-input flex-1 min-h-[360px] resize-y text-sm font-mono leading-relaxed"
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                disabled={step === "approving"}
              />
            </div>
          </div>

          {draft.citations && draft.citations.length > 0 && (
            <div className="easa-card p-5 space-y-3">
              <div>
                <h3 className="text-sm font-semibold">Retrieved evidence</h3>
                <p className="text-xs text-[var(--easa-color-text-muted)]">
                  These chunks were used to ground the draft.
                </p>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {draft.citations.map((citation) => (
                  <div
                    key={`${citation.kind}-${citation.id}`}
                    className="rounded-[10px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-3 py-3 text-xs"
                  >
                    <p className="font-medium">
                      {citation.kind === "regulation_chunk" ? "Regulation chunk" : "Flightbook section"}
                    </p>
                    <p className="mt-1 text-[var(--easa-color-text-muted)] break-all">
                      {citation.section_number ? `${citation.section_number} · ` : ""}
                      {citation.title ?? citation.id}
                      {citation.flightbook_name ? ` · ${citation.flightbook_name}` : ""}
                    </p>
                    {citation.score != null && (
                      <p className="mt-1 text-[var(--easa-color-text-muted)]">
                        Similarity {Math.round(citation.score * 100)}%
                      </p>
                    )}
                    {citation.quote && (
                      <p className="mt-2 whitespace-pre-wrap text-[var(--easa-color-text-secondary)]">
                        {citation.quote}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-[10px] border border-[var(--easa-color-accent-pink)]/30 bg-[var(--easa-color-accent-pink)]/8 px-4 py-3 text-sm text-[var(--easa-color-accent-pink)]">
              <AlertCircle size={15} strokeWidth={1.75} />
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              className="easa-btn primary flex items-center gap-2"
              disabled={step === "approving" || !editedText.trim()}
              onClick={approveUpdate}
            >
              {step === "approving" ? (
                <>
                  <Loader2 size={15} strokeWidth={1.75} className="animate-spin" />
                  Applying…
                </>
              ) : (
                <>
                  <CheckCircle size={15} strokeWidth={1.75} />
                  Approve &amp; apply to flight book
                </>
              )}
            </button>
            <button
              className="easa-btn secondary"
              disabled={step === "approving"}
              onClick={() => { setStep("review"); setDraft(null); setError(null); }}
            >
              Regenerate
            </button>
          </div>
        </>
      )}

      {/* ── Step 4: Approved ─────────────────────────────────────────────────── */}
      {step === "approved" && draft && (
        <div className="easa-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--easa-color-accent-green)]/15">
              <CheckCircle size={20} strokeWidth={1.75} className="text-[var(--easa-color-accent-green)]" />
            </div>
            <div>
              <p className="text-sm font-semibold">Flight book updated</p>
              <p className="text-xs text-[var(--easa-color-text-muted)]">
                {[draft.sectionNumber, draft.sectionTitle].filter(Boolean).join(" — ") || "Section"} · {draft.flightbookName}
              </p>
            </div>
          </div>
          <div className="rounded-[10px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-4 py-3">
            <p className="text-xs text-[var(--easa-color-text-muted)] mb-2">Applied text</p>
            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--easa-color-text-secondary)] font-sans">
              {editedText}
            </pre>
          </div>
          <div className="flex gap-3">
            <Link href="/flightbooks" className="easa-btn secondary flex items-center gap-1.5">
              View flight books <ChevronRight size={13} strokeWidth={2} />
            </Link>
            <Link href="/updates" className="easa-btn secondary flex items-center gap-1.5">
              View update queue <ChevronRight size={13} strokeWidth={2} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
