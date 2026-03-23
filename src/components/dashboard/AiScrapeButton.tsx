"use client";

import { useState } from "react";
import { CheckCircle, AlertCircle } from "lucide-react";

type RunResult = {
  ingest?: { count?: number; results?: { feed: string; inserted: number; error: string | null }[] };
  analyze?: { analyzed?: number; provider?: string; bookSectionsUsed?: number };
};

export default function AiScrapeButton() {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [result, setResult] = useState<RunResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runScrape = async () => {
    setStatus("running");
    setResult(null);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/run-scrape", { method: "POST" });
      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Unable to run scrape.");
      }

      setStatus("done");
      setResult({ ingest: payload.ingest, analyze: payload.analyze });
    } catch (error) {
      setStatus("error");
      setErrorMsg(error instanceof Error ? error.message : "Unable to run scrape.");
    }
  };

  return (
    <div className="space-y-3">
      <button
        className="easa-btn primary"
        type="button"
        onClick={runScrape}
        disabled={status === "running"}
      >
        {status === "running" ? "Running pipeline…" : "Run RSS + AI"}
      </button>

      {status === "done" && result && (
        <div className="rounded-[12px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-3 text-xs space-y-1">
          <div className="flex items-center gap-1.5 text-[var(--easa-color-accent-green)] font-medium">
            <CheckCircle size={13} strokeWidth={1.75} />
            Pipeline complete
          </div>
          <p className="text-[var(--easa-color-text-muted)]">
            Fetched {result.ingest?.count ?? 0} RSS items
          </p>
          <p className="text-[var(--easa-color-text-muted)]">
            Analysed {result.analyze?.analyzed ?? 0} new items
            {result.analyze?.provider ? ` · ${result.analyze.provider}` : ""}
            {result.analyze?.bookSectionsUsed ? ` · ${result.analyze.bookSectionsUsed} book sections used` : ""}
          </p>
          {result.ingest?.results?.filter(r => r.error).map(r => (
            <p key={r.feed} className="text-[var(--easa-color-accent-pink)]">
              ⚠ {r.feed}: {r.error}
            </p>
          ))}
        </div>
      )}

      {status === "error" && errorMsg && (
        <div className="flex items-start gap-1.5 rounded-[12px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-3 text-xs text-[var(--easa-color-accent-pink)]">
          <AlertCircle size={13} strokeWidth={1.75} className="mt-0.5 shrink-0" />
          {errorMsg}
        </div>
      )}
    </div>
  );
}
