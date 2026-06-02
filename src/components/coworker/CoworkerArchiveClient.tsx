"use client";

import Link from "next/link";
import { Archive, MessageSquare, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useCoworker } from "./CoworkerProvider";

function formatArchivedAt(value?: string | null) {
  if (!value) return "Archived recently";
  return `Archived ${new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))}`;
}

export default function CoworkerArchiveClient() {
  const {
    archivedConversations,
    deleteArchivedConversation,
    loading,
    refreshArchivedConversations,
    restoreConversation,
  } = useCoworker();
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    void refreshArchivedConversations().catch(() => setLoadError("Unable to load Henry archive."));
  }, [refreshArchivedConversations]);

  return (
    <div className="space-y-6">
      <section className="easa-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--easa-color-brand-light)] text-[var(--easa-color-brand-primary)]">
              <Archive size={20} strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[var(--easa-color-text-primary)]">Henry archive</h1>
              <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
                Restore previous compliance chats or permanently erase conversations you no longer need.
              </p>
            </div>
          </div>
          <Link href="/dashboard" className="easa-btn secondary text-sm">Back to dashboard</Link>
        </div>
      </section>

      {loadError ? (
        <p className="rounded-[18px] border border-[var(--easa-color-border)] bg-white px-4 py-3 text-sm text-[var(--easa-color-accent-pink)]">
          {loadError}
        </p>
      ) : null}

      {archivedConversations.length === 0 ? (
        <section className="easa-card p-10 text-center">
          <MessageSquare size={26} strokeWidth={1.5} className="mx-auto text-[var(--easa-color-text-muted)]" />
          <p className="mt-3 text-sm font-semibold text-[var(--easa-color-text-primary)]">No archived conversations</p>
          <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
            Archived Henry conversations will appear here.
          </p>
        </section>
      ) : (
        <div className="grid gap-3">
          {archivedConversations.map((conversation) => (
            <article key={conversation.id} className="easa-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-[var(--easa-color-text-primary)]">{conversation.title}</h2>
                <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">{formatArchivedAt(conversation.archivedAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={loading} className="easa-btn secondary gap-2 text-xs" onClick={() => void restoreConversation(conversation.id)}>
                  <RotateCcw size={14} /> Restore
                </button>
                <button
                  type="button"
                  disabled={loading}
                  className="easa-btn secondary gap-2 text-xs text-[var(--easa-color-accent-pink)]"
                  onClick={() => {
                    if (window.confirm("Permanently delete this Henry conversation? This cannot be undone.")) {
                      void deleteArchivedConversation(conversation.id);
                    }
                  }}
                >
                  <Trash2 size={14} /> Delete permanently
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
