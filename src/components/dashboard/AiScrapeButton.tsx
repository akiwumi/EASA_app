"use client";

import { useState } from "react";

export default function AiScrapeButton() {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);

  const runScrape = async () => {
    setStatus("running");
    setMessage(null);

    try {
      const response = await fetch("/api/run-scrape", { method: "POST" });
      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Unable to run scrape.");
      }

      setStatus("done");
      setMessage("RSS ingest and AI analysis completed.");
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : "Unable to run scrape.";
      setStatus("error");
      setMessage(messageText);
    }
  };

  return (
    <div>
      <button
        className="easa-btn primary"
        type="button"
        onClick={runScrape}
        disabled={status === "running"}
      >
        {status === "running" ? "Running pipeline..." : "Run RSS + AI"}
      </button>
      {message ? (
        <p className="mt-3 text-xs text-[var(--easa-color-text-muted)]">{message}</p>
      ) : null}
    </div>
  );
}
