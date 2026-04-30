"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowLeftRight, GitCompare } from "lucide-react";
import RollbackButton from "@/components/history/RollbackButton";
import ComparePanel from "@/components/history/ComparePanel";

export interface VersionRow {
  id: string;
  version_number: number;
  change_source: string;
  created_at: string;
  flightbook_section_id: string;
  sectionNumber: string | null;
  sectionTitle: string | null;
  flightbookName: string | null;
}

interface Props {
  versions: VersionRow[];
  isAdmin: boolean;
}

function changeSourceLabel(source: string): string {
  const map: Record<string, string> = {
    approved_update: "Approved update",
    ai_generated: "AI generated",
    manual: "Manual edit",
    rollback: "Rollback",
    upload: "Upload",
    approved: "Approved",
  };
  return map[source] ?? source.replace(/_/g, " ");
}

function changeSourceBadgeClass(source: string): string {
  if (source === "rollback") return "easa-badge is-orange";
  if (source === "ai_generated" || source === "approved_update" || source === "approved")
    return "easa-badge is-green";
  if (source === "manual") return "easa-badge is-blue";
  return "easa-badge is-muted";
}

function formatDateHeading(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function groupByDate(versions: VersionRow[]): Map<string, VersionRow[]> {
  const groups = new Map<string, VersionRow[]>();
  for (const v of versions) {
    const dateKey = v.created_at.slice(0, 10);
    if (!groups.has(dateKey)) groups.set(dateKey, []);
    groups.get(dateKey)!.push(v);
  }
  return groups;
}

export default function HistoryClient({ versions, isAdmin }: Props) {
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<VersionRow[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const dateGroupRefs = useRef<Map<string, HTMLElement>>(new Map());

  const dateGroups = groupByDate(versions);
  const sortedDates = Array.from(dateGroups.keys()).sort((a, b) => b.localeCompare(a));

  // Build timeline data: date → count
  const timelineDates = Array.from(dateGroups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vers]) => ({ date, count: vers.length }));

  function toggleSelect(v: VersionRow) {
    setSelected((prev) => {
      const already = prev.find((p) => p.id === v.id);
      if (already) return prev.filter((p) => p.id !== v.id);
      if (prev.length >= 2) return [prev[1], v]; // slide window
      return [...prev, v];
    });
  }

  function scrollToDate(dateKey: string) {
    dateGroupRefs.current.get(dateKey)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Open compare when 2 are selected
  useEffect(() => {
    if (selected.length === 2) setCompareOpen(true);
  }, [selected]);

  function closeCompare() {
    setCompareOpen(false);
    setSelected([]);
  }

  function exitCompareMode() {
    setCompareMode(false);
    setSelected([]);
    setCompareOpen(false);
  }

  return (
    <div className="space-y-6">
      {/* Timeline strip */}
      {timelineDates.length > 0 && (
        <div className="easa-card overflow-x-auto p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--easa-color-text-muted)]">
            Activity timeline
          </p>
          <div className="relative flex min-w-max items-end gap-0">
            {/* Connector line */}
            <div
              className="absolute top-1/2 left-0 right-0 h-px bg-[var(--easa-color-border)]"
              style={{ transform: "translateY(-50%)" }}
            />
            {timelineDates.map(({ date, count }) => {
              const maxCount = Math.max(...timelineDates.map((d) => d.count));
              const dotSize = 8 + Math.round((count / maxCount) * 12); // 8–20px
              const label = new Date(date + "T00:00:00").toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              });
              return (
                <button
                  key={date}
                  type="button"
                  title={`${label} — ${count} version${count !== 1 ? "s" : ""}`}
                  className="group relative flex flex-col items-center px-3 py-2"
                  onClick={() => scrollToDate(date)}
                >
                  <div
                    className="relative z-10 rounded-full bg-[var(--easa-color-accent-teal)] transition group-hover:scale-125 group-hover:bg-[var(--easa-color-brand-primary)]"
                    style={{ width: dotSize, height: dotSize }}
                  />
                  <span className="mt-2 whitespace-nowrap text-[10px] text-[var(--easa-color-text-muted)] group-hover:text-[var(--easa-color-text-primary)]">
                    {label}
                  </span>
                  {count > 1 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--easa-color-surface-3)] px-1 text-[9px] font-bold text-[var(--easa-color-text-muted)]">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Compare mode toggle bar */}
      <div className="flex flex-wrap items-center gap-3">
        {!compareMode ? (
          <button
            type="button"
            className="easa-btn secondary flex items-center gap-2 text-sm"
            onClick={() => setCompareMode(true)}
          >
            <GitCompare size={16} strokeWidth={1.75} />
            Compare versions
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-[var(--easa-color-accent-teal)] px-3 py-1.5 text-sm text-[var(--easa-color-accent-teal)]">
              <ArrowLeftRight size={14} strokeWidth={1.75} />
              Compare mode — select 2 versions
            </div>
            <span className="text-sm text-[var(--easa-color-text-muted)]">
              {selected.length}/2 selected
            </span>
            {selected.length === 2 && (
              <button
                type="button"
                className="easa-btn primary text-sm"
                onClick={() => setCompareOpen(true)}
              >
                View diff
              </button>
            )}
            <button
              type="button"
              className="easa-btn secondary text-sm"
              onClick={exitCompareMode}
            >
              Cancel
            </button>
          </div>
        )}
        <div className="ml-auto">
          <span className="easa-badge is-blue">
            {versions.length} version{versions.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Compare panel */}
      {compareOpen && selected.length === 2 && (
        <ComparePanel
          v1={{
            id: selected[0].id,
            versionNumber: selected[0].version_number,
            changeSource: selected[0].change_source,
            createdAt: selected[0].created_at,
            sectionNumber: selected[0].sectionNumber,
            sectionTitle: selected[0].sectionTitle,
            flightbookName: selected[0].flightbookName,
          }}
          v2={{
            id: selected[1].id,
            versionNumber: selected[1].version_number,
            changeSource: selected[1].change_source,
            createdAt: selected[1].created_at,
            sectionNumber: selected[1].sectionNumber,
            sectionTitle: selected[1].sectionTitle,
            flightbookName: selected[1].flightbookName,
          }}
          onClose={closeCompare}
        />
      )}

      {/* Date groups */}
      {sortedDates.map((dateKey) => {
        const dayVersions = dateGroups.get(dateKey)!;
        return (
          <section
            key={dateKey}
            className="space-y-3"
            ref={(el) => {
              if (el) dateGroupRefs.current.set(dateKey, el);
              else dateGroupRefs.current.delete(dateKey);
            }}
          >
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-[var(--easa-color-text-muted)]">
                {formatDateHeading(dateKey)}
              </h2>
              <div className="h-px flex-1 bg-[var(--easa-color-border)]" />
            </div>

            <div className="space-y-2">
              {dayVersions.map((v) => {
                const sectionLabel = [
                  v.sectionNumber ? `§${v.sectionNumber}` : null,
                  v.sectionTitle,
                ]
                  .filter(Boolean)
                  .join(" — ");
                const isSelected = selected.some((s) => s.id === v.id);
                const isDisabled = compareMode && !isSelected && selected.length >= 2;

                return (
                  <div
                    key={v.id}
                    className={`easa-card flex flex-wrap items-center gap-4 p-4 transition ${
                      compareMode
                        ? isSelected
                          ? "ring-2 ring-[var(--easa-color-accent-teal)]"
                          : isDisabled
                            ? "opacity-40"
                            : "cursor-pointer hover:bg-[var(--easa-color-surface-3)]"
                        : ""
                    }`}
                    onClick={compareMode && !isDisabled ? () => toggleSelect(v) : undefined}
                  >
                    {/* Compare checkbox */}
                    {compareMode && (
                      <div className="shrink-0">
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded border-2 transition ${
                            isSelected
                              ? "border-[var(--easa-color-accent-teal)] bg-[var(--easa-color-accent-teal)]"
                              : "border-[var(--easa-color-border)]"
                          }`}
                        >
                          {isSelected && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path
                                d="M1 4L3.5 6.5L9 1"
                                stroke="white"
                                strokeWidth="1.75"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Section info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {sectionLabel || "Unnamed section"}
                      </p>
                      {v.flightbookName && (
                        <p className="mt-0.5 text-xs text-[var(--easa-color-text-muted)]">
                          {v.flightbookName}
                        </p>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="easa-badge is-muted">v{v.version_number}</span>
                      <span className={changeSourceBadgeClass(v.change_source)}>
                        {changeSourceLabel(v.change_source)}
                      </span>
                      <span className="text-xs text-[var(--easa-color-text-muted)]">
                        {formatTime(v.created_at)}
                      </span>
                    </div>

                    {/* Rollback action */}
                    {isAdmin && !compareMode && (
                      <div className="shrink-0">
                        <RollbackButton
                          sectionId={v.flightbook_section_id}
                          versionNumber={v.version_number}
                          sectionLabel={sectionLabel || "section"}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
