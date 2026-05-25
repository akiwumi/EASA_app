"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle, CheckSquare, FolderX, ListPlus, Loader2, Plus, RotateCcw, Square, Trash2, X, XCircle } from "lucide-react";
import type { EasaUpdate } from "@/lib/ai-scraper";

type QueueState = "idle" | "loading" | "queued" | "error";

type QueueResponse = {
  id?: string;
  alreadyQueued?: boolean;
  draftGenerated?: boolean;
  draftError?: string;
  results?: {
    findingId: string;
    id?: string;
    alreadyQueued?: boolean;
    draftGenerated?: boolean;
    draftError?: string;
    error?: string;
  }[];
  error?: string;
};

type TrashResponse = {
  ok?: boolean;
  affected?: number;
  error?: string;
};

function impactClass(impact: EasaUpdate["impact"]) {
  if (impact === "High") return "is-red";
  if (impact === "Medium") return "is-orange";
  return "is-green";
}

function queuedMessage(draftReady?: boolean) {
  return draftReady ? "Added with AI draft" : "Added to queue";
}

export default function UpdatedResultsSection({
  items,
  deletedItems = [],
}: {
  items: EasaUpdate[];
  deletedItems?: EasaUpdate[];
}) {
  const [activeItems, setActiveItems] = useState(items);
  const [trashItems, setTrashItems] = useState(deletedItems);
  const [states, setStates] = useState<Record<string, QueueState>>(() =>
    Object.fromEntries(items.map((item) => [item.id, item.queuedUpdateId ? "queued" : "idle"])),
  );
  const [draftReady, setDraftReady] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.map((item) => [item.id, Boolean(item.queuedDraftReady)])),
  );
  const [bulkLoading, setBulkLoading] = useState(false);
  const [trashLoading, setTrashLoading] = useState(false);
  const [selectedActive, setSelectedActive] = useState<Set<string>>(new Set());
  const [selectedTrash, setSelectedTrash] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<{ type: "category" | "impact"; value: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ ids: string[] } | null>(null);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of activeItems) map[item.category] = (map[item.category] ?? 0) + 1;
    return map;
  }, [activeItems]);

  const byImpact = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of activeItems) map[item.impact] = (map[item.impact] ?? 0) + 1;
    return map;
  }, [activeItems]);

  const filteredItems = useMemo(() => {
    if (!activeFilter) return activeItems;
    if (activeFilter.type === "category") return activeItems.filter((item) => item.category === activeFilter.value);
    return activeItems.filter((item) => item.impact === activeFilter.value);
  }, [activeItems, activeFilter]);

  const remainingIds = useMemo(
    () => filteredItems.filter((item) => states[item.id] !== "queued").map((item) => item.id),
    [filteredItems, states],
  );

  const queuedCount = filteredItems.length - remainingIds.length;

  function toggleSelected(setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) {
    setter((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllActive() {
    setSelectedActive((current) => (
      current.size === filteredItems.length ? new Set() : new Set(filteredItems.map((item) => item.id))
    ));
  }

  function setFilter(type: "category" | "impact", value: string) {
    setActiveFilter((current) =>
      current?.type === type && current.value === value ? null : { type, value }
    );
    setSelectedActive(new Set());
  }

  function toggleAllTrash() {
    setSelectedTrash((current) => (
      current.size === trashItems.length ? new Set() : new Set(trashItems.map((item) => item.id))
    ));
  }

  function requestDelete(ids: string[]) {
    if (ids.length === 0) return;
    setPendingDelete({ ids });
  }

  async function trashAction(ids: string[], action: "delete" | "restore" | "permanent_delete") {
    if (ids.length === 0) return;

    setTrashLoading(true);
    setMessage(null);
    const res = await fetch("/api/findings/trash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, action }),
    });
    const json = (await res.json()) as TrashResponse;
    if (!res.ok || json.error) {
      setMessage(json.error ?? "Unable to update deleted results.");
      setTrashLoading(false);
      return;
    }

    if (action === "delete") {
      const now = new Date().toISOString();
      const moving = activeItems.filter((item) => ids.includes(item.id)).map((item) => ({ ...item, deletedAt: now }));
      setActiveItems((current) => current.filter((item) => !ids.includes(item.id)));
      setTrashItems((current) => [...moving, ...current]);
      setSelectedActive(new Set());
      setMessage(`${json.affected ?? ids.length} result${ids.length === 1 ? "" : "s"} moved to deleted folder.`);
    } else if (action === "restore") {
      const restoring = trashItems.filter((item) => ids.includes(item.id)).map((item) => ({ ...item, deletedAt: null }));
      setTrashItems((current) => current.filter((item) => !ids.includes(item.id)));
      setActiveItems((current) => [...restoring, ...current]);
      setSelectedTrash(new Set());
      setMessage(`${json.affected ?? ids.length} result${ids.length === 1 ? "" : "s"} restored.`);
    } else {
      setTrashItems((current) => current.filter((item) => !ids.includes(item.id)));
      setSelectedTrash(new Set());
      setMessage(`${json.affected ?? ids.length} result${ids.length === 1 ? "" : "s"} permanently deleted.`);
    }
    setTrashLoading(false);
  }

  function removeQueued(ids: string[]) {
    const now = new Date().toISOString();
    setActiveItems((current) => {
      const moving = current.filter((item) => ids.includes(item.id)).map((item) => ({ ...item, deletedAt: now }));
      setTrashItems((t) => [...moving, ...t]);
      return current.filter((item) => !ids.includes(item.id));
    });
    setSelectedActive((s) => { const next = new Set(s); ids.forEach((id) => next.delete(id)); return next; });
    void fetch("/api/findings/trash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, action: "delete" }),
    });
  }

  async function addOne(findingId: string) {
    setMessage(null);
    setStates((current) => ({ ...current, [findingId]: "loading" }));

    const res = await fetch("/api/findings/add-to-queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ findingId, generateDraft: true }),
    });
    const json = (await res.json()) as QueueResponse;

    if (!res.ok || json.error) {
      setStates((current) => ({ ...current, [findingId]: "error" }));
      setMessage(json.error ?? "Failed to add update to queue.");
      return;
    }

    removeQueued([findingId]);
    setMessage(json.draftError ? `Queued with draft error — check the review queue.` : "Added to queue and removed from results.");
  }

  async function addAll() {
    if (remainingIds.length === 0) return;
    setBulkLoading(true);
    setMessage(null);
    setStates((current) => ({
      ...current,
      ...Object.fromEntries(remainingIds.map((id) => [id, "loading"])),
    }));

    const res = await fetch("/api/findings/add-to-queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ findingIds: remainingIds, generateDrafts: true }),
    });
    const json = (await res.json()) as QueueResponse;
    const results = json.results ?? [];

    const queuedIds = results.filter((r) => r.id).map((r) => r.findingId);
    const failedIds = remainingIds.filter((id) => !queuedIds.includes(id));

    if (queuedIds.length > 0) removeQueued(queuedIds);

    setStates((current) => ({
      ...current,
      ...Object.fromEntries(failedIds.map((id) => [id, "error"])),
    }));
    setBulkLoading(false);

    const draftErrors = results.filter((r) => r.draftError).length;
    if (!res.ok && results.length === 0) {
      setMessage(json.error ?? "Failed to add updates.");
    } else if (failedIds.length) {
      setMessage(`${queuedIds.length} added and removed. ${failedIds.length} failed — retry individually.`);
    } else if (draftErrors) {
      setMessage(`${queuedIds.length} added and removed. ${draftErrors} draft error(s) — check the review queue.`);
    } else {
      setMessage(`${queuedIds.length} update${queuedIds.length === 1 ? "" : "s"} added to the queue and removed from results.`);
    }
  }

  return (
    <section className="easa-card p-6">
      {activeItems.length > 0 && (
        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--easa-color-text-muted)]">By category</p>
            <div className="space-y-1">
              {Object.entries(byCategory).map(([category, count]) => {
                const isActive = activeFilter?.type === "category" && activeFilter.value === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setFilter("category", category)}
                    className={`flex w-full items-center justify-between rounded-[8px] px-2 py-1 text-sm transition-colors ${
                      isActive
                        ? "bg-[var(--easa-color-brand-primary)] text-white"
                        : "hover:bg-[var(--easa-color-surface-2)]"
                    }`}
                  >
                    <span>{category}</span>
                    <span className={isActive ? "text-white/80" : "text-[var(--easa-color-text-muted)]"}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--easa-color-text-muted)]">Impact mix</p>
            <div className="space-y-1">
              {Object.entries(byImpact).map(([impact, count]) => {
                const isActive = activeFilter?.type === "impact" && activeFilter.value === impact;
                return (
                  <button
                    key={impact}
                    type="button"
                    onClick={() => setFilter("impact", impact)}
                    className={`flex w-full items-center justify-between rounded-[8px] px-2 py-1 text-sm transition-colors ${
                      isActive
                        ? "bg-[var(--easa-color-brand-primary)] text-white"
                        : "hover:bg-[var(--easa-color-surface-2)]"
                    }`}
                  >
                    <span>{impact} impact</span>
                    <span className={isActive ? "text-white/80" : "text-[var(--easa-color-text-muted)]"}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Updated results</h2>
          {activeFilter ? (
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm text-[var(--easa-color-text-muted)]">
                Filtered by {activeFilter.type}: <strong>{activeFilter.value}</strong> · {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={() => { setActiveFilter(null); setSelectedActive(new Set()); }}
                className="flex items-center gap-1 rounded-full bg-[var(--easa-color-surface-2)] px-2 py-0.5 text-xs text-[var(--easa-color-text-muted)] hover:bg-[var(--easa-color-surface-3)] transition-colors"
              >
                <X size={11} /> Clear
              </button>
            </div>
          ) : (
            <p className="text-sm text-[var(--easa-color-text-muted)]">
              Collated updates with AI confidence and mapped sections.
            </p>
          )}
        </div>
        {activeItems.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[var(--easa-color-text-muted)]">
              {queuedCount} of {filteredItems.length} queued
            </span>
            <button
              className="easa-btn secondary flex items-center gap-1.5 text-sm"
              disabled={trashLoading}
              onClick={toggleAllActive}
            >
              {selectedActive.size === filteredItems.length ? <CheckSquare size={14} strokeWidth={1.75} /> : <Square size={14} strokeWidth={1.75} />}
              {selectedActive.size === filteredItems.length ? "Clear selection" : "Select all"}
            </button>
            <button
              className="easa-btn secondary flex items-center gap-1.5 text-sm"
              disabled={trashLoading || selectedActive.size === 0}
              onClick={() => trashAction(Array.from(selectedActive), "delete")}
            >
              <Trash2 size={14} strokeWidth={1.75} />
              Delete selected
            </button>
            <button
              className="easa-btn secondary flex items-center gap-1.5 text-sm"
              disabled={trashLoading || activeItems.length === 0}
              onClick={() => trashAction(activeItems.map((item) => item.id), "delete")}
            >
              <FolderX size={14} strokeWidth={1.75} />
              Delete all
            </button>
            <button
              className="easa-btn primary flex items-center gap-1.5 text-sm"
              disabled={bulkLoading || remainingIds.length === 0}
              onClick={addAll}
            >
              {bulkLoading ? <Loader2 size={14} strokeWidth={1.75} className="animate-spin" /> : <ListPlus size={14} strokeWidth={1.75} />}
              {remainingIds.length === 0 ? "All added" : "Add all"}
            </button>
            {queuedCount > 0 ? (
              <Link href="/updates" className="easa-btn secondary text-sm">
                View review queue
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      {message ? (
        <p className="mt-4 rounded-[10px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-3 py-2 text-sm text-[var(--easa-color-text-secondary)]">
          {message}
        </p>
      ) : null}

      <div className="mt-6 space-y-4">
        {filteredItems.length === 0 ? (
          <div className="rounded-[14px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-6 text-sm text-[var(--easa-color-text-muted)]">
            {activeItems.length === 0
              ? "No active AI findings. Run the RSS ingest + analysis to populate results, or restore items from the deleted folder."
              : "No results match the current filter."}
          </div>
        ) : (
          filteredItems.map((item) => {
            const state = states[item.id] ?? "idle";
            const isQueued = state === "queued";
            const isLoading = state === "loading";
            const isSelected = selectedActive.has(item.id);

            return (
              <div
                key={item.id}
                className="rounded-[14px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <button
                      type="button"
                      className="mt-0.5 shrink-0 text-[var(--easa-color-text-muted)]"
                      onClick={() => toggleSelected(setSelectedActive, item.id)}
                      title={isSelected ? "Deselect result" : "Select result"}
                    >
                      {isSelected ? <CheckSquare size={17} strokeWidth={1.75} /> : <Square size={17} strokeWidth={1.75} />}
                    </button>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
                      {item.publishedAt} · {item.category}
                    </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`easa-badge ${impactClass(item.impact)}`}>
                      {item.impact} impact
                    </span>
                    <span className="easa-badge is-blue">
                      Confidence {item.confidence}
                    </span>
                    <span className="easa-badge is-orange">{item.status}</span>
                  </div>
                </div>
                <p className="mt-3 text-sm text-[var(--easa-color-text-secondary)]">
                  {item.summary}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--easa-color-text-muted)]">
                  <span>Mapped to: {item.mappedSection}</span>
                  <div className="flex flex-wrap gap-2">
                    <Link className="easa-btn secondary" href={`/results/${item.id}`}>
                      View diff
                    </Link>
                    <button
                      className="easa-btn secondary flex items-center gap-1.5"
                      disabled={trashLoading}
                      onClick={() => trashAction([item.id], "delete")}
                    >
                      <Trash2 size={14} strokeWidth={1.75} />
                      Delete
                    </button>
                    {isQueued ? (
                      <>
                        <span className="flex items-center gap-1.5 text-sm text-[var(--easa-color-accent-green)]">
                          <CheckCircle size={15} strokeWidth={1.75} /> {queuedMessage(draftReady[item.id])}
                        </span>
                        <Link href="/updates" className="easa-btn primary text-sm">
                          View in queue
                        </Link>
                      </>
                    ) : (
                      <button
                        className="easa-btn primary flex items-center gap-1.5"
                        disabled={isLoading}
                        onClick={() => addOne(item.id)}
                      >
                        {isLoading ? <Loader2 size={14} strokeWidth={1.75} className="animate-spin" /> : <Plus size={14} strokeWidth={2} />}
                        {isLoading ? "Adding..." : state === "error" ? "Retry add" : "Add to queue"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-8 border-t border-[var(--easa-color-border)] pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Deleted folder</h3>
            <p className="text-sm text-[var(--easa-color-text-muted)]">
              Deleted results stay here until restored or permanently deleted.
            </p>
          </div>
          {trashItems.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="easa-btn secondary flex items-center gap-1.5 text-sm"
                disabled={trashLoading}
                onClick={toggleAllTrash}
              >
                {selectedTrash.size === trashItems.length ? <CheckSquare size={14} strokeWidth={1.75} /> : <Square size={14} strokeWidth={1.75} />}
                {selectedTrash.size === trashItems.length ? "Clear selection" : "Select all"}
              </button>
              <button
                className="easa-btn secondary flex items-center gap-1.5 text-sm"
                disabled={trashLoading || selectedTrash.size === 0}
                onClick={() => trashAction(Array.from(selectedTrash), "restore")}
              >
                <RotateCcw size={14} strokeWidth={1.75} />
                Retrieve selected
              </button>
              <button
                className="easa-btn secondary flex items-center gap-1.5 text-sm"
                disabled={trashLoading || selectedTrash.size === 0}
                onClick={() => requestDelete(Array.from(selectedTrash))}
              >
                <XCircle size={14} strokeWidth={1.75} />
                Delete permanently
              </button>
            </div>
          ) : null}
        </div>

        {pendingDelete && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/30">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              Permanently delete {pendingDelete.ids.length} item{pendingDelete.ids.length !== 1 ? "s" : ""}? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                className="easa-btn secondary text-sm"
                onClick={() => setPendingDelete(null)}
              >
                Cancel
              </button>
              <button
                className="easa-btn text-sm font-medium"
                style={{ background: "var(--easa-color-accent-pink)", color: "#fff", border: "none" }}
                disabled={trashLoading}
                onClick={async () => {
                  const ids = pendingDelete.ids;
                  setPendingDelete(null);
                  await trashAction(ids, "permanent_delete");
                }}
              >
                Yes, delete permanently
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 space-y-3">
          {trashItems.length === 0 ? (
            <div className="rounded-[14px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-5 text-sm text-[var(--easa-color-text-muted)]">
              Deleted folder is empty.
            </div>
          ) : (
            trashItems.map((item) => {
              const isSelected = selectedTrash.has(item.id);
              return (
                <div
                  key={item.id}
                  className="rounded-[14px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <button
                        type="button"
                        className="mt-0.5 shrink-0 text-[var(--easa-color-text-muted)]"
                        onClick={() => toggleSelected(setSelectedTrash, item.id)}
                        title={isSelected ? "Deselect deleted result" : "Select deleted result"}
                      >
                        {isSelected ? <CheckSquare size={17} strokeWidth={1.75} /> : <Square size={17} strokeWidth={1.75} />}
                      </button>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
                          Deleted {item.deletedAt ? new Date(item.deletedAt).toLocaleString("en-GB") : "recently"} · {item.category}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="easa-btn primary flex items-center gap-1.5 text-sm"
                        disabled={trashLoading}
                        onClick={() => trashAction([item.id], "restore")}
                      >
                        <RotateCcw size={14} strokeWidth={1.75} />
                        Retrieve
                      </button>
                      <button
                        className="easa-btn secondary flex items-center gap-1.5 text-sm"
                        disabled={trashLoading}
                        onClick={() => requestDelete([item.id])}
                      >
                        <XCircle size={14} strokeWidth={1.75} />
                        Delete permanently
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
