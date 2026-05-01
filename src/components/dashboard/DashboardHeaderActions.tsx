"use client";

import { useState } from "react";
import Link from "next/link";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";

type RunResult = {
  ingest?: { count?: number; note?: string };
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
      setResult({ ingest: payload.ingest });
    } catch (error) {
      setStatus("error");
      setErrorMsg(error instanceof Error ? error.message : "Unable to run scrape.");
    }
  }

  const noticeText = status === "done" && result
    ? result.ingest?.note
      ? result.ingest.note
      : `Pipeline complete. Fetched ${result.ingest?.count ?? 0} RSS items.`
    : null;

  return (
    <div className="shrink-0 flex flex-col items-start md:items-end gap-2">
      {/* ── Button row — never shifts when notification appears ─────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <Link className="easa-btn primary whitespace-nowrap text-sm" href="/settings?tab=setup">
          Finish setup
        </Link>

        <button
          className="easa-btn secondary flex items-center gap-1.5 whitespace-nowrap text-sm"
          type="button"
          onClick={runScrape}
          disabled={status === "running"}
        >
          <RefreshCw size={13} strokeWidth={1.75} className={status === "running" ? "animate-spin" : ""} />
          {status === "running" ? "Running now…" : "Run now"}
        </button>

        <Link className="easa-btn secondary whitespace-nowrap text-sm" href="/results">
          View AI results
        </Link>
        <Link className="easa-btn secondary whitespace-nowrap text-sm" href="/updates">
          Open update queue
        </Link>
      </div>

      {/* ── Notification — always below buttons, never disrupts their row ── */}
      {noticeText && (
        <div className="flex items-center gap-2 rounded-[12px] border border-[var(--easa-color-accent-blue)] bg-[var(--easa-color-accent-orange)]/12 px-3 py-2 text-xs font-medium text-[var(--easa-color-accent-blue)]">
          <CheckCircle size={13} strokeWidth={1.75} className="shrink-0" />
          <span>{noticeText}</span>
        </div>
      )}

      {status === "error" && errorMsg && (
        <div className="flex items-center gap-2 rounded-[12px] border border-[var(--easa-color-accent-pink)]/40 bg-[var(--easa-color-accent-pink)]/8 px-3 py-2 text-xs text-[var(--easa-color-accent-pink)]">
          <AlertCircle size={13} strokeWidth={1.75} className="shrink-0" />
          <span className="break-words">{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
