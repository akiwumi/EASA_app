"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, ExternalLink } from "lucide-react";
import Link from "next/link";
import RollbackButton from "@/components/history/RollbackButton";

export interface RollbackVersionRow {
  id: string;
  version_number: number;
  change_source: string;
  created_at: string;
  flightbook_section_id: string;
  flightbookId: string | null;
  sectionNumber: string | null;
  sectionTitle: string | null;
  flightbookName: string | null;
}

interface Props {
  versions: RollbackVersionRow[];
  isAdmin: boolean;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SOURCE_LABELS: Record<string, string> = {
  approved_update: "Approved update",
  ai_generated: "AI generated",
  manual: "Manual edit",
  manual_edit: "Manual edit",
  rollback: "Rollback",
  upload: "Upload",
  approved: "Approved",
  manual_version: "Manual full-book version",
  baseline: "Initial baseline",
};

function sourceLabel(source: string) {
  if (source.startsWith("ai-finding:")) return "Approved AI finding";
  return SOURCE_LABELS[source] ?? source.replace(/_/g, " ");
}

function sourceBadgeClass(source: string) {
  if (source === "rollback") return "easa-badge is-orange";
  if (
    source === "ai_generated" ||
    source === "approved_update" ||
    source === "approved" ||
    source.startsWith("ai-finding:")
  )
    return "easa-badge is-green";
  if (source === "manual" || source === "manual_edit") return "easa-badge is-blue";
  return "easa-badge is-muted";
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMonthYear(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function toLocalDateKey(iso: string) {
  // Use UTC date to stay consistent with how they were stored
  return iso.slice(0, 10);
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

// 0=Sun,1=Mon,...,6=Sat → convert to Mon-first: Mon=0, Sun=6
function mondayFirst(jsDay: number) {
  return (jsDay + 6) % 7;
}

export default function RollbackCalendar({ versions, isAdmin }: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Index versions by date key
  const byDate = new Map<string, RollbackVersionRow[]>();
  for (const v of versions) {
    const key = toLocalDateKey(v.created_at);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(v);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDow = mondayFirst(new Date(viewYear, viewMonth, 1).getDay()); // leading blank cells
  const todayKey = toLocalDateKey(today.toISOString());

  const selectedVersions = selectedDate ? (byDate.get(selectedDate) ?? []) : [];

  // Most recent date with data (for default selection hint)
  const activeDates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      {/* Calendar card */}
      <div className="easa-card p-5">
        {/* Month navigation */}
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            className="easa-btn secondary flex items-center gap-1 px-2 py-1.5 text-sm"
            onClick={prevMonth}
            aria-label="Previous month"
          >
            <ChevronLeft size={16} strokeWidth={1.75} />
          </button>
          <h2 className="text-base font-semibold">{formatMonthYear(viewYear, viewMonth)}</h2>
          <button
            type="button"
            className="easa-btn secondary flex items-center gap-1 px-2 py-1.5 text-sm"
            onClick={nextMonth}
            aria-label="Next month"
          >
            <ChevronRight size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="mb-1 grid grid-cols-7 gap-1">
          {DAYS.map((d) => (
            <div
              key={d}
              className="py-1 text-center text-[11px] font-medium uppercase tracking-wide text-[var(--easa-color-text-muted)]"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {/* Leading blank cells */}
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={`blank-${i}`} />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const count = byDate.get(dateKey)?.length ?? 0;
            const hasActivity = count > 0;
            const isToday = dateKey === todayKey;
            const isSelected = dateKey === selectedDate;

            return (
              <button
                key={dateKey}
                type="button"
                disabled={!hasActivity}
                onClick={() => setSelectedDate(isSelected ? null : dateKey)}
                className={[
                  "relative flex flex-col items-center justify-center rounded-xl py-2 text-sm font-medium transition",
                  hasActivity ? "cursor-pointer hover:bg-[var(--easa-color-surface-3)]" : "cursor-default opacity-30",
                  isSelected
                    ? "bg-[var(--easa-color-brand-primary)] text-white hover:bg-[var(--easa-color-brand-primary)]"
                    : isToday && !isSelected
                    ? "ring-2 ring-[var(--easa-color-brand-primary)] ring-offset-1 ring-offset-[var(--easa-color-surface)]"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span>{day}</span>
                {hasActivity && !isSelected && (
                  <span className="mt-0.5 flex gap-[3px]">
                    {Array.from({ length: Math.min(count, 4) }).map((_, di) => (
                      <span
                        key={di}
                        className="block h-[4px] w-[4px] rounded-full bg-[var(--easa-color-accent-teal)]"
                      />
                    ))}
                    {count > 4 && (
                      <span className="text-[9px] leading-none text-[var(--easa-color-accent-teal)]">
                        +
                      </span>
                    )}
                  </span>
                )}
                {hasActivity && isSelected && (
                  <span className="mt-0.5 text-[10px] font-semibold text-white/80">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-[var(--easa-color-border)] pt-3 text-xs text-[var(--easa-color-text-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="block h-[5px] w-[5px] rounded-full bg-[var(--easa-color-accent-teal)]" />
            Version activity
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-4 w-4 rounded-md ring-2 ring-[var(--easa-color-brand-primary)]" />
            Today
          </span>
          <span className="ml-auto">
            {activeDates.length > 0
              ? `${activeDates.length} active day${activeDates.length !== 1 ? "s" : ""} · ${versions.length} total version${versions.length !== 1 ? "s" : ""}`
              : "No versions recorded yet"}
          </span>
        </div>
      </div>

      {/* Selected date panel */}
      {selectedDate && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold">
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </h3>
            <span className="easa-badge is-blue">
              {selectedVersions.length} version{selectedVersions.length !== 1 ? "s" : ""}
            </span>
            <div className="h-px flex-1 bg-[var(--easa-color-border)]" />
          </div>

          {selectedVersions.length === 0 ? (
            <div className="easa-card p-8 text-center text-sm text-[var(--easa-color-text-muted)]">
              No versions on this date.
            </div>
          ) : (
            <div className="space-y-2">
              {selectedVersions
                .slice()
                .sort((a, b) => b.created_at.localeCompare(a.created_at))
                .map((v) => {
                  const sectionLabel =
                    [v.sectionNumber ? `§${v.sectionNumber}` : null, v.sectionTitle]
                      .filter(Boolean)
                      .join(" — ") || "Unnamed section";

                  return (
                    <div
                      key={v.id}
                      className="easa-card flex flex-wrap items-center gap-4 p-4"
                    >
                      {/* Section info */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{sectionLabel}</p>
                        {v.flightbookName && (
                          <p className="mt-0.5 text-xs text-[var(--easa-color-text-muted)]">
                            {v.flightbookName}
                          </p>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="easa-badge is-muted">v{v.version_number}</span>
                        <span className={sourceBadgeClass(v.change_source)}>
                          {sourceLabel(v.change_source)}
                        </span>
                        <span className="text-xs text-[var(--easa-color-text-muted)]">
                          {formatTime(v.created_at)}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {v.flightbookId && (
                          <Link
                            href={`/flightbooks/${v.flightbookId}#section-${v.flightbook_section_id}`}
                            className="easa-btn secondary flex items-center gap-1.5 text-sm"
                          >
                            <ExternalLink size={14} strokeWidth={1.75} />
                            Open section
                          </Link>
                        )}
                        {isAdmin && (
                          <RollbackButton
                            sectionId={v.flightbook_section_id}
                            versionNumber={v.version_number}
                            sectionLabel={sectionLabel}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* No date selected — hint */}
      {!selectedDate && activeDates.length > 0 && (
        <div className="easa-card p-8 text-center">
          <RotateCcw
            size={28}
            strokeWidth={1.5}
            className="mx-auto mb-3 text-[var(--easa-color-text-muted)]"
          />
          <p className="text-sm font-medium">Select a highlighted date to see versions</p>
          <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
            Teal dots mark days with recorded version snapshots.
            {isAdmin ? " Admins can roll back any section to a prior version." : ""}
          </p>
          {activeDates[0] && (
            <button
              type="button"
              className="easa-btn secondary mt-4 text-sm"
              onClick={() => {
                const d = new Date(activeDates[0] + "T00:00:00");
                setViewYear(d.getFullYear());
                setViewMonth(d.getMonth());
                setSelectedDate(activeDates[0]);
              }}
            >
              Jump to latest activity
            </button>
          )}
        </div>
      )}

      {/* No versions at all */}
      {activeDates.length === 0 && (
        <div className="easa-card p-10 text-center">
          <p className="text-sm font-medium">No version history yet</p>
          <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
            Versions are created when sections are edited or AI updates are approved.
          </p>
        </div>
      )}
    </div>
  );
}
