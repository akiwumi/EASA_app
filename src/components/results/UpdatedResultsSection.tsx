"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle, CheckSquare, FolderX, ListPlus, Loader2, Plus, RotateCcw, Square, Trash2, XCircle } from "lucide-react";
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

  const remainingIds = useMemo(
    () => activeItems.filter((item) => states[item.id] !== "queued").map((item) => item.id),
    [activeItems, states],
  );
  const queuedCount = activeItems.length - remainingIds.length;

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
      current.size === activeItems.length ? new Set() : new Set(activeItems.map((item) => item.id))
    ));
  }

  function toggleAllTrash() {
    setSelectedTrash((current) => (
      current.size === trashItems.length ? new Set() : new Set(trashItems.map((item) => item.id))
    ));
  }

  async function trashAction(ids: string[], action: "delete" | "restore" | "permanent_delete") {
    if (ids.length === 0) return;
    if (action === "permanent_delete" && !confirm("Permanently delete selected results? This cannot be undone.")) return;

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

    setStates((current) => ({ ...current, [findingId]: "queued" }));
    setDraftReady((current) => ({ ...current, [findingId]: Boolean(json.draftGenerated) || current[findingId] }));
    setMessage(json.draftError ? `Queued. Draft needs review: ${json.draftError}` : "Update added to queue.");
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
    const nextStates = Object.fromEntries(
      remainingIds.map((id) => {
        const result = results.find((entry) => entry.findingId === id);
        return [id, result?.id ? "queued" : "error"] as const;
      }),
    ) as Record<string, QueueState>;
    const nextDraftReady = Object.fromEntries(
      results
        .filter((result) => result.id)
        .map((result) => [result.findingId, Boolean(result.draftGenerated)]),
    ) as Record<string, boolean>;

    setStates((current) => ({ ...current, ...nextStates }));
    setDraftReady((current) => ({ ...current, ...nextDraftReady }));
    setBulkLoading(false);

    const failed = results.filter((result) => result.error).length;
    const draftErrors = results.filter((result) => result.draftError).length;
    if (!res.ok && results.length === 0) {
      setMessage(json.error ?? "Failed to add updates.");
    } else if (failed || draftErrors) {
      setMessage(`${results.length - failed} added. ${failed + draftErrors} need manual review in the queue.`);
    } else {
      setMessage(`${results.length} update${results.length === 1 ? "" : "s"} added to the queue with AI drafts.`);
    }
  }

  return (
    <section className="easa-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Updated results</h2>
          <p className="text-sm text-[var(--easa-color-text-muted)]">
            Collated updates with AI confidence and mapped sections.
          </p>
        </div>
        {activeItems.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[var(--easa-color-text-muted)]">
              {queuedCount} of {activeItems.length} queued
            </span>
            <button
              className="easa-btn secondary flex items-center gap-1.5 text-sm"
              disabled={trashLoading}
              onClick={toggleAllActive}
            >
              {selectedActive.size === activeItems.length ? <CheckSquare size={14} strokeWidth={1.75} /> : <Square size={14} strokeWidth={1.75} />}
              {selectedActive.size === activeItems.length ? "Clear selection" : "Select all"}
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
                View update queue
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
        {activeItems.length === 0 ? (
          <div className="rounded-[14px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-6 text-sm text-[var(--easa-color-text-muted)]">
            No active AI findings. Run the RSS ingest + analysis to populate results, or restore items from the deleted folder.
          </div>
        ) : (
          activeItems.map((item) => {
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
                onClick={() => trashAction(Array.from(selectedTrash), "permanent_delete")}
              >
                <XCircle size={14} strokeWidth={1.75} />
                Delete permanently
              </button>
            </div>
          ) : null}
        </div>

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
                        onClick={() => trashAction([item.id], "permanent_delete")}
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
