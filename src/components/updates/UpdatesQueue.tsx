"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Archive, CheckSquare, Square, Filter, Download, CheckCircle, XCircle, Clock, RefreshCw, FileText } from "lucide-react";
import type { UpdateQueueItem } from "@/lib/types/domain";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "watchlist", label: "Watchlist" },
  { value: "boneyard", label: "Boneyard" },
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
  if (status === "boneyard") return "text-[var(--easa-color-text-muted)] bg-[var(--easa-color-surface-2)]";
  return "text-[var(--easa-color-accent-orange)] bg-[color-mix(in_srgb,var(--easa-color-accent-orange)_12%,transparent)]";
}

function exportCsv(items: UpdateQueueItem[]) {
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

export default function UpdatesQueue({ canManage = false }: { canManage?: boolean }) {
  const [items, setItems] = useState<UpdateQueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState("pending");
  const [filterRisk, setFilterRisk] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterRegulation, setFilterRegulation] = useState("");
  const [regulationOptions, setRegulationOptions] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const limit = 50;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  function updateFilter(
    setter: React.Dispatch<React.SetStateAction<string>>,
    value: string,
  ) {
    setter(value);
    setPage(1);
  }

  const load = useCallback(async (overrides?: { page?: number; status?: string; regulation?: string }) => {
    setLoading(true);
    setError(null);
    const nextPage = overrides?.page ?? page;
    const nextStatus = overrides?.status ?? filterStatus;
    const nextRegulation = overrides?.regulation ?? filterRegulation;
    const params = new URLSearchParams({ page: String(nextPage), limit: String(limit) });
    if (nextStatus) params.set("status", nextStatus);
    if (filterRisk) params.set("risk", filterRisk);
    if (filterClass) params.set("classification", filterClass);
    if (nextRegulation) params.set("regulation", nextRegulation);

    const res = await fetch(`/api/updates?${params}`);
    if (!res.ok) { setError("Failed to load updates"); setLoading(false); return; }
    const json = await res.json();
    setItems(json.items ?? []);
    setTotal(json.total ?? 0);
    setRegulationOptions(json.regulations ?? []);
    setSelected(new Set());
    setLoading(false);
  }, [page, filterStatus, filterRisk, filterClass, filterRegulation]);

  const displayedItems = items;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function toggleAll() {
    if (selected.size === displayedItems.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(displayedItems.map((i) => i.id)));
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function bulkAction(action: string) {
    if (!selected.size) {
      if (action === "boneyard" && filterRegulation) {
        await eraseSelectedRegulation();
        return;
      }
      setBulkMsg("Select one or more updates first.");
      return;
    }
    setBulkLoading(true);
    setBulkMsg(null);
    const res = await fetch("/api/updates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ids: Array.from(selected),
        action,
        clearAfterApproval: action === "approved",
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setBulkMsg(`Error: ${json.error}`);
    } else {
      setBulkMsg(
        action === "approved"
          ? `${json.affected} item${json.affected !== 1 ? "s" : ""} approved and moved to boneyard.`
          : action === "boneyard"
            ? `${json.affected} item${json.affected !== 1 ? "s" : ""} moved to boneyard.`
          : `${json.affected} item${json.affected !== 1 ? "s" : ""} ${action}.`,
      );
      if (action === "approved" || action === "boneyard") {
        setFilterStatus("pending");
        setPage(1);
        await load({ page: 1, status: "pending" });
      } else {
        await load();
      }
    }
    setBulkLoading(false);
  }

  async function eraseSelectedRegulation() {
    if (!filterRegulation) {
      setBulkMsg("Choose a regulation before erasing it from the queue.");
      return;
    }

    setBulkLoading(true);
    setBulkMsg(null);
    const res = await fetch("/api/updates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "boneyard",
        status: filterStatus || undefined,
        risk: filterRisk || undefined,
        classification: filterClass || undefined,
        regulation: filterRegulation,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setBulkMsg(`Error: ${json.error}`);
    } else {
      setBulkMsg(
        `${json.affected ?? 0} ${filterRegulation} update${json.affected === 1 ? "" : "s"} erased to boneyard.`,
      );
      setFilterStatus("pending");
      setFilterRegulation("");
      setPage(1);
      await load({ page: 1, status: "pending", regulation: "" });
    }
    setBulkLoading(false);
  }

  async function createUpdatedFlightbooks() {
    setExportLoading(true);
    setExportMsg(null);
    const res = await fetch("/api/flightbooks/exports/updated", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvePending: true }),
    });
    const json = await res.json();
    if (!res.ok) {
      setExportMsg(`Error: ${json.error ?? "Could not create updated flight books."}`);
    } else if (json.exported === 0) {
      setExportMsg(json.message ?? "No approved mapped updates found.");
    } else {
      setExportMsg(
        json.message ??
          `${json.approved ?? 0} update${json.approved === 1 ? "" : "s"} approved. ` +
            `${json.exported} updated flight book${json.exported === 1 ? "" : "s"} created.`,
      );
      setFilterStatus("pending");
      setPage(1);
      await load({ page: 1, status: "pending" });
    }
    setExportLoading(false);
  }

  const totalPages = Math.ceil(total / limit);
  const allSelected = displayedItems.length > 0 && selected.size === displayedItems.length;

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
          {canManage && (
            <button
              className="easa-btn primary flex items-center gap-2 text-sm"
              disabled={exportLoading}
              onClick={createUpdatedFlightbooks}
            >
              <FileText size={15} strokeWidth={1.75} />
              {exportLoading ? "Completing..." : "Approve pending & create flight books"}
            </button>
          )}
          <button
            className="easa-btn secondary flex items-center gap-2 text-sm"
            onClick={() => exportCsv(items)}
          >
            <Download size={15} strokeWidth={1.75} />
            Export CSV
          </button>
          <button
            className="easa-btn secondary flex items-center gap-2 text-sm"
            onClick={() => void load()}
          >
            <RefreshCw size={15} strokeWidth={1.75} />
            Refresh
          </button>
        </div>
      </div>

      {exportMsg && (
        <p className={`rounded-[10px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-3 py-2 text-sm ${
          exportMsg.startsWith("Error") ? "text-[var(--easa-color-accent-pink)]" : "text-[var(--easa-color-text-secondary)]"
        }`}>
          {exportMsg}
        </p>
      )}

      {/* Filters */}
      <div className="easa-card flex flex-wrap gap-3 p-4">
        <Filter size={15} strokeWidth={1.75} className="mt-2 shrink-0 text-[var(--easa-color-text-muted)]" />
        <select className="easa-input flex-1 min-w-[140px]" value={filterStatus} onChange={(e) => updateFilter(setFilterStatus, e.target.value)}>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className="easa-input flex-1 min-w-[140px]" value={filterRisk} onChange={(e) => updateFilter(setFilterRisk, e.target.value)}>
          {RISK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className="easa-input flex-1 min-w-[160px]" value={filterClass} onChange={(e) => updateFilter(setFilterClass, e.target.value)}>
          {CLASS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          className="easa-input flex-1 min-w-[170px]"
          value={filterRegulation}
          onChange={(e) => updateFilter(setFilterRegulation, e.target.value)}
        >
          <option value="">All regulations</option>
          {regulationOptions.map((regulation) => (
            <option key={regulation} value={regulation}>{regulation}</option>
          ))}
        </select>
        {canManage && (
          <button
            className="easa-btn secondary flex items-center gap-1.5 px-3 py-2 text-xs"
            disabled={bulkLoading || !filterRegulation}
            onClick={eraseSelectedRegulation}
            title="Erase every queue item matching the selected regulation and current filters"
            type="button"
          >
            <Archive size={14} strokeWidth={1.75} />
            Erase regulation
          </button>
        )}
        {(filterStatus || filterRisk || filterClass || filterRegulation) && (
          <button
            className="text-xs text-[var(--easa-color-text-muted)] hover:text-[var(--easa-color-text-primary)]"
            onClick={() => {
              setFilterStatus("");
              setFilterRisk("");
              setFilterClass("");
              setFilterRegulation("");
              setPage(1);
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Bulk action bar */}
      {canManage && selected.size > 0 && (
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
              onClick={() => bulkAction("boneyard")}
              title="Move selected updates out of the active queue without approving them"
            >
              <Archive size={14} strokeWidth={1.75} className="text-[var(--easa-color-text-muted)]" />
              Erase selected
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
        {!canManage && (
          <div className="border-b border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-4 py-3 text-xs text-[var(--easa-color-text-muted)]">
            Read-only view. Approval and rollback controls are limited to admin, editor, and compliance manager roles.
          </div>
        )}
        {loading ? (
          <p className="p-6 text-sm text-[var(--easa-color-text-muted)]">Loading…</p>
        ) : error ? (
          <p className="p-6 text-sm text-[var(--easa-color-accent-pink)]">{error}</p>
        ) : displayedItems.length === 0 ? (
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
                  {canManage ? (
                    <button onClick={toggleAll}>
                      {allSelected
                        ? <CheckSquare size={16} strokeWidth={1.75} className="text-[var(--easa-color-brand-primary)]" />
                        : <Square size={16} strokeWidth={1.75} className="text-[var(--easa-color-text-muted)]" />}
                    </button>
                  ) : null}
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
              {displayedItems.map((item) => (
                <tr
                  key={item.id}
                  className={`border-b border-[var(--easa-color-border)] last:border-0 transition hover:bg-[var(--easa-color-surface-2)] ${selected.has(item.id) ? "bg-[color-mix(in_srgb,var(--easa-color-brand-primary)_5%,transparent)]" : ""}`}
                >
                  <td className="px-4 py-3">
                    {canManage ? (
                      <button onClick={() => toggleOne(item.id)}>
                        {selected.has(item.id)
                          ? <CheckSquare size={16} strokeWidth={1.75} className="text-[var(--easa-color-brand-primary)]" />
                          : <Square size={16} strokeWidth={1.75} className="text-[var(--easa-color-text-muted)]" />}
                      </button>
                    ) : null}
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
