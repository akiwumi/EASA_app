"use client";

import { useState } from "react";
import { ExternalLink, Clock, AlertTriangle, ShieldAlert, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

type AdSibFinding = {
  id: string;
  doc_type: string;
  reference_number: string | null;
  title: string;
  applicability: string | null;
  compliance_date: string | null;
  compliance_category: string;
  effective_date: string | null;
  url: string | null;
  summary: string | null;
  status: string;
  created_at: string;
};

interface Props {
  rows: AdSibFinding[];
  isAdmin: boolean;
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ComplianceBadge({ category }: { category: string }) {
  if (category === "mandatory") {
    return <span className="easa-badge is-red">Mandatory</span>;
  }
  if (category === "recommended") {
    return <span className="easa-badge is-yellow">Recommended</span>;
  }
  return <span className="easa-badge is-muted">Informational</span>;
}

function DeadlineChip({ days }: { days: number | null }) {
  if (days === null) return null;

  if (days < 0) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-[var(--easa-color-accent-red)]">
        <Clock size={12} strokeWidth={2} />
        Overdue by {Math.abs(days)} day{Math.abs(days) !== 1 ? "s" : ""}
      </span>
    );
  }
  if (days === 0) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-[var(--easa-color-accent-red)]">
        <Clock size={12} strokeWidth={2} />
        Due today
      </span>
    );
  }
  if (days <= 30) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-[var(--easa-color-accent-red)]">
        <Clock size={12} strokeWidth={2} />
        {days} day{days !== 1 ? "s" : ""} remaining
      </span>
    );
  }
  if (days <= 90) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-[var(--easa-color-accent-orange)]">
        <Clock size={12} strokeWidth={2} />
        {days} days remaining
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-[var(--easa-color-text-muted)]">
      <Clock size={12} strokeWidth={1.75} />
      {days} days remaining
    </span>
  );
}

function AdvisoryCard({ row, isAdmin }: { row: AdSibFinding; isAdmin: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closed, setClosed] = useState(row.status !== "open");

  const days = daysUntil(row.compliance_date);
  const isAD = row.doc_type === "ad";
  const isOverdue = days !== null && days < 0;
  const isUrgent = days !== null && days >= 0 && days <= 30;

  async function handleClose() {
    setClosing(true);
    try {
      const res = await fetch(`/api/advisories/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      });
      if (res.ok) setClosed(true);
    } finally {
      setClosing(false);
    }
  }

  return (
    <div
      className={`easa-card overflow-hidden transition ${
        isOverdue
          ? "border-l-4 border-l-[var(--easa-color-accent-red)]"
          : isUrgent
          ? "border-l-4 border-l-[var(--easa-color-accent-orange)]"
          : ""
      } ${closed ? "opacity-60" : ""}`}
    >
      <div className="p-5">
        {/* Top row */}
        <div className="flex flex-wrap items-start gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isAD ? "bg-[color-mix(in_srgb,var(--easa-color-accent-red)_12%,transparent)]" : "bg-[color-mix(in_srgb,var(--easa-color-accent-yellow)_12%,transparent)]"}`}>
            {isAD
              ? <ShieldAlert size={17} strokeWidth={1.75} className="text-[var(--easa-color-accent-red)]" />
              : <AlertTriangle size={17} strokeWidth={1.75} className="text-[var(--easa-color-accent-yellow)]" />
            }
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`easa-badge ${isAD ? "is-red" : "is-yellow"}`}>
                {isAD ? "AD" : "SIB"}
              </span>
              {row.reference_number && (
                <span className="easa-badge is-muted">{row.reference_number}</span>
              )}
              <ComplianceBadge category={row.compliance_category} />
              {closed && <span className="easa-badge is-muted">Closed</span>}
            </div>
            <p className="mt-1.5 font-semibold leading-tight">{row.title}</p>
          </div>

          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            className="shrink-0 text-[var(--easa-color-text-muted)] hover:text-[var(--easa-color-text-primary)]"
          >
            {expanded ? <ChevronUp size={18} strokeWidth={1.75} /> : <ChevronDown size={18} strokeWidth={1.75} />}
          </button>
        </div>

        {/* Compliance meta */}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[var(--easa-color-text-muted)]">
          {row.compliance_date && (
            <div className="flex items-center gap-1.5">
              <span className="font-medium">Compliance by</span>
              <span>{formatDate(row.compliance_date)}</span>
              {!closed && <DeadlineChip days={days} />}
            </div>
          )}
          {row.effective_date && (
            <div>
              <span className="font-medium">Effective</span>{" "}
              {formatDate(row.effective_date)}
            </div>
          )}
          {row.applicability && (
            <div>
              <span className="font-medium">Applies to</span>{" "}
              {row.applicability}
            </div>
          )}
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="mt-4 space-y-3 border-t border-[var(--easa-color-border)] pt-4">
            {row.summary && (
              <p className="text-sm leading-relaxed text-[var(--easa-color-text-muted)]">{row.summary}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {row.url && (
                <a
                  href={row.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="easa-btn secondary flex items-center gap-1.5 text-xs"
                >
                  <ExternalLink size={13} strokeWidth={1.75} />
                  View on EASA
                </a>
              )}
              {isAdmin && !closed && (
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={closing}
                  className="easa-btn secondary flex items-center gap-1.5 text-xs"
                >
                  <CheckCircle2 size={13} strokeWidth={1.75} />
                  {closing ? "Saving…" : "Mark as closed"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdvisoryList({ rows, isAdmin }: Props) {
  const adRows = rows.filter((r) => r.doc_type === "ad");
  const sibRows = rows.filter((r) => r.doc_type === "sib");
  const isMixed = adRows.length > 0 && sibRows.length > 0;

  if (!isMixed) {
    return (
      <div className="space-y-3">
        {rows.map((row) => (
          <AdvisoryCard key={row.id} row={row} isAdmin={isAdmin} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {adRows.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-[var(--easa-color-text-muted)] uppercase tracking-wide">
              Airworthiness Directives ({adRows.length})
            </h2>
            <div className="h-px flex-1 bg-[var(--easa-color-border)]" />
          </div>
          {adRows.map((row) => (
            <AdvisoryCard key={row.id} row={row} isAdmin={isAdmin} />
          ))}
        </section>
      )}

      {sibRows.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-[var(--easa-color-text-muted)] uppercase tracking-wide">
              Safety Information Bulletins ({sibRows.length})
            </h2>
            <div className="h-px flex-1 bg-[var(--easa-color-border)]" />
          </div>
          {sibRows.map((row) => (
            <AdvisoryCard key={row.id} row={row} isAdmin={isAdmin} />
          ))}
        </section>
      )}
    </div>
  );
}
