"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Archive, Bot, Grip, History, MoveDiagonal2, X } from "lucide-react";
import Composer from "./Composer";
import ConversationList from "./ConversationList";
import MessageTimeline from "./MessageTimeline";
import { useCoworker } from "./CoworkerProvider";
import { useHenryModalGeometry } from "./useHenryModalGeometry";

export default function CoworkerDrawer() {
  const { open, closeCoworker, error } = useCoworker();
  const [showHistory, setShowHistory] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const { desktop, geometry, onHeaderPointerDown, onResizePointerDown } = useHenryModalGeometry();
  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeCoworker();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previouslyFocusedRef.current?.focus();
    };
  }, [closeCoworker, open]);
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-[rgba(24,38,38,0.16)]" onClick={closeCoworker} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        data-henry-modal
        aria-label="Henry compliance coworker"
        aria-modal="true"
        className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white shadow-[0_20px_60px_rgba(24,38,38,0.22)] lg:inset-auto lg:rounded-[30px] lg:border lg:border-[var(--easa-color-border)]"
        style={desktop ? {
          left: geometry.x,
          top: geometry.y,
          width: geometry.width,
          height: geometry.height,
        } : undefined}
      >
        <div
          className="flex shrink-0 touch-none items-center justify-between border-b border-[var(--easa-color-border)] bg-white px-5 py-4 lg:cursor-move"
          data-henry-drag-handle
          onPointerDown={onHeaderPointerDown}
        >
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--easa-color-brand-light)] text-[var(--easa-color-brand-primary)]">
              <Bot size={18} strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-[var(--easa-color-text-primary)]">Henry</h2>
              <p className="text-xs text-[var(--easa-color-text-muted)]">Your compliance coworker</p>
            </div>
          </div>
          <div className="flex items-center gap-1" onPointerDown={(event) => event.stopPropagation()}>
            {desktop ? <Grip size={15} className="mr-1 text-[var(--easa-color-text-muted)]" aria-hidden="true" /> : null}
            <Link href="/coworker/archive" title="Henry archive" aria-label="Open Henry archive" className="easa-icon-btn" onClick={closeCoworker}><Archive size={15} /></Link>
            <button type="button" title="Chat history" aria-label="Toggle Henry chat history" className="easa-icon-btn" onClick={() => setShowHistory((current) => !current)}><History size={15} /></button>
            <button ref={closeButtonRef} type="button" title="Close" aria-label="Close Henry" className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--easa-color-surface-2)] text-[var(--easa-color-text-primary)] transition hover:bg-[var(--easa-color-border)]" onClick={closeCoworker}><X size={17} /></button>
          </div>
        </div>
        {showHistory ? <ConversationList /> : null}
        {error ? <p className="border-b border-[var(--easa-color-border)] px-4 py-2 text-xs text-[var(--easa-color-accent-pink)]">{error}</p> : null}
        <MessageTimeline />
        <Composer />
        {desktop ? (
          <button
            type="button"
            aria-label="Resize Henry"
            title="Resize Henry"
            className="absolute bottom-2 right-2 flex h-7 w-7 touch-none cursor-se-resize items-center justify-center rounded-full text-[var(--easa-color-text-muted)] transition hover:bg-[var(--easa-color-surface-2)] hover:text-[var(--easa-color-brand-primary)]"
            onPointerDown={onResizePointerDown}
          >
            <MoveDiagonal2 size={15} />
          </button>
        ) : null}
      </div>
    </>
  );
}
