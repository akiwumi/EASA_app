"use client";

import { useState, useEffect } from "react";
import { CheckCircle, AlertCircle, RefreshCw, Database } from "lucide-react";
import Link from "next/link";

type RunResult = {
  ingest?: { count?: number; results?: { feed: string; inserted: number; error: string | null }[]; note?: string };
  regulationIngest?: {
    processed?: number;
    snapshotsCreated?: number;
    sectionsCreated?: number;
    embeddedSections?: number;
    results?: { source: string; status: string; sectionsCreated: number; error: string | null }[];
  } | null;
  analyze?: { analyzed?: number; provider?: string; bookSectionsUsed?: number };
  aggregate?: { created?: number } | null;
};

type PipelineStatus = {
  sources: { total: number; activeRss: number };
  rssItems: number;
  aiFindings: number;
  regChanges: number;
  sourceSnapshots: number;
  documentSections: number;
  aiConfig: { provider: string; model: string; hasKey: boolean } | null;
};

type AiScrapeButtonProps = {
  compact?: boolean;
};

export default function AiScrapeButton({ compact = false }: AiScrapeButtonProps) {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [result, setResult] = useState<RunResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  const [seeding, setSeeding] = useState(false);

  async function loadStatus() {
    const res = await fetch("/api/admin/pipeline-status");
    if (res.ok) setPipelineStatus(await res.json());
  }

  useEffect(() => { loadStatus(); }, []);

  async function seedSources() {
    setSeeding(true);
    await fetch("/api/admin/seed-sources", { method: "POST" });
    await loadStatus();
    setSeeding(false);
  }

  async function runScrape() {
    setStatus("running");
    setResult(null);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/run-scrape", { method: "POST" });
      const payload = await response.json();

      if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? "Unable to run scrape.");

      setStatus("done");
      setResult({
        ingest: payload.ingest,
        regulationIngest: payload.regulationIngest,
        analyze: payload.analyze,
        aggregate: payload.aggregate,
      });
      await loadStatus();
    } catch (error) {
      setStatus("error");
      setErrorMsg(error instanceof Error ? error.message : "Unable to run scrape.");
    }
  }

  const noActiveFeeds = pipelineStatus && pipelineStatus.sources.activeRss === 0;
  const noApiKey = pipelineStatus && !pipelineStatus.aiConfig?.hasKey;

  if (compact) {
    return (
      <div className="shrink-0">
        <button
          className="easa-btn secondary flex items-center gap-1.5 whitespace-nowrap text-sm"
          type="button"
          onClick={runScrape}
          disabled={status === "running"}
        >
          <RefreshCw size={13} strokeWidth={1.75} className={status === "running" ? "animate-spin" : ""} />
          {status === "running" ? "Running now…" : "Run now"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Status row */}
      {pipelineStatus && (
        <div className="grid grid-cols-3 gap-2 text-center text-xs md:grid-cols-6">
          <div className="rounded-[10px] bg-[var(--easa-color-surface-2)] px-2 py-1.5">
            <p className="font-medium">{pipelineStatus.sources.activeRss}</p>
            <p className="text-[var(--easa-color-text-muted)]">active feeds</p>
          </div>
          <div className="rounded-[10px] bg-[var(--easa-color-surface-2)] px-2 py-1.5">
            <p className="font-medium">{pipelineStatus.rssItems}</p>
            <p className="text-[var(--easa-color-text-muted)]">items stored</p>
          </div>
          <div className="rounded-[10px] bg-[var(--easa-color-surface-2)] px-2 py-1.5">
            <p className="font-medium">{pipelineStatus.aiFindings}</p>
            <p className="text-[var(--easa-color-text-muted)]">AI findings</p>
          </div>
          <div className="rounded-[10px] bg-[var(--easa-color-surface-2)] px-2 py-1.5">
            <p className="font-medium">{pipelineStatus.regChanges ?? 0}</p>
            <p className="text-[var(--easa-color-text-muted)]">reg changes</p>
          </div>
          <div className="rounded-[10px] bg-[var(--easa-color-surface-2)] px-2 py-1.5">
            <p className="font-medium">{pipelineStatus.sourceSnapshots ?? 0}</p>
            <p className="text-[var(--easa-color-text-muted)]">snapshots</p>
          </div>
          <div className="rounded-[10px] bg-[var(--easa-color-surface-2)] px-2 py-1.5">
            <p className="font-medium">{pipelineStatus.documentSections ?? 0}</p>
            <p className="text-[var(--easa-color-text-muted)]">reg sections</p>
          </div>
        </div>
      )}

      {/* Warnings */}
      {noActiveFeeds && (
        <p className="text-xs text-[var(--easa-color-accent-orange)]">
          ⚠ No active RSS feeds.{" "}
          <button className="underline" onClick={seedSources} disabled={seeding}>
            {seeding ? "Adding…" : "Add default EASA feeds"}
          </button>
          {" or "}
          <Link href="/settings?tab=sources" className="underline">manage feeds</Link>.
        </p>
      )}
      {noApiKey && (
        <p className="text-xs text-[var(--easa-color-accent-orange)]">
          ⚠ No AI API key configured.{" "}
          <Link href="/settings?tab=ai" className="underline">Add one in AI settings</Link>.
          {" "}AI analysis will use keyword heuristics only.
        </p>
      )}

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          className="easa-btn primary flex items-center gap-1.5"
          type="button"
          onClick={runScrape}
          disabled={status === "running"}
        >
          <RefreshCw size={13} strokeWidth={1.75} className={status === "running" ? "animate-spin" : ""} />
          {status === "running" ? "Running…" : "Run RSS + AI"}
        </button>
        <button
          className="easa-btn secondary flex items-center gap-1.5"
          type="button"
          onClick={loadStatus}
          title="Refresh status"
        >
          <Database size={13} strokeWidth={1.75} />
        </button>
      </div>

      {/* Run result */}
      {status === "done" && result && (
        <div className="rounded-[12px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-3 text-xs space-y-1">
          <div className="flex items-center gap-1.5 text-[var(--easa-color-accent-green)] font-medium">
            <CheckCircle size={13} strokeWidth={1.75} />
            Pipeline complete
          </div>
          {result.ingest?.note ? (
            <p className="text-[var(--easa-color-accent-orange)]">{result.ingest.note}</p>
          ) : (
            <p className="text-[var(--easa-color-text-muted)]">Fetched {result.ingest?.count ?? 0} RSS items</p>
          )}
          {result.regulationIngest && (
            <p className="text-[var(--easa-color-text-muted)]">
              Regulation corpus: {result.regulationIngest.sectionsCreated ?? 0} new sections
              {typeof result.regulationIngest.embeddedSections === "number"
                ? ` · ${result.regulationIngest.embeddedSections} embedded`
                : ""}
            </p>
          )}
          <p className="text-[var(--easa-color-text-muted)]">
            Analysed {result.analyze?.analyzed ?? 0} new items
            {result.analyze?.provider ? ` · ${result.analyze.provider}` : ""}
            {result.analyze?.bookSectionsUsed ? ` · ${result.analyze.bookSectionsUsed} book sections` : ""}
          </p>
          {(result.aggregate?.created ?? 0) > 0 && (
            <p className="text-[var(--easa-color-text-muted)]">
              Aggregated {result.aggregate!.created} new reg changes
            </p>
          )}
          {result.ingest?.results?.filter(r => r.error).map(r => (
            <p key={r.feed} className="text-[var(--easa-color-accent-pink)] break-all">⚠ {r.feed}: {r.error}</p>
          ))}
          {result.regulationIngest?.results?.filter((r) => r.error).map((r) => (
            <p key={r.source} className="text-[var(--easa-color-accent-pink)] break-all">⚠ {r.source}: {r.error}</p>
          ))}
          <div className="flex gap-3 mt-1">
            {(result.analyze?.analyzed ?? 0) > 0 && (
              <Link href="/results" className="text-[var(--easa-color-accent-blue)] underline">
                View results →
              </Link>
            )}
            {(result.aggregate?.created ?? 0) > 0 && (
              <Link href="/changes" className="text-[var(--easa-color-accent-blue)] underline">
                View changes →
              </Link>
            )}
          </div>
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
