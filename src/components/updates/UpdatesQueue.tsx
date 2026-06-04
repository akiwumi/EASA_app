"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, BookOpen, CheckCircle, CheckCircle2, Clock3, Download, Newspaper, RefreshCw, Trash2, XCircle, TriangleAlert, MapPin } from "lucide-react";
import type { UpdateQueueItem } from "@/lib/types/domain";
import { confidenceConfig, getConfidenceLevel } from "@/lib/utils/confidence";

// ── Category colour system ────────────────────────────────────────────────────
type CategoryKey = "operations" | "aircrew" | "training" | "safety" | "airworthiness" | "medical" | "news" | "other";

const CATEGORY_META: Record<CategoryKey, {
  label: string;
  border: string;       // left-border colour class
  badge: string;        // pill bg + text
  dot: string;          // small dot colour
}> = {
  operations:    { label: "Operations",    border: "border-l-[3px] border-l-emerald-500",   badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",    dot: "bg-emerald-500" },
  aircrew:       { label: "Aircrew",       border: "border-l-[3px] border-l-blue-500",      badge: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",            dot: "bg-blue-500" },
  training:      { label: "Training",      border: "border-l-[3px] border-l-purple-500",    badge: "bg-purple-50 text-purple-700 ring-1 ring-purple-200",      dot: "bg-purple-500" },
  safety:        { label: "Safety",        border: "border-l-[3px] border-l-orange-500",    badge: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",      dot: "bg-orange-500" },
  airworthiness: { label: "Airworthiness", border: "border-l-[3px] border-l-red-500",       badge: "bg-red-50 text-red-700 ring-1 ring-red-200",              dot: "bg-red-500" },
  medical:       { label: "Medical",       border: "border-l-[3px] border-l-teal-500",      badge: "bg-teal-50 text-teal-700 ring-1 ring-teal-200",           dot: "bg-teal-500" },
  news:          { label: "News",          border: "border-l-[3px] border-l-slate-400",     badge: "bg-slate-50 text-slate-600 ring-1 ring-slate-200",         dot: "bg-slate-400" },
  other:         { label: "General",       border: "border-l-[3px] border-l-slate-300",     badge: "bg-slate-50 text-slate-500 ring-1 ring-slate-200",         dot: "bg-slate-300" },
};

function resolveCategoryKey(item: UpdateQueueItem): CategoryKey {
  const cat = (item.ai_category ?? "").toLowerCase().trim();
  if (cat === "operations") return "operations";
  if (cat === "aircrew" || cat === "licensing") return "aircrew";
  if (cat === "training") return "training";
  if (cat === "safety") return "safety";
  if (cat === "airworthiness" || cat === "maintenance") return "airworthiness";
  if (cat === "medical") return "medical";
  if (cat === "news" || (item.rss_type ?? "").toLowerCase().includes("news")) return "news";
  return "other";
}

// ── Relevance to flight book ──────────────────────────────────────────────────
type RelevanceLevel = "matched" | "partial" | "unmatched";

function getRelevance(item: UpdateQueueItem): RelevanceLevel {
  if (item.flightbook_sections?.title) return "matched";
  const ms = (item.ai_mapped_section ?? "").trim();
  if (ms && !ms.toLowerCase().startsWith("general")) return "partial";
  return "unmatched";
}

function RelevanceBadge({ item }: { item: UpdateQueueItem }) {
  const level = getRelevance(item);
  if (level === "matched") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
        <MapPin size={9} strokeWidth={2.5} />
        {item.flightbook_sections?.title ?? "Section matched"}
      </span>
    );
  }
  if (level === "partial") {
    const sectionLabel = (item.ai_mapped_section ?? "").replace(/^\[.*?\]\s*/, "").split(" ").slice(0, 5).join(" ");
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">
        <MapPin size={9} strokeWidth={2.5} />
        AI match: {sectionLabel || item.ai_mapped_section}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-600 ring-1 ring-rose-200">
      <TriangleAlert size={9} strokeWidth={2.5} />
      No section match
    </span>
  );
}

function riskBadgeClass(risk: string) {
  if (risk === "high") return "easa-badge is-pink";
  if (risk === "medium") return "easa-badge is-orange";
  return "easa-badge is-blue";
}

type PriorityTier = "critical" | "regulatory" | "awareness";

function getPriorityTier(item: UpdateQueueItem): PriorityTier {
  const risk = (item.risk_level ?? "").toLowerCase();
  const cls = (item.classification ?? "").toLowerCase();
  if (cls === "mandatory" && (risk === "high" || risk === "medium")) return "critical";
  if (cls === "mandatory" || cls === "recommended") return "regulatory";
  return "awareness";
}

function PriorityLabel({ tier }: { tier: PriorityTier }) {
  if (tier === "critical") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--easa-color-accent-pink)_12%,transparent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--easa-color-accent-pink)]">
        <BookOpen size={10} strokeWidth={2} />
        Book update required
      </span>
    );
  }
  if (tier === "regulatory") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--easa-color-accent-orange)_12%,transparent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--easa-color-accent-orange)]">
        <AlertCircle size={10} strokeWidth={2} />
        Regulatory review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--easa-color-accent-blue)_10%,transparent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--easa-color-accent-blue)]">
      <Newspaper size={10} strokeWidth={2} />
      News &amp; awareness
    </span>
  );
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
  // Filters — classification + risk are server-side; the rest are client-side
  const [filterClassification, setFilterClassification] = useState("");
  const [filterRisk, setFilterRisk] = useState("");
  const [filterConfidence, setFilterConfidence] = useState("");
  const [filterPriority, setFilterPriority] = useState<"" | "critical">("");
  const [filterCategory, setFilterCategory] = useState<CategoryKey | "">("");
  const [filterRelevance, setFilterRelevance] = useState<RelevanceLevel | "">("");
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);

  const load = useCallback(async (overrides?: { page?: number }) => {
    setLoading(true);
    setError(null);
    setSelectedIds(new Set());
    const nextPage = overrides?.page ?? page;
    const params = new URLSearchParams({
      page: String(nextPage),
      limit: String(limit),
      actionOnly: "1",
    });
    if (filterClassification) params.set("classification", filterClassification);
    if (filterRisk) params.set("risk", filterRisk);

    const res = await fetch(`/api/updates?${params}`);
    if (!res.ok) { setError("Failed to load updates"); setLoading(false); return; }
    const json = await res.json();
    setItems(json.items ?? []);
    setTotal(json.total ?? 0);
    setLoading(false);
  }, [page, filterClassification, filterRisk]);

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

  // Reset to page 1 whenever any filter changes
  useEffect(() => {
    setPage(1);
  }, [filterClassification, filterRisk, filterCategory, filterRelevance, filterConfidence, filterPriority]);

  const totalPages = Math.ceil(total / limit);
  const displayItems = items
    .filter((item) => {
      if (!filterConfidence) return true;
      return getConfidenceLevel(item.confidence_score, item.ai_confidence_label) === filterConfidence;
    })
    .filter((item) => {
      if (!filterPriority) return true;
      return getPriorityTier(item) === "critical";
    })
    .filter((item) => {
      if (!filterCategory) return true;
      return resolveCategoryKey(item) === filterCategory;
    })
    .filter((item) => {
      if (!filterRelevance) return true;
      return getRelevance(item) === filterRelevance;
    })
    .sort((a, b) => {
      const order: Record<PriorityTier, number> = { critical: 0, regulatory: 1, awareness: 2 };
      return order[getPriorityTier(a)] - order[getPriorityTier(b)];
    });
  const draftedCount = displayItems.filter((item) => Boolean(item.ai_suggested_text)).length;
  const matchedCount = displayItems.filter((item) => getRelevance(item) === "matched").length;
  const unmatchedCount = displayItems.filter((item) => getRelevance(item) === "unmatched").length;
  const queuedCount = displayItems.length;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(displayItems.map((item) => item.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function bulkAction(action: "boneyard" | "delete" | "approved") {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    setBulkError(null);
    try {
      const res = await fetch("/api/updates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), action }),
      });
      const json = await res.json().catch(() => ({} as { error?: string }));
      if (!res.ok) {
        setBulkError(json.error ?? "Bulk action failed.");
        return;
      }
      setSelectedIds(new Set());
      await load();
      await refreshSummary();
    } catch {
      setBulkError("Bulk action failed.");
    } finally {
      setBulkLoading(false);
    }
  }

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

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="easa-card p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--easa-color-text-muted)]">Needs review</p>
          <p className="mt-1 text-2xl font-semibold">{queuedCount}</p>
        </div>
        <div className="easa-card p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--easa-color-text-muted)]">Drafts ready</p>
          <p className="mt-1 text-2xl font-semibold">{draftedCount}</p>
        </div>
        <button
          className={`easa-card p-4 text-left transition-colors hover:bg-emerald-50 ${filterRelevance === "matched" ? "ring-2 ring-emerald-400" : ""}`}
          onClick={() => setFilterRelevance(filterRelevance === "matched" ? "" : "matched")}
        >
          <p className="text-xs uppercase tracking-wide text-emerald-600">Book section matched</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">{matchedCount}</p>
        </button>
        <button
          className={`easa-card p-4 text-left transition-colors hover:bg-rose-50 ${filterRelevance === "unmatched" ? "ring-2 ring-rose-400" : ""}`}
          onClick={() => setFilterRelevance(filterRelevance === "unmatched" ? "" : "unmatched")}
        >
          <p className="text-xs uppercase tracking-wide text-rose-600">No section match</p>
          <p className="mt-1 text-2xl font-semibold text-rose-700">{unmatchedCount}</p>
        </button>
      </div>

      {/* Filter bar */}
      <div className="easa-card p-3 flex flex-wrap gap-4">
        {/* Category */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-[var(--easa-color-text-muted)] pr-1">Category</span>
          {(["", "mandatory", "recommended", "watchlist"] as const).map((v) => (
            <button
              key={v || "all"}
              onClick={() => setFilterClassification(v)}
              className={[
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filterClassification === v
                  ? "bg-[var(--easa-color-accent-blue)] text-white"
                  : "bg-[color-mix(in_srgb,var(--easa-color-text-muted)_12%,transparent)] text-[var(--easa-color-text-secondary)] hover:bg-[color-mix(in_srgb,var(--easa-color-text-muted)_20%,transparent)]",
              ].join(" ")}
            >
              {v === "" ? "All" : v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        <div className="w-px self-stretch bg-[color-mix(in_srgb,var(--easa-color-text-muted)_20%,transparent)]" />

        {/* Priority */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-[var(--easa-color-text-muted)] pr-1">Priority</span>
          <button
            onClick={() => setFilterPriority("")}
            className={["rounded-full px-3 py-1 text-xs font-medium transition-colors", filterPriority === "" ? "bg-[var(--easa-color-accent-blue)] text-white" : "bg-[color-mix(in_srgb,var(--easa-color-text-muted)_12%,transparent)] text-[var(--easa-color-text-secondary)] hover:bg-[color-mix(in_srgb,var(--easa-color-text-muted)_20%,transparent)]"].join(" ")}
          >All</button>
          <button
            onClick={() => setFilterPriority("critical")}
            className={["rounded-full px-3 py-1 text-xs font-medium transition-colors", filterPriority === "critical" ? "bg-[var(--easa-color-accent-pink)] text-white" : "bg-[color-mix(in_srgb,var(--easa-color-accent-pink)_12%,transparent)] text-[var(--easa-color-accent-pink)] hover:bg-[color-mix(in_srgb,var(--easa-color-accent-pink)_20%,transparent)]"].join(" ")}
          >Book updates required</button>
        </div>

        <div className="w-px self-stretch bg-[color-mix(in_srgb,var(--easa-color-text-muted)_20%,transparent)]" />

        {/* Risk */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-[var(--easa-color-text-muted)] pr-1">Risk</span>
          {(["", "high", "medium", "low"] as const).map((v) => (
            <button
              key={v || "all"}
              onClick={() => setFilterRisk(v)}
              className={[
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filterRisk === v
                  ? "bg-[var(--easa-color-accent-blue)] text-white"
                  : "bg-[color-mix(in_srgb,var(--easa-color-text-muted)_12%,transparent)] text-[var(--easa-color-text-secondary)] hover:bg-[color-mix(in_srgb,var(--easa-color-text-muted)_20%,transparent)]",
              ].join(" ")}
            >
              {v === "" ? "All" : v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        <div className="w-px self-stretch bg-[color-mix(in_srgb,var(--easa-color-text-muted)_20%,transparent)]" />

        {/* Confidence */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-[var(--easa-color-text-muted)] pr-1">Confidence</span>
          {(["", "High", "Medium", "Low"] as const).map((v) => (
            <button
              key={v || "all"}
              onClick={() => setFilterConfidence(v)}
              className={[
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filterConfidence === v
                  ? "bg-[var(--easa-color-accent-blue)] text-white"
                  : "bg-[color-mix(in_srgb,var(--easa-color-text-muted)_12%,transparent)] text-[var(--easa-color-text-secondary)] hover:bg-[color-mix(in_srgb,var(--easa-color-text-muted)_20%,transparent)]",
              ].join(" ")}
            >
              {v === "" ? "All" : v}
            </button>
          ))}
        </div>

        <div className="w-full border-t border-[color-mix(in_srgb,var(--easa-color-text-muted)_15%,transparent)]" />

        {/* Subject category */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-[var(--easa-color-text-muted)] pr-1">Subject</span>
          <button
            onClick={() => setFilterCategory("")}
            className={["rounded-full px-3 py-1 text-xs font-medium transition-colors", filterCategory === "" ? "bg-[var(--easa-color-accent-blue)] text-white" : "bg-[color-mix(in_srgb,var(--easa-color-text-muted)_12%,transparent)] text-[var(--easa-color-text-secondary)] hover:bg-[color-mix(in_srgb,var(--easa-color-text-muted)_20%,transparent)]"].join(" ")}
          >All</button>
          {(Object.entries(CATEGORY_META) as [CategoryKey, typeof CATEGORY_META[CategoryKey]][]).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => setFilterCategory(filterCategory === key ? "" : key)}
              className={["rounded-full px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1.5", filterCategory === key ? meta.badge + " ring-2" : "bg-[color-mix(in_srgb,var(--easa-color-text-muted)_10%,transparent)] text-[var(--easa-color-text-secondary)] hover:bg-[color-mix(in_srgb,var(--easa-color-text-muted)_18%,transparent)]"].join(" ")}
            >
              <span className={`h-2 w-2 rounded-full ${meta.dot} shrink-0`} />
              {meta.label}
            </button>
          ))}
        </div>

        <div className="w-px self-stretch bg-[color-mix(in_srgb,var(--easa-color-text-muted)_20%,transparent)]" />

        {/* Book relevance */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-[var(--easa-color-text-muted)] pr-1">Book match</span>
          {([
            { v: "" as const, label: "All" },
            { v: "matched" as const, label: "✓ Section matched" },
            { v: "partial" as const, label: "~ AI suggested" },
            { v: "unmatched" as const, label: "⚠ No match" },
          ] as { v: RelevanceLevel | ""; label: string }[]).map(({ v, label }) => (
            <button
              key={v || "all"}
              onClick={() => setFilterRelevance(v)}
              className={[
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filterRelevance === v
                  ? v === "matched" ? "bg-emerald-500 text-white"
                    : v === "partial" ? "bg-amber-500 text-white"
                    : v === "unmatched" ? "bg-rose-500 text-white"
                    : "bg-[var(--easa-color-accent-blue)] text-white"
                  : "bg-[color-mix(in_srgb,var(--easa-color-text-muted)_12%,transparent)] text-[var(--easa-color-text-secondary)] hover:bg-[color-mix(in_srgb,var(--easa-color-text-muted)_20%,transparent)]",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Clear all */}
        {(filterClassification || filterRisk || filterConfidence || filterPriority || filterCategory || filterRelevance) ? (
          <button
            onClick={() => { setFilterClassification(""); setFilterRisk(""); setFilterConfidence(""); setFilterPriority(""); setFilterCategory(""); setFilterRelevance(""); }}
            className="ml-auto text-xs text-[var(--easa-color-text-muted)] hover:text-[var(--easa-color-text-secondary)] underline underline-offset-2"
          >
            Clear all filters
          </button>
        ) : null}
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
          {/* Bulk selection toolbar */}
          {canManage && displayItems.length > 0 ? (
            <>
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-4 py-2.5">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedIds.size === displayItems.length && displayItems.length > 0}
                  ref={(el) => {
                    if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < displayItems.length;
                  }}
                  onChange={() => selectedIds.size === displayItems.length ? clearSelection() : selectAll()}
                  className="h-4 w-4"
                />
                {selectedIds.size > 0
                  ? `${selectedIds.size} selected`
                  : "Select all"}
              </label>
              {selectedIds.size > 0 ? (
                <>
                  <button
                    type="button"
                    className="easa-btn primary flex items-center gap-1.5 text-sm"
                    disabled={bulkLoading}
                    onClick={() => { setApproveConfirmOpen(true); setBulkError(null); }}
                  >
                    <CheckCircle size={14} strokeWidth={1.75} />
                    Approve selected ({selectedIds.size})
                  </button>
                  <button
                    type="button"
                    className="easa-btn secondary flex items-center gap-1.5 text-sm"
                    disabled={bulkLoading}
                    onClick={() => void bulkAction("boneyard")}
                  >
                    <XCircle size={14} strokeWidth={1.75} />
                    Dismiss selected
                  </button>
                  <button
                    type="button"
                    className="easa-btn secondary flex items-center gap-1.5 text-sm text-[var(--easa-color-accent-pink)]"
                    disabled={bulkLoading}
                    onClick={() => void bulkAction("delete")}
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
                    Delete selected
                  </button>
                  <button
                    type="button"
                    className="ml-auto text-xs text-[var(--easa-color-text-muted)] underline"
                    onClick={clearSelection}
                  >
                    Clear
                  </button>
                </>
              ) : null}
              {bulkLoading ? (
                <span className="text-xs text-[var(--easa-color-text-muted)]">Working…</span>
              ) : null}
              {bulkError ? (
                <span className="text-xs text-[var(--easa-color-accent-pink)]">{bulkError}</span>
              ) : null}
            </div>

            {/* Approve confirmation */}
            {approveConfirmOpen && selectedIds.size > 0 ? (
              <div className="mt-2 rounded-xl border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle size={15} strokeWidth={1.75} className="mt-0.5 shrink-0 text-[var(--easa-color-accent-green)]" />
                  <div>
                    <p className="text-sm font-semibold">Approve {selectedIds.size} update{selectedIds.size !== 1 ? "s" : ""}?</p>
                    <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
                      Each item&apos;s AI-drafted text will be applied to its mapped flight book section. A version snapshot is saved before any change is made. You can roll back from Time machine.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="easa-btn secondary text-sm"
                    disabled={bulkLoading}
                    onClick={() => setApproveConfirmOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="easa-btn primary flex items-center gap-1.5 text-sm"
                    disabled={bulkLoading}
                    onClick={() => { setApproveConfirmOpen(false); void bulkAction("approved"); }}
                  >
                    {bulkLoading ? "Approving…" : `Confirm — approve ${selectedIds.size}`}
                  </button>
                </div>
              </div>
            ) : null}
            </>
          ) : null}

          {displayItems.map((item) => {
            const confidenceLevel = getConfidenceLevel(item.confidence_score, item.ai_confidence_label);
            const confidenceMeta = confidenceConfig[confidenceLevel];
            const catKey = resolveCategoryKey(item);
            const catMeta = CATEGORY_META[catKey];
            const regulationLabel = [
              item.reg_changes?.reg_documents?.part,
              item.reg_changes?.reg_documents?.reg_number,
              item.reg_changes?.section_ref,
            ].filter(Boolean).join(" · ");

            return (
              <div
                key={item.id}
                className={`easa-card p-4 pl-3 overflow-hidden ${catMeta.border}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  {canManage ? (
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 cursor-pointer"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <PriorityLabel tier={getPriorityTier(item)} />
                      {/* Category badge */}
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${catMeta.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${catMeta.dot}`} />
                        {catMeta.label}
                      </span>
                      <span className={riskBadgeClass(item.risk_level)}>{item.risk_level} risk</span>
                      <span className={confidenceMeta.badgeClass}>{confidenceMeta.label}</span>
                      {item.ai_suggested_text ? (
                        <span className="easa-badge is-green">Draft ready</span>
                      ) : (
                        <span className="easa-badge is-muted">Draft pending</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-[var(--easa-color-text-primary)]">
                      {regulationLabel || item.ai_rationale?.slice(0, 80) || "Regulatory update requires review"}
                    </p>
                    {/* Relevance indicator */}
                    <div className="mt-1.5">
                      <RelevanceBadge item={item} />
                    </div>
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
