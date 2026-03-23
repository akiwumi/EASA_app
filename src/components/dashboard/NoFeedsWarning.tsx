"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";

export default function NoFeedsWarning() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md rounded-[20px] bg-[var(--easa-color-surface-1)] p-6 shadow-[var(--easa-shadow-2)]">
        <button
          className="absolute right-4 top-4 text-[var(--easa-color-text-muted)] hover:text-[var(--easa-color-text-primary)] transition"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
        >
          <X size={18} strokeWidth={1.75} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--easa-color-accent-orange)]/15">
            <AlertTriangle size={20} strokeWidth={1.75} className="text-[var(--easa-color-accent-orange)]" />
          </div>
          <h2 className="text-base font-semibold">RSS feeds not active</h2>
        </div>

        <p className="text-sm text-[var(--easa-color-text-muted)]">
          No RSS feeds are currently active. The ingestion pipeline will not fetch any regulation updates until at least one feed is enabled.
        </p>

        <div className="mt-5 flex gap-3">
          <Link
            href="/settings?tab=sources"
            className="easa-btn primary flex-1 text-center"
            onClick={() => setDismissed(true)}
          >
            Go to RSS feeds
          </Link>
          <button
            className="easa-btn secondary"
            onClick={() => setDismissed(true)}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
