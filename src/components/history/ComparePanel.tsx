"use client";

import { useEffect, useState } from "react";
import { X, Loader2, ArrowLeftRight } from "lucide-react";

interface VersionMeta {
  id: string;
  versionNumber: number;
  changeSource: string;
  createdAt: string;
  sectionNumber: string | null;
  sectionTitle: string | null;
  flightbookName: string | null;
}

interface VersionFull extends VersionMeta {
  body: string;
  flightbookSectionId: string;
}

interface Props {
  v1: VersionMeta;
  v2: VersionMeta;
  onClose: () => void;
}

type DiffEntry = { type: "equal" | "delete" | "insert"; line: string };

function diffLines(oldLines: string[], newLines: string[]): DiffEntry[] {
  // Guard: fall back to simple side-by-side if texts are very long
  if (oldLines.length * newLines.length > 40000) {
    return [
      ...oldLines.map((l) => ({ type: "delete" as const, line: l })),
      ...newLines.map((l) => ({ type: "insert" as const, line: l })),
    ];
  }

  const m = oldLines.length;
  const n = newLines.length;

  // LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (oldLines[i] === newLines[j]) {
        dp[i][j] = 1 + dp[i + 1][j + 1];
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Backtrack
  const result: DiffEntry[] = [];
  let i = 0;
  let j = 0;
  while (i < m || j < n) {
    if (i < m && j < n && oldLines[i] === newLines[j]) {
      result.push({ type: "equal", line: oldLines[i] });
      i++;
      j++;
    } else if (j < n && (i >= m || dp[i + 1][j] <= dp[i][j + 1])) {
      result.push({ type: "insert", line: newLines[j] });
      j++;
    } else {
      result.push({ type: "delete", line: oldLines[i] });
      i++;
    }
  }
  return result;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sourceLabel(source: string) {
  const map: Record<string, string> = {
    approved_update: "Approved update",
    ai_generated: "AI generated",
    manual: "Manual edit",
    rollback: "Rollback",
    upload: "Upload",
  };
  return map[source] ?? source.replace(/_/g, " ");
}

export default function ComparePanel({ v1, v2, onClose }: Props) {
  const [versions, setVersions] = useState<[VersionFull, VersionFull] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diff, setDiff] = useState<DiffEntry[] | null>(null);
  const [viewMode, setViewMode] = useState<"split" | "unified">("split");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      fetch(`/api/history/compare?v1=${v1.id}&v2=${v2.id}`)
        .then((r) => r.ok ? r.json() : r.json().then((j) => Promise.reject(j.error)))
        .then((json) => {
          const [left, right] = json.versions as VersionFull[];
          setVersions([left, right]);
          const d = diffLines(left.body.split("\n"), right.body.split("\n"));
          setDiff(d);
        })
        .catch((e) => setError(typeof e === "string" ? e : "Failed to load versions"))
        .finally(() => setLoading(false));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [v1.id, v2.id]);

  const sectionLabel = [
    v1.sectionNumber ? `§${v1.sectionNumber}` : null,
    v1.sectionTitle,
  ]
    .filter(Boolean)
    .join(" — ");

  const hasChanges = diff ? diff.some((d) => d.type !== "equal") : false;

  return (
    <div className="easa-card overflow-hidden p-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-5 py-3">
        <div className="flex items-center gap-2">
          <ArrowLeftRight size={16} strokeWidth={1.75} className="text-[var(--easa-color-accent-teal)]" />
          <h2 className="text-sm font-semibold">
            Compare versions
            {sectionLabel ? ` — ${sectionLabel}` : ""}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {!loading && !error && (
            <div className="flex overflow-hidden rounded-lg border border-[var(--easa-color-border)]">
              <button
                type="button"
                className={`px-3 py-1.5 text-xs font-medium transition ${viewMode === "split" ? "bg-[var(--easa-color-brand-primary)] text-white" : "text-[var(--easa-color-text-secondary)] hover:bg-[var(--easa-color-surface-3)]"}`}
                onClick={() => setViewMode("split")}
              >
                Split
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 text-xs font-medium transition ${viewMode === "unified" ? "bg-[var(--easa-color-brand-primary)] text-white" : "text-[var(--easa-color-text-secondary)] hover:bg-[var(--easa-color-surface-3)]"}`}
                onClick={() => setViewMode("unified")}
              >
                Unified
              </button>
            </div>
          )}
          <button
            type="button"
            className="easa-btn secondary p-1.5"
            onClick={onClose}
            aria-label="Close compare"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Version metadata strip */}
      <div className="grid grid-cols-2 divide-x divide-[var(--easa-color-border)] border-b border-[var(--easa-color-border)]">
        {([v1, v2] as VersionMeta[]).map((v, i) => (
          <div key={v.id} className={`px-4 py-2 ${i === 0 ? "bg-[color-mix(in_srgb,var(--easa-color-accent-red)_5%,transparent)]" : "bg-[color-mix(in_srgb,var(--easa-color-accent-green)_5%,transparent)]"}`}>
            <p className="text-xs font-semibold">
              <span className={`mr-2 ${i === 0 ? "text-[var(--easa-color-accent-red)]" : "text-[var(--easa-color-accent-green)]"}`}>
                {i === 0 ? "Before (v" : "After (v"}{v.versionNumber})
              </span>
              <span className="font-normal text-[var(--easa-color-text-muted)]">
                {sourceLabel(v.changeSource)}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-[var(--easa-color-text-muted)]">
              {formatDateTime(v.createdAt)}
            </p>
          </div>
        ))}
      </div>

      {/* Body */}
      {loading && (
        <div className="flex items-center justify-center gap-2 p-10 text-sm text-[var(--easa-color-text-muted)]">
          <Loader2 size={16} strokeWidth={1.75} className="animate-spin" />
          Loading versions…
        </div>
      )}

      {error && (
        <div className="p-6">
          <p className="text-sm text-[var(--easa-color-accent-pink)]">{error}</p>
        </div>
      )}

      {!loading && !error && diff && versions && (
        <>
          {!hasChanges && (
            <div className="p-5 text-center text-sm text-[var(--easa-color-text-muted)]">
              No differences between these two versions.
            </div>
          )}

          {hasChanges && viewMode === "split" && (
            <div className="grid grid-cols-2 divide-x divide-[var(--easa-color-border)]">
              {/* Left: old lines (removed) */}
              <pre className="max-h-[500px] overflow-auto p-4 text-xs leading-relaxed whitespace-pre-wrap font-mono">
                {diff
                  .filter((d) => d.type !== "insert")
                  .map((d, idx) => (
                    <span
                      key={idx}
                      className={`block ${d.type === "delete" ? "bg-[rgba(240,92,98,0.15)] text-[var(--easa-color-accent-red)]" : ""}`}
                    >
                      {d.type === "delete" ? "− " : "  "}
                      {d.line || "\u00A0"}
                    </span>
                  ))}
              </pre>
              {/* Right: new lines (added) */}
              <pre className="max-h-[500px] overflow-auto p-4 text-xs leading-relaxed whitespace-pre-wrap font-mono">
                {diff
                  .filter((d) => d.type !== "delete")
                  .map((d, idx) => (
                    <span
                      key={idx}
                      className={`block ${d.type === "insert" ? "bg-[rgba(67,209,123,0.15)] text-[var(--easa-color-accent-green)]" : ""}`}
                    >
                      {d.type === "insert" ? "+ " : "  "}
                      {d.line || "\u00A0"}
                    </span>
                  ))}
              </pre>
            </div>
          )}

          {hasChanges && viewMode === "unified" && (
            <pre className="max-h-[500px] overflow-auto p-4 text-xs leading-relaxed whitespace-pre-wrap font-mono">
              {diff.map((d, idx) => (
                <span
                  key={idx}
                  className={`block ${
                    d.type === "delete"
                      ? "bg-[rgba(240,92,98,0.15)] text-[var(--easa-color-accent-red)]"
                      : d.type === "insert"
                        ? "bg-[rgba(67,209,123,0.15)] text-[var(--easa-color-accent-green)]"
                        : ""
                  }`}
                >
                  {d.type === "delete" ? "− " : d.type === "insert" ? "+ " : "  "}
                  {d.line || "\u00A0"}
                </span>
              ))}
            </pre>
          )}

          {/* Stats footer */}
          <div className="flex items-center gap-4 border-t border-[var(--easa-color-border)] px-5 py-2 text-xs text-[var(--easa-color-text-muted)]">
            <span className="text-[var(--easa-color-accent-green)]">
              + {diff.filter((d) => d.type === "insert").length} added
            </span>
            <span className="text-[var(--easa-color-accent-red)]">
              − {diff.filter((d) => d.type === "delete").length} removed
            </span>
            <span>
              {diff.filter((d) => d.type === "equal").length} unchanged
            </span>
          </div>
        </>
      )}
    </div>
  );
}
