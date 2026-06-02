"use client";

import Link from "next/link";
import type { ExtractedCoworkerCard } from "./card-types";
import { useCoworker } from "./CoworkerProvider";

export default function FindingCard({ card }: { card: ExtractedCoworkerCard<"finding"> }) {
  const { loading, sendMessage } = useCoworker();
  return (
    <div className="mt-3 rounded-xl border border-[var(--easa-color-border)] bg-white p-3">
      <p className="text-xs font-semibold text-[var(--easa-color-text-primary)]">{card.title}</p>
      <p className="mt-1 text-xs text-[var(--easa-color-text-secondary)]">{card.summary}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={loading} className="easa-btn secondary text-xs" onClick={() => void sendMessage("Explain this finding", card.findingId)}>
          Explain
        </button>
        <button type="button" disabled={loading} className="easa-btn secondary text-xs" onClick={() => void sendMessage("Draft an update for this finding", card.findingId)}>
          Draft update
        </button>
        <Link href={card.href || `/results/${card.findingId}`} className="easa-btn secondary text-xs">
          Open finding
        </Link>
      </div>
    </div>
  );
}
