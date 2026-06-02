"use client";

import { useEffect, useState } from "react";
import { Bot, History, X } from "lucide-react";
import Composer from "./Composer";
import ConversationList from "./ConversationList";
import MessageTimeline from "./MessageTimeline";
import { useCoworker } from "./CoworkerProvider";

export default function CoworkerDrawer() {
  const { open, closeCoworker, error } = useCoworker();
  const [showHistory, setShowHistory] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") closeCoworker(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeCoworker, open]);
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={closeCoworker} aria-hidden="true" />
      <div role="dialog" aria-label="Compliance coworker" aria-modal="true" className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] shadow-[var(--easa-shadow-2)]">
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--easa-color-border)] px-4 py-4">
          <div className="flex items-center gap-2">
            <Bot size={18} strokeWidth={1.75} />
            <div>
              <h2 className="text-sm font-semibold">Compliance coworker</h2>
              <p className="text-[11px] text-[var(--easa-color-text-muted)]">Drafts require your approval</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button type="button" title="Chat history" aria-label="Toggle chat history" className="easa-icon-btn" onClick={() => setShowHistory((current) => !current)}><History size={15} /></button>
            <button type="button" title="Close" aria-label="Close compliance coworker" className="easa-icon-btn" onClick={closeCoworker}><X size={15} /></button>
          </div>
        </div>
        {showHistory ? <ConversationList /> : null}
        {error ? <p className="border-b border-[var(--easa-color-border)] px-4 py-2 text-xs text-[var(--easa-color-accent-pink)]">{error}</p> : null}
        <MessageTimeline />
        <Composer />
      </div>
    </>
  );
}
