"use client";

import Link from "next/link";
import { useState } from "react";
import type { ExtractedCoworkerCard } from "./card-types";
import { useCoworker } from "./CoworkerProvider";

export default function DraftPreviewCard({
  card,
  sourceMessageId,
}: {
  card: ExtractedCoworkerCard<"draft">;
  sourceMessageId: string;
}) {
  const { createReviewItem } = useCoworker();
  const [reviewItemId, setReviewItemId] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setWorking(true);
    setError(null);
    try {
      const result = await createReviewItem(card.findingId, sourceMessageId);
      setReviewItemId(result.id);
    } catch {
      setError("Unable to create review item.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-[var(--easa-color-border)] bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[var(--easa-color-text-primary)]">{card.title}</p>
        <span className="easa-badge is-muted">Draft only</span>
      </div>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-[var(--easa-color-text-muted)]">Current wording</p>
      <p className="mt-1 whitespace-pre-wrap text-xs text-[var(--easa-color-text-secondary)]">{card.currentText}</p>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-[var(--easa-color-text-muted)]">Proposed wording</p>
      <p className="mt-1 whitespace-pre-wrap rounded-lg bg-[var(--easa-color-brand-light)] p-2 text-xs text-[var(--easa-color-text-primary)]">{card.proposedText}</p>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-[var(--easa-color-text-muted)]">Rationale</p>
      <p className="mt-1 text-xs text-[var(--easa-color-text-secondary)]">{card.rationale}</p>
      <div className="mt-3">
        {reviewItemId ? (
          <Link href={`/updates/${reviewItemId}`} className="easa-btn primary text-xs">Open review item</Link>
        ) : (
          <button type="button" disabled={working} onClick={() => void create()} className="easa-btn primary text-xs">
            {working ? "Creating..." : "Create review item"}
          </button>
        )}
      </div>
      {error ? <p className="mt-2 text-xs text-[var(--easa-color-accent-pink)]">{error}</p> : null}
    </div>
  );
}
