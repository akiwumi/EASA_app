"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckSquare, Square, Filter, Download, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";

interface RegChange {
  section_ref: string | null;
  change_type: string | null;
  diff_text: string | null;
  reg_documents: { reg_number: string | null; part: string | null } | null;
}

interface FlightbookSection {
  section_number: string | null;
  title: string | null;
}

interface UpdateItem {
  id: string;
  classification: string;
  risk_level: string;
  confidence_score: number | null;
  status: string;
  ai_rationale: string | null;
  created_at: string;
  reg_changes: RegChange | null;
  flightbook_sections: FlightbookSection | null;
}

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "watchlist", label: "Watchlist" },
];

const RISK_OPTIONS = [
  { value: "", label: "All risk levels" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const CLASS_OPTIONS = [
  { value: "", label: "All classifications" },
  { value: "mandatory", label: "Mandatory" },
  { value: "recommended", label: "Recommended" },
  { value: "watchlist", label: "Watchlist" },
  { value: "no_action", label: "No action" },
];

function riskColor(risk: string) {
  if (risk === "high") return "text-[var(--easa-color-accent-pink)] bg-[color-mix(in_srgb,var(--easa-color-accent-pink)_12%,transparent)]";
  if (risk === "medium") return "text-[var(--easa-color-accent-orange)] bg-[color-mix(in_srgb,var(--easa-color-accent-orange)_12%,transparent)]";
  return "text-[var(--easa-color-accent-green)] bg-[color-mix(in_srgb,var(--easa-color-accent-green)_12%,transparent)]";
}

function statusColor(status: string) {
  if (status === "approved") return "text-[var(--easa-color-accent-green)] bg-[color-mix(in_srgb,var(--easa-color-accent-green)_12%,transparent)]";
  if (status === "rejected") return "text-[var(--easa-color-accent-pink)] bg-[color-mix(in_srgb,var(--easa-color-accent-pink)_12%,transparent)]";
  if (status === "watchlist") return "text-[var(--easa-color-accent-blue)] bg-[color-mix(in_srgb,var(--easa-color-accent-blue)_12%,transparent)]";
  return "text-[var(--easa-color-accent-orange)] bg-[color-mix(in_srgb,var(--easa-color-accent-orange)_12%,transparent)]";
}

function exportCsv(items: UpdateItem[]) {
  const headers = ["ID", "Status", "Risk", "Classification", "Confidence", "Regulation", "Section Ref", "Change Type", "Flightbook Section", "Date"];
  const rows = items.map((item) => [
    item.id,
    item.status,
    item.risk_level,
    item.classification,
    item.confidence_score ?? "",
    item.reg_changes?.reg_documents?.reg_number ?? "",
    item.reg_changes?.section_ref ?? "",
    item.reg_changes?.change_type ?? "",
    item.flightbook_sections?.title ?? "",
    new Date(item.created_at).toLocaleDateString(),
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

export default function UpdatesQueue() {
  const [items, setItems] = useState<UpdateItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState("");
  const [filterRisk, setFilterRisk] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [page, setPage] = useState(1);
  const limit = 50;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filterStatus) params.set("status", filterStatus);
    if (filterRisk) params.set("risk", filterRisk);
    if (filterClass) params.set("classification", filterClass);

    const res = await fetch(`/api/updates?${params}`);
    if (!res.ok) { setError("Failed to load updates"); setLoading(false); return; }
    const json = await res.json();
    setItems(json.items ?? []);
    setTotal(json.total ?? 0);
    setSelected(new Set());
    setLoading(false);
  }, [page, filterStatus, filterRisk, filterClass]);

  useEffect(() => { load(); }, [load]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [filterStatus, filterRisk, filterClass]);

  function toggleAll() {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i.id)));
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function bulkAction(action: string) {
    if (!selected.size) return;
    setBulkLoading(true);
    setBulkMsg(null);
    const res = await fetch("/api/updates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected), action }),
    });
    const json = await res.json();
    if (!res.ok) {
      setBulkMsg(`Error: ${json.error}`);
    } else {
      setBulkMsg(`${json.affected} item${json.affected !== 1 ? "s" : ""} ${action}.`);
      load();
    }
    setBulkLoading(false);
  }

  const totalPages = Math.ceil(total / limit);
  const allSelected = items.length > 0 && selected.size === items.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Update queue</h1>
          <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
            {total} proposed update{total !== 1 ? "s" : ""} · review and approve changes to your flight books
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="easa-btn secondary flex items-center gap-2 text-sm"
            onClick={() => exportCsv(items)}
          >
            <Download size={15} strokeWidth={1.75} />
            Export CSV
          </button>
          <button
            className="easa-btn secondary flex items-center gap-2 text-sm"
            onClick={load}
          >
            <RefreshCw size={15} strokeWidth={1.75} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="easa-card flex flex-wrap gap-3 p-4">
        <Filter size={15} strokeWidth={1.75} className="mt-2 shrink-0 text-[var(--easa-color-text-muted)]" />
        <select className="easa-input flex-1 min-w-[140px]" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className="easa-input flex-1 min-w-[140px]" value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)}>
          {RISK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className="easa-input flex-1 min-w-[160px]" value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
          {CLASS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {(filterStatus || filterRisk || filterClass) && (
          <button
            className="text-xs text-[var(--easa-color-text-muted)] hover:text-[var(--easa-color-text-primary)]"
            onClick={() => { setFilterStatus(""); setFilterRisk(""); setFilterClass(""); }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="easa-card flex flex-wrap items-center gap-3 p-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              className="easa-btn secondary flex items-center gap-1.5 text-xs"
              disabled={bulkLoading}
              onClick={() => bulkAction("approved")}
            >
              <CheckCircle size={14} strokeWidth={1.75} className="text-[var(--easa-color-accent-green)]" />
              Approve
            </button>
            <button
              className="easa-btn secondary flex items-center gap-1.5 text-xs"
              disabled={bulkLoading}
              onClick={() => bulkAction("rejected")}
            >
              <XCircle size={14} strokeWidth={1.75} className="text-[var(--easa-color-accent-pink)]" />
              Reject
            </button>
            <button
              className="easa-btn secondary flex items-center gap-1.5 text-xs"
              disabled={bulkLoading}
              onClick={() => bulkAction("watchlist")}
            >
              <Clock size={14} strokeWidth={1.75} className="text-[var(--easa-color-accent-blue)]" />
              Watchlist
            </button>
            <button
              className="easa-btn secondary flex items-center gap-1.5 text-xs"
              disabled={bulkLoading}
              onClick={() => bulkAction("pending")}
            >
              Reset to pending
            </button>
          </div>
          {bulkMsg && (
            <p className={`w-full text-xs ${bulkMsg.startsWith("Error") ? "text-[var(--easa-color-accent-pink)]" : "text-[var(--easa-color-accent-green)]"}`}>
              {bulkMsg}
            </p>
          )}
        </div>
      )}

      {/* Table */}
      <div className="easa-card overflow-hidden p-0">
        {loading ? (
          <p className="p-6 text-sm text-[var(--easa-color-text-muted)]">Loading…</p>
        ) : error ? (
          <p className="p-6 text-sm text-[var(--easa-color-accent-pink)]">{error}</p>
        ) : items.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium">No updates found</p>
            <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
              Run the RSS ingest + AI analysis from the dashboard to populate the queue.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)]">
                <th className="w-10 px-4 py-3">
                  <button onClick={toggleAll}>
                    {allSelected
                      ? <CheckSquare size={16} strokeWidth={1.75} className="text-[var(--easa-color-brand-primary)]" />
                      : <Square size={16} strokeWidth={1.75} className="text-[var(--easa-color-text-muted)]" />}
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--easa-color-text-muted)]">Regulation</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--easa-color-text-muted)]">Change</th>
                <th className="hidden px-4 py-3 text-left font-medium text-[var(--easa-color-text-muted)] md:table-cell">Flight book section</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--easa-color-text-muted)]">Risk</th>
                <th className="hidden px-4 py-3 text-left font-medium text-[var(--easa-color-text-muted)] lg:table-cell">Confidence</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--easa-color-text-muted)]">Status</th>
                <th className="hidden px-4 py-3 text-left font-medium text-[var(--easa-color-text-muted)] lg:table-cell">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className={`border-b border-[var(--easa-color-border)] last:border-0 transition hover:bg-[var(--easa-color-surface-2)] ${selected.has(item.id) ? "bg-[color-mix(in_srgb,var(--easa-color-brand-primary)_5%,transparent)]" : ""}`}
                >
                  <td className="px-4 py-3">
                    <button onClick={() => toggleOne(item.id)}>
                      {selected.has(item.id)
                        ? <CheckSquare size={16} strokeWidth={1.75} className="text-[var(--easa-color-brand-primary)]" />
                        : <Square size={16} strokeWidth={1.75} className="text-[var(--easa-color-text-muted)]" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{item.reg_changes?.reg_documents?.reg_number ?? "—"}</p>
                    <p className="text-xs text-[var(--easa-color-text-muted)]">{item.reg_changes?.section_ref ?? "No section ref"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[var(--easa-color-surface-2)] px-2 py-0.5 text-xs font-medium capitalize">
                      {item.reg_changes?.change_type ?? item.classification}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <p className="max-w-[200px] truncate text-xs text-[var(--easa-color-text-secondary)]">
                      {item.flightbook_sections?.title ?? "—"}
                    </p>
                    {item.flightbook_sections?.section_number && (
                      <p className="text-xs text-[var(--easa-color-text-muted)]">§{item.flightbook_sections.section_number}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${riskColor(item.risk_level)}`}>
                      {item.risk_level}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <span className="text-xs text-[var(--easa-color-text-muted)]">
                      {item.confidence_score != null ? `${Math.round(Number(item.confidence_score))}%` : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-[var(--easa-color-text-muted)] lg:table-cell">
                    {new Date(item.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/updates/${item.id}`}
                      className="easa-btn secondary px-3 py-1.5 text-xs"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-[var(--easa-color-text-muted)]">
            Page {page} of {totalPages} · {total} total
          </p>
          <div className="flex gap-2">
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
