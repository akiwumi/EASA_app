"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Clock3, Radio } from "lucide-react";

type SetupAssistCardProps = {
  hasActiveFeeds: boolean;
  hasFlightbooks: boolean;
  hasSchedule: boolean;
};

export default function SetupAssistCard({
  hasActiveFeeds,
  hasFlightbooks,
  hasSchedule,
}: SetupAssistCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedMessage, setFeedMessage] = useState<string | null>(null);
  const [feedError, setFeedError] = useState<string | null>(null);

  const missingItems = [
    !hasActiveFeeds ? "no active EASA feeds" : null,
    !hasFlightbooks ? "no flight books uploaded" : null,
    !hasSchedule ? "automation schedule missing" : null,
  ].filter(Boolean) as string[];

  if (missingItems.length === 0) {
    return null;
  }

  async function seedDefaultFeeds() {
    setFeedMessage(null);
    setFeedError(null);

    try {
      const response = await fetch("/api/admin/seed-sources", { method: "POST" });
      const payload = (await response.json()) as {
        error?: string;
        inserted?: string[];
        activated?: string[];
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to add the default EASA feeds.");
      }

      const inserted = payload.inserted?.length ?? 0;
      const activated = payload.activated?.length ?? 0;
      setFeedMessage(
        inserted > 0
          ? `Added ${inserted} default EASA feed(s).`
          : activated > 0
            ? `Reactivated ${activated} existing EASA feed(s).`
            : "Default EASA feeds are ready.",
      );
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setFeedError(
        error instanceof Error ? error.message : "Unable to add the default EASA feeds.",
      );
    }
  }

  return (
    <section className="easa-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold">Workspace setup needed</h2>
          <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
            This workspace is not broken. The dashboard is waiting for a few setup
            pieces before it can monitor EASA changes and draft updates.
          </p>
          <p className="mt-3 text-sm text-[var(--easa-color-text-secondary)]">
            Missing right now: {missingItems.join(", ")}.
          </p>
        </div>
        <Link className="easa-btn secondary text-sm" href="/settings?tab=setup">
          Open setup guide
        </Link>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {!hasActiveFeeds && (
          <div className="rounded-[16px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Radio size={16} />
              EASA feeds
            </div>
            <p className="mt-2 text-xs text-[var(--easa-color-text-muted)]">
              Add the default live EASA RSS feeds so ingestion has sources to read.
            </p>
            <button
              className="easa-btn primary mt-4 text-xs"
              disabled={isPending}
              onClick={seedDefaultFeeds}
              type="button"
            >
              {isPending ? "Adding feeds…" : "Add default feeds"}
            </button>
            {feedMessage && (
              <p className="mt-2 text-xs text-[var(--easa-color-accent-green)]">
                {feedMessage}
              </p>
            )}
            {feedError && (
              <p className="mt-2 text-xs text-[var(--easa-color-accent-pink)]">
                {feedError}
              </p>
            )}
          </div>
        )}

        {!hasFlightbooks && (
          <div className="rounded-[16px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <BookOpen size={16} />
              Flight books
            </div>
            <p className="mt-2 text-xs text-[var(--easa-color-text-muted)]">
              Upload your manuals so the app has documents to compare against EASA updates.
            </p>
            <Link className="easa-btn primary mt-4 inline-flex text-xs" href="/flightbooks/upload">
              Upload flight books
            </Link>
          </div>
        )}

        {!hasSchedule && (
          <div className="rounded-[16px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock3 size={16} />
              Automation
            </div>
            <p className="mt-2 text-xs text-[var(--easa-color-text-muted)]">
              Save a schedule if you want automatic pipeline runs instead of manual checks only.
            </p>
            <Link
              className="easa-btn secondary mt-4 inline-flex text-xs"
              href="/settings?tab=automation"
            >
              Open automation
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
