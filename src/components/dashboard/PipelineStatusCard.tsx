import Link from "next/link";
import { CheckCircle2, XCircle, Loader2, Clock, AlertCircle } from "lucide-react";
import type { PipelinePreview } from "@/services/dashboard";

function relativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function extractStepCounts(steps: Record<string, unknown> | null): { ingested: number; analyzed: number } {
  if (!steps) return { ingested: 0, analyzed: 0 };
  const ingest = steps.ingest as Record<string, unknown> | null | undefined;
  const analyze = steps.analyze as Record<string, unknown> | null | undefined;
  return {
    ingested: typeof ingest?.count === "number" ? ingest.count : 0,
    analyzed: typeof analyze?.analyzed === "number" ? analyze.analyzed : 0,
  };
}

export default function PipelineStatusCard({ lastRun }: { lastRun: PipelinePreview | null }) {
  const { ingested, analyzed } = extractStepCounts(lastRun?.steps ?? null);
  const status = lastRun?.status ?? "never";
  const ranAt = lastRun?.finishedAt ?? lastRun?.startedAt ?? null;

  return (
    <div className="easa-card overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-[var(--easa-color-border)] px-5 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--easa-color-text-muted)]">
          Pipeline status
        </p>
        <Link
          href="/results"
          className="text-xs text-[var(--easa-color-accent-blue)] hover:underline"
        >
          View results
        </Link>
      </div>

      <div className="flex items-center gap-4 px-5 py-4">
        {/* Status icon */}
        <div className="shrink-0">
          {status === "running" && (
            <Loader2 size={22} strokeWidth={1.75} className="animate-spin text-[var(--easa-color-accent-blue)]" />
          )}
          {status === "success" && (
            <CheckCircle2 size={22} strokeWidth={1.75} className="text-[var(--easa-color-accent-green)]" />
          )}
          {status === "error" && (
            <XCircle size={22} strokeWidth={1.75} className="text-[var(--easa-color-accent-pink)]" />
          )}
          {(status === "never" || status === "pending") && (
            <Clock size={22} strokeWidth={1.75} className="text-[var(--easa-color-text-muted)]" />
          )}
        </div>

        {/* Body */}
        <div className="min-w-0 flex-1">
          {lastRun ? (
            <>
              <p className="text-sm font-medium capitalize">
                {status === "running"
                  ? "Pipeline running…"
                  : status === "success"
                  ? "Last run succeeded"
                  : status === "error"
                  ? "Last run failed"
                  : "Pending"}
              </p>
              <p className="mt-0.5 text-xs text-[var(--easa-color-text-muted)]">
                {relativeTime(ranAt)}
                {status === "success" && (ingested > 0 || analyzed > 0) && (
                  <> · {ingested} items ingested · {analyzed} analyzed</>
                )}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-[var(--easa-color-text-muted)]">No runs yet</p>
              <p className="mt-0.5 text-xs text-[var(--easa-color-text-muted)]">
                Run the pipeline from the dashboard to start monitoring.
              </p>
            </>
          )}
        </div>

        {/* Alert badge for errors */}
        {status === "error" && (
          <AlertCircle size={16} strokeWidth={1.75} className="shrink-0 text-[var(--easa-color-accent-pink)]" />
        )}
      </div>
    </div>
  );
}
