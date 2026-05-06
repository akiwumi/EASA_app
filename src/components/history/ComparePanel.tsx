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

type WordSpan = { type: "equal" | "delete" | "insert"; text: string };
type DiffEntry = { type: "equal" | "delete" | "insert"; line: string; spans?: WordSpan[] };

function lcsDP(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  return dp;
}

function diffLines(oldLines: string[], newLines: string[]): DiffEntry[] {
  if (oldLines.length * newLines.length > 40000) {
    return [
      ...oldLines.map((l) => ({ type: "delete" as const, line: l })),
      ...newLines.map((l) => ({ type: "insert" as const, line: l })),
    ];
  }

  const dp = lcsDP(oldLines, newLines);
  const result: DiffEntry[] = [];
  let i = 0;
  let j = 0;
  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      result.push({ type: "equal", line: oldLines[i] });
      i++; j++;
    } else if (j < newLines.length && (i >= oldLines.length || dp[i + 1][j] <= dp[i][j + 1])) {
      result.push({ type: "insert", line: newLines[j] });
      j++;
    } else {
      result.push({ type: "delete", line: oldLines[i] });
      i++;
    }
  }
  return result;
}

function diffWords(oldText: string, newText: string): { old: WordSpan[]; new: WordSpan[] } {
  const tokenize = (s: string) => s.split(/(\s+)/);
  const a = tokenize(oldText);
  const b = tokenize(newText);

  if (a.length * b.length > 8000) {
    return {
      old: [{ type: "delete", text: oldText }],
      new: [{ type: "insert", text: newText }],
    };
  }

  const dp = lcsDP(a, b);
  const oldSpans: WordSpan[] = [];
  const newSpans: WordSpan[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      oldSpans.push({ type: "equal", text: a[i] });
      newSpans.push({ type: "equal", text: b[j] });
      i++; j++;
    } else if (j < b.length && (i >= a.length || dp[i + 1][j] <= dp[i][j + 1])) {
      newSpans.push({ type: "insert", text: b[j] });
      j++;
    } else {
      oldSpans.push({ type: "delete", text: a[i] });
      i++;
    }
  }
  return { old: oldSpans, new: newSpans };
}

function annotateDiff(entries: DiffEntry[]): DiffEntry[] {
  const result: DiffEntry[] = [];
  let i = 0;
  while (i < entries.length) {
    if (entries[i].type === "equal") {
      result.push(entries[i]);
      i++;
      continue;
    }
    const blockStart = i;
    while (i < entries.length && entries[i].type !== "equal") i++;
    const block = entries.slice(blockStart, i);
    const deletes = block.filter((e) => e.type === "delete");
    const inserts = block.filter((e) => e.type === "insert");
    const pairCount = Math.min(deletes.length, inserts.length);
    for (let k = 0; k < pairCount; k++) {
      const wd = diffWords(deletes[k].line, inserts[k].line);
      deletes[k] = { ...deletes[k], spans: wd.old };
      inserts[k] = { ...inserts[k], spans: wd.new };
    }
    result.push(...deletes, ...inserts);
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

function LineGutter({ num, type }: { num: number | null; type: "delete" | "insert" | "equal" }) {
  const color =
    type === "delete"
      ? "text-[var(--easa-color-accent-red)]"
      : type === "insert"
        ? "text-[var(--easa-color-accent-green)]"
        : "text-[var(--easa-color-text-muted)]";
  return (
    <span
      className={`mr-3 inline-block w-8 shrink-0 select-none text-right text-[10px] tabular-nums opacity-50 ${color}`}
    >
      {num ?? ""}
    </span>
  );
}

function renderSpans(spans: WordSpan[] | undefined, fallback: string, side: "delete" | "insert") {
  if (!spans) return fallback || " ";
  return spans.map((span, i) => {
    if (span.type === "equal") return <span key={i}>{span.text}</span>;
    if (span.type === side) {
      const bg = side === "delete" ? "bg-[rgba(240,92,98,0.35)]" : "bg-[rgba(67,209,123,0.35)]";
      return (
        <mark key={i} className={`rounded-[2px] ${bg}`} style={{ background: undefined }}>
          {span.text}
        </mark>
      );
    }
    return null;
  });
}

function SplitView({ diff }: { diff: DiffEntry[] }) {
  const leftLines = diff.filter((d) => d.type !== "insert");
  const rightLines = diff.filter((d) => d.type !== "delete");
  let leftNum = 0;
  let rightNum = 0;

  return (
    <div className="grid grid-cols-2 divide-x divide-[var(--easa-color-border)]">
      <pre className="max-h-[500px] overflow-auto p-4 text-xs leading-relaxed whitespace-pre-wrap font-mono">
        {leftLines.map((d, idx) => {
          const num = d.type !== "insert" ? ++leftNum : null;
          return (
            <span
              key={idx}
              className={`block ${d.type === "delete" ? "bg-[rgba(240,92,98,0.12)] text-[var(--easa-color-accent-red)]" : ""}`}
            >
              <LineGutter num={num} type={d.type} />
              <span className="mr-1 select-none opacity-60">{d.type === "delete" ? "−" : " "}</span>
              {d.type === "delete" ? renderSpans(d.spans, d.line, "delete") : (d.line || " ")}
            </span>
          );
        })}
      </pre>
      <pre className="max-h-[500px] overflow-auto p-4 text-xs leading-relaxed whitespace-pre-wrap font-mono">
        {rightLines.map((d, idx) => {
          const num = d.type !== "delete" ? ++rightNum : null;
          return (
            <span
              key={idx}
              className={`block ${d.type === "insert" ? "bg-[rgba(67,209,123,0.12)] text-[var(--easa-color-accent-green)]" : ""}`}
            >
              <LineGutter num={num} type={d.type} />
              <span className="mr-1 select-none opacity-60">{d.type === "insert" ? "+" : " "}</span>
              {d.type === "insert" ? renderSpans(d.spans, d.line, "insert") : (d.line || " ")}
            </span>
          );
        })}
      </pre>
    </div>
  );
}

function UnifiedView({ diff }: { diff: DiffEntry[] }) {
  let oldNum = 0;
  let newNum = 0;

  return (
    <pre className="max-h-[500px] overflow-auto p-4 text-xs leading-relaxed whitespace-pre-wrap font-mono">
      {diff.map((d, idx) => {
        const oldN = d.type !== "insert" ? ++oldNum : null;
        const newN = d.type !== "delete" ? ++newNum : null;
        return (
          <span
            key={idx}
            className={`block ${
              d.type === "delete"
                ? "bg-[rgba(240,92,98,0.12)] text-[var(--easa-color-accent-red)]"
                : d.type === "insert"
                  ? "bg-[rgba(67,209,123,0.12)] text-[var(--easa-color-accent-green)]"
                  : ""
            }`}
          >
            <span className="mr-3 inline-block w-16 shrink-0 select-none text-right text-[10px] tabular-nums opacity-40">
              {d.type === "delete"
                ? String(oldN ?? "")
                : d.type === "insert"
                  ? `+${newN ?? ""}`
                  : `${oldN ?? ""}/${newN ?? ""}`}
            </span>
            <span className="mr-1 select-none opacity-60">
              {d.type === "delete" ? "−" : d.type === "insert" ? "+" : " "}
            </span>
            {d.type === "delete"
              ? renderSpans(d.spans, d.line, "delete")
              : d.type === "insert"
                ? renderSpans(d.spans, d.line, "insert")
                : (d.line || " ")}
          </span>
        );
      })}
    </pre>
  );
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
          const d = annotateDiff(diffLines(left.body.split("\n"), right.body.split("\n")));
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
          Loading versions&hellip;
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

          {hasChanges && viewMode === "split" && <SplitView diff={diff} />}

          {hasChanges && viewMode === "unified" && <UnifiedView diff={diff} />}

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
