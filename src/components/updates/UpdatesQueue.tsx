"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Clock3, Download, RefreshCw } from "lucide-react";
import type { UpdateQueueItem } from "@/lib/types/domain";
import { confidenceConfig, getConfidenceLevel } from "@/lib/utils/confidence";

function riskBadgeClass(risk: string) {
  if (risk === "high") return "easa-badge is-pink";
  if (risk === "medium") return "easa-badge is-orange";
  return "easa-badge is-blue";
}

function exportCsv(items: UpdateQueueItem[]) {
  const headers = ["ID", "Risk", "Confidence", "Regulation", "Section Ref", "Flightbook Section", "Drafted", "Created At"];
  const rows = items.map((item) => [
    item.id,
    item.risk_level,
    confidenceConfig[getConfidenceLevel(item.confidence_score, item.ai_confidence_label)].label,
    item.reg_changes?.reg_documents?.reg_number ?? "",
    item.reg_changes?.section_ref ?? "",
    item.flightbook_sections?.title ?? "",
    item.ai_suggested_text ? "Yes" : "No",
    new Date(item.created_at).toISOString(),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `update-queue-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function UpdatesQueue({ canManage = false }: { canManage?: boolean }) {
  const [items, setItems] = useState<UpdateQueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 50;
  const [summaryText, setSummaryText] = useState<string>("Loading latest scan summary…");
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [dismissOpenId, setDismissOpenId] = useState<string | null>(null);
  const [dismissMode, setDismissMode] = useState<"item" | "future">("item");
  const [dismissReason, setDismissReason] = useState("This regulation part does not apply to our operation.");
  const [dismissLoading, setDismissLoading] = useState(false);
  const [dismissError, setDismissError] = useState<string | null>(null);
  const [summaryHidden, setSummaryHidden] = useState(false);
  const [summaryRunId, setSummaryRunId] = useState<string | null>(null);

  const load = useCallback(async (overrides?: { page?: number; status?: string; regulation?: string }) => {
    setLoading(true);
    setError(null);
    const nextPage = overrides?.page ?? page;
    const params = new URLSearchParams({
      page: String(nextPage),
      limit: String(limit),
      actionOnly: "1",
      hasDraft: "1",
    });

    const res = await fetch(`/api/updates?${params}`);
    if (!res.ok) { setError("Failed to load updates"); setLoading(false); return; }
    const json = await res.json();
    setItems(json.items ?? []);
    setTotal(json.total ?? 0);
    setLoading(false);
  }, [page]);

  const refreshSummary = useCallback(async () => {
    setSummaryBusy(true);
    try {
      const response = await fetch("/api/pipeline/summary");
      if (!response.ok) {
        setSummaryText("Last scan summary unavailable right now.");
        return;
      }

      const payload = (await response.json()) as {
        summary?: string | null;
        summaryLines?: string[] | null;
        status?: string | null;
        createdAt?: string | null;
        dismissed?: boolean;
        runId?: string | null;
      };
      if (!payload.summary) {
        setSummaryText("No recent scan found. Run the pipeline from dashboard.");
        return;
      }

      const lines = Array.isArray(payload.summaryLines) && payload.summaryLines.length > 0
        ? payload.summaryLines
        : [payload.summary];
      const statusPart = payload.status ? ` (${payload.status})` : "";
      setSummaryText(`${lines.filter(Boolean).join(" · ")}${statusPart}`);
      setSummaryHidden(Boolean(payload.dismissed));
      setSummaryRunId(payload.runId ?? null);
    } catch {
      setSummaryText("Last scan summary unavailable right now.");
    } finally {
      setSummaryBusy(false);
    }
  }, []);

  const dismissSummaryCard = useCallback(async () => {
    if (!summaryRunId) return;
    try {
      const response = await fetch("/api/pipeline/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss", runId: summaryRunId }),
      });
      if (!response.ok) return;
      setSummaryHidden(true);
    } catch {
      // keep card visible if dismiss fails
    }
  }, [summaryRunId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshSummary();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshSummary]);

  const totalPages = Math.ceil(total / limit);
  const draftedItems = items.filter((item) => Boolean(item.ai_suggested_text));
  const draftedCount = draftedItems.length;
  const queuedCount = draftedItems.length;

  const dismissNotRelevant = useCallback(async (item: UpdateQueueItem) => {
    setDismissLoading(true);
    setDismissError(null);
    try {
      const response = await fetch("/api/findings/mark-not-relevant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          findingId: item.finding_id ?? null,
          proposedUpdateId: item.id,
          dismissalReason: dismissReason,
          ...(dismissMode === "future"
            ? {
                filterRegPart: item.reg_part ?? item.reg_changes?.reg_documents?.part ?? null,
                filterCategory: item.classification ?? null,
              }
            : {}),
        }),
      });
      const payload = await response.json().catch(() => ({} as { error?: string }));
      if (!response.ok) {
        setDismissError(payload.error ?? "Failed to dismiss item.");
        return;
      }
      setDismissOpenId(null);
      await load();
      await refreshSummary();
    } catch {
      setDismissError("Failed to dismiss item.");
    } finally {
      setDismissLoading(false);
    }
  }, [dismissMode, dismissReason, load, refreshSummary]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Today&apos;s review queue</h1>
          <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
            Only pending updates from the last 90 days are shown here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="easa-btn secondary flex items-center gap-2 text-sm"
            onClick={() => exportCsv(items)}
          >
            <Download size={15} strokeWidth={1.75} />
            Export CSV
          </button>
          <button
            className="easa-btn secondary flex items-center gap-2 text-sm"
            onClick={() => {
              void load();
              void refreshSummary();
            }}
          >
            <RefreshCw size={15} strokeWidth={1.75} />
            Refresh
          </button>
        </div>
      </div>

      {!summaryHidden ? (
        <div className="easa-card p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock3 size={15} strokeWidth={1.75} className="text-[var(--easa-color-text-muted)]" />
              <p className="text-sm font-medium">Latest scan</p>
              {summaryBusy ? <span className="text-xs text-[var(--easa-color-text-muted)]">updating…</span> : null}
            </div>
            {summaryRunId ? (
              <button
                type="button"
                className="easa-btn secondary px-2 py-1 text-xs"
                onClick={() => {
                  void dismissSummaryCard();
                }}
              >
                Dismiss
              </button>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-[var(--easa-color-text-secondary)]">{summaryText}</p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="easa-card p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--easa-color-text-muted)]">Needs review</p>
          <p className="mt-1 text-2xl font-semibold">{queuedCount}</p>
        </div>
        <div className="easa-card p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--easa-color-text-muted)]">Drafts ready</p>
          <p className="mt-1 text-2xl font-semibold">{draftedCount}</p>
        </div>
      </div>

      {loading ? (
        <div className="easa-card p-6 text-sm text-[var(--easa-color-text-muted)]">Loading queue…</div>
      ) : error ? (
        <div className="easa-card flex items-start gap-2 p-4 text-sm text-[var(--easa-color-accent-pink)]">
          <AlertCircle size={15} strokeWidth={1.75} className="mt-0.5" />
          <span>{error}</span>
        </div>
      ) : items.length === 0 ? (
        <div className="easa-card p-10 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--easa-color-accent-green)_12%,transparent)]">
            <CheckCircle2 size={20} strokeWidth={1.75} className="text-[var(--easa-color-accent-green)]" />
          </div>
          <p className="text-sm font-semibold">All caught up</p>
          <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
            No pending updates in the last 90 days need action.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {draftedItems.map((item) => {
            const confidenceLevel = getConfidenceLevel(item.confidence_score, item.ai_confidence_label);
            const confidenceMeta = confidenceConfig[confidenceLevel];
            const regulationLabel = [
              item.reg_changes?.reg_documents?.part,
              item.reg_changes?.reg_documents?.reg_number,
              item.reg_changes?.section_ref,
            ].filter(Boolean).join(" · ");

            return (
              <div
                key={item.id}
                className={`easa-card p-4 ${confidenceMeta.borderClass}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={riskBadgeClass(item.risk_level)}>{item.risk_level} risk</span>
                      <span className={confidenceMeta.badgeClass}>{confidenceMeta.label}</span>
                      {item.ai_suggested_text ? (
                        <span className="easa-badge is-green">Draft ready</span>
                      ) : (
                        <span className="easa-badge is-muted">Draft pending</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-[var(--easa-color-text-primary)]">
                      {regulationLabel || "Regulatory update requires review"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
                      {item.flightbook_sections?.section_number
                        ? `Mapped to §${item.flightbook_sections.section_number}`
                        : "Mapped section pending"}
                      {item.flightbook_sections?.title ? ` · ${item.flightbook_sections.title}` : ""}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm text-[var(--easa-color-text-secondary)]">
                      {item.ai_rationale ?? "Open the review screen to see full trigger and proposed draft."}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link href={`/updates/${item.id}`} className="easa-btn primary text-sm">
                      Review &amp; approve
                    </Link>
                    {canManage ? (
                      <button
                        type="button"
                        className="easa-btn secondary text-sm"
                        onClick={() => {
                          setDismissOpenId(item.id);
                          setDismissMode("item");
                          setDismissReason("This regulation part does not apply to our operation.");
                          setDismissError(null);
                        }}
                      >
                        Not relevant — dismiss
                      </button>
                    ) : null}
                  </div>
                </div>
                {dismissOpenId === item.id && canManage ? (
                  <div className="mt-3 rounded-xl border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-3">
                    <p className="text-sm">
                      Dismiss this item only, or also hide future{" "}
                      <span className="font-medium">{item.reg_part ?? item.reg_changes?.reg_documents?.part ?? "similar"}</span>{" "}
                      findings for your school?
                    </p>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-[var(--easa-color-text-muted)]">
                        Confirm no action needed
                      </p>
                      <p className="text-sm">
                        Confirm: I have reviewed this change and confirm no update to our manuals is required.
                      </p>
                      <label className="block text-xs text-[var(--easa-color-text-muted)]">
                        Reason (optional)
                      </label>
                      <input
                        className="easa-input w-full text-sm"
                        value={dismissReason}
                        onChange={(event) => setDismissReason(event.target.value)}
                        placeholder="This regulation part does not apply to our operation."
                      />
                    </div>
                    <div className="mt-2 space-y-2 text-sm">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={dismissMode === "item"}
                          onChange={() => setDismissMode("item")}
                        />
                        Dismiss this item only
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={dismissMode === "future"}
                          onChange={() => setDismissMode("future")}
                        />
                        Dismiss and hide future related findings
                      </label>
                    </div>
                    {dismissError ? (
                      <p className="mt-2 text-xs text-[var(--easa-color-accent-pink)]">{dismissError}</p>
                    ) : null}
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        className="easa-btn secondary text-sm"
                        disabled={dismissLoading}
                        onClick={() => setDismissOpenId(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="easa-btn primary text-sm"
                        disabled={dismissLoading}
                        onClick={() => {
                          void dismissNotRelevant(item);
                        }}
                      >
                        {dismissLoading ? "Dismissing…" : "Confirm dismiss"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}

        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-[var(--easa-color-text-muted)]">
            Page {page} of {totalPages} · {total} total
        </p>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              className="easa-btn secondary px-3 py-1.5 text-xs"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <button
              className="easa-btn secondary px-3 py-1.5 text-xs"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
