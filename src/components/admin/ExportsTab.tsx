"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DownloadFlightbookButton from "@/components/flightbooks/DownloadFlightbookButton";

type ExportsSummary = {
  counts: {
    manualExports: number;
    assignments: number;
    acknowledgements: number;
    signoffs: number;
    formSubmissions: number;
  };
  recentManualExports: {
    id: string;
    flightbookId: string;
    name: string;
    versionNumber: number;
    changeSource: string | null;
    note: string | null;
    createdAt: string | null;
  }[];
  formsReady: boolean;
};

const RECORD_EXPORTS = [
  {
    kind: "manual-versions",
    label: "Manual version register",
    help: "Export the manual-version ledger for audit packs and external review.",
  },
  {
    kind: "assignments",
    label: "Reading assignments",
    help: "Export the current assignment register across lessons and programmes.",
  },
  {
    kind: "acknowledgements",
    label: "Acknowledgements",
    help: "Export student acknowledgement evidence for assigned reading.",
  },
  {
    kind: "signoffs",
    label: "Instructor sign-offs",
    help: "Export the instructor completion and sign-off record.",
  },
  {
    kind: "form-submissions",
    label: "Training form submissions",
    help: "Export submitted training forms when the forms workflow is in use.",
  },
] as const;

export default function ExportsTab() {
  const [summary, setSummary] = useState<ExportsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/admin/exports?kind=summary");
      const payload = (await response.json()) as ExportsSummary;
      if (response.ok) {
        setSummary(payload);
      }
      setLoading(false);
    }

    void load();
  }, []);

  function download(kind: string) {
    window.location.assign(`/api/admin/exports?kind=${kind}`);
  }

  if (loading) {
    return (
      <div className="easa-card p-6">
        <p className="text-sm text-[var(--easa-color-text-muted)]">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="easa-card p-6">
        <h2 className="text-base font-semibold">Audit and training exports</h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--easa-color-text-muted)]">
          Export manual-version history and training records without pulling data manually from Supabase. This is the Phase 9 operational handoff layer for audit and onboarding work.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {RECORD_EXPORTS.map((item) => (
            <div key={item.kind} className="rounded-[20px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4">
              <p className="text-sm font-medium">{item.label}</p>
              <p className="mt-2 text-xs text-[var(--easa-color-text-muted)]">
                {item.help}
              </p>
              <div className="mt-4">
                <button
                  className="easa-btn secondary text-sm"
                  onClick={() => download(item.kind)}
                  type="button"
                  disabled={item.kind === "form-submissions" && !summary?.formsReady}
                >
                  Download CSV
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="easa-card p-6">
          <h3 className="text-sm font-semibold">Current export volumes</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[18px] bg-[var(--easa-color-surface-2)] p-4">
              <p className="text-xs text-[var(--easa-color-text-muted)]">Manual exports</p>
              <p className="mt-2 text-2xl font-semibold">{summary?.counts.manualExports ?? 0}</p>
            </div>
            <div className="rounded-[18px] bg-[var(--easa-color-surface-2)] p-4">
              <p className="text-xs text-[var(--easa-color-text-muted)]">Assignments</p>
              <p className="mt-2 text-2xl font-semibold">{summary?.counts.assignments ?? 0}</p>
            </div>
            <div className="rounded-[18px] bg-[var(--easa-color-surface-2)] p-4">
              <p className="text-xs text-[var(--easa-color-text-muted)]">Acknowledgements</p>
              <p className="mt-2 text-2xl font-semibold">{summary?.counts.acknowledgements ?? 0}</p>
            </div>
            <div className="rounded-[18px] bg-[var(--easa-color-surface-2)] p-4">
              <p className="text-xs text-[var(--easa-color-text-muted)]">Instructor sign-offs</p>
              <p className="mt-2 text-2xl font-semibold">{summary?.counts.signoffs ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="easa-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Recent manual versions</h3>
            <button
              className="easa-btn secondary text-sm"
              onClick={() => download("manual-versions")}
              type="button"
            >
              Export version register
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {summary?.recentManualExports.length ? summary.recentManualExports.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4"
              >
                <div>
                  <Link
                    href={`/flightbooks/${item.flightbookId}`}
                    className="text-sm font-medium text-[var(--easa-color-text-primary)] transition hover:text-[var(--easa-color-brand-primary)]"
                  >
                    {item.name}
                  </Link>
                  <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
                    Version {item.versionNumber}
                    {item.changeSource ? ` · ${item.changeSource}` : ""}
                    {item.createdAt ? ` · ${new Date(item.createdAt).toLocaleString()}` : ""}
                  </p>
                  {item.note && (
                    <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
                      {item.note}
                    </p>
                  )}
                </div>
                <DownloadFlightbookButton id={item.flightbookId} exportId={item.id} compact={false} label="Markdown" />
              </div>
            )) : (
              <p className="text-sm text-[var(--easa-color-text-muted)]">
                No manual exports exist yet. Export a flight-book version from a manual detail page after your next approved change.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
