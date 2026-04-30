"use client";

import { useState } from "react";
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

export default function ReviewPanel({
  findingId,
  update,
}: {
  findingId: string;
  update: EasaUpdate;
}) {
  const [step, setStep] = useState<Step>("review");
  const [draft, setDraft] = useState<SectionDraft | null>(null);
  const [editedText, setEditedText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function generateDraft() {
    setStep("generating");
    setError(null);
    const res = await fetch("/api/findings/generate-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ findingId }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to generate draft");
      setStep("review");
      return;
    }
    setDraft(json as SectionDraft);
    setEditedText(json.suggestedText);
    setStep("draft");
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

            {/* Right – mapped section placeholder */}
            <div className="easa-card flex flex-col p-6 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--easa-color-text-muted)]">
                Relevant flight book section
              </p>
              <div className="rounded-[10px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-3 py-2">
                <p className="text-xs text-[var(--easa-color-text-muted)]">Mapped to</p>
                <p className="mt-0.5 text-sm font-medium">{update.mappedSection || "—"}</p>
              </div>
              <p className="text-sm text-[var(--easa-color-text-muted)] flex-1">
                Click <strong>Generate AI draft</strong> to load the matching section text and produce a suggested revision.
              </p>
            </div>
          </div>

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
            <a href="/flightbooks" className="easa-btn secondary flex items-center gap-1.5">
              View flight books <ChevronRight size={13} strokeWidth={2} />
            </a>
            <a href="/updates" className="easa-btn secondary flex items-center gap-1.5">
              View update queue <ChevronRight size={13} strokeWidth={2} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
