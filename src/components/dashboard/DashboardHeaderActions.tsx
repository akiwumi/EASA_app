"use client";

import { useState } from "react";
import Link from "next/link";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";

type RunResult = {
  ingest?: { count?: number; note?: string };
  analyze?: { analyzed?: number };
};

export default function DashboardHeaderActions() {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [result, setResult] = useState<RunResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function runScrape() {
    setStatus("running");
    setResult(null);
    setErrorMsg(null);
    try {
      const response = await fetch("/api/run-scrape", { method: "POST" });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? "Unable to run scrape.");
      setStatus("done");
      setResult({ ingest: payload.ingest, analyze: payload.analyze });
    } catch (error) {
      setStatus("error");
      setErrorMsg(error instanceof Error ? error.message : "Unable to run scrape.");
    }
  }

  const noticeText = status === "done" && result
    ? result.ingest?.note
      ? result.ingest.note
      : `Pipeline complete. Fetched ${result.ingest?.count ?? 0} RSS items; analyzed ${result.analyze?.analyzed ?? 0} new items.`
    : null;

  return (
    <div className="flex min-w-0 w-full flex-col items-stretch gap-3">
      <div className="grid min-w-0 gap-4 md:grid-cols-3">
        <button
          className="easa-btn secondary flex w-full items-center justify-center gap-2 text-lg md:text-xl"
          type="button"
          onClick={runScrape}
          disabled={status === "running"}
        >
          <RefreshCw size={20} strokeWidth={2} className={status === "running" ? "animate-spin" : ""} />
          {status === "running" ? "Running now…" : "Run now"}
        </button>

        <Link className="easa-btn secondary w-full justify-center text-lg md:text-xl" href="/results">
          View AI results
        </Link>
        <Link className="easa-btn secondary w-full justify-center text-lg md:text-xl" href="/updates">
          Open update queue
        </Link>
      </div>

      {noticeText && (
        <div className="flex min-w-0 items-center gap-2 rounded-[12px] border border-[var(--easa-color-accent-blue)] bg-[var(--easa-color-accent-orange)]/12 px-3 py-2 text-xs font-medium text-[var(--easa-color-accent-blue)]">
          <CheckCircle size={13} strokeWidth={1.75} className="shrink-0" />
          <span className="min-w-0 break-words">{noticeText}</span>
        </div>
      )}

      {status === "error" && errorMsg && (
        <div className="flex min-w-0 items-center gap-2 rounded-[12px] border border-[var(--easa-color-accent-pink)]/40 bg-[var(--easa-color-accent-pink)]/8 px-3 py-2 text-xs text-[var(--easa-color-accent-pink)]">
          <AlertCircle size={13} strokeWidth={1.75} className="shrink-0" />
          <span className="min-w-0 break-words">{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
