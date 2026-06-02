"use client";

import { Bot, X } from "lucide-react";
import { useCoworker } from "./CoworkerProvider";

export default function CoworkerLauncher({
  variant = "sidebar",
  onClick,
}: {
  variant?: "sidebar" | "icon" | "floating";
  onClick?: () => void;
}) {
  const { closeCoworker, open, openCoworker } = useCoworker();
  if (variant === "floating") {
    return (
      <button
        aria-label={open ? "Hide Henry" : "Open Henry"}
        aria-pressed={open}
        title={open ? "Hide Henry" : "Open Henry"}
        type="button"
        onClick={open ? closeCoworker : openCoworker}
        className="fixed right-4 top-4 z-[60] flex h-12 w-12 items-center justify-center rounded-full border border-[var(--easa-color-border)] bg-white text-[var(--easa-color-brand-primary)] shadow-[0_12px_30px_rgba(24,38,38,0.18)] transition hover:-translate-y-0.5 hover:bg-[var(--easa-color-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--easa-color-brand-primary)] focus-visible:ring-offset-2 lg:right-6 lg:top-6"
      >
        {open ? <X size={18} strokeWidth={1.9} /> : <Bot size={19} strokeWidth={1.85} />}
      </button>
    );
  }
  const handleClick = onClick ?? openCoworker;
  if (variant === "icon") {
    return (
      <button aria-label="Open Henry" type="button" onClick={handleClick} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--easa-color-text-secondary)] transition hover:bg-[var(--easa-color-surface-2)] hover:text-[var(--easa-color-brand-primary)]">
        <Bot size={18} strokeWidth={1.85} />
      </button>
    );
  }
  return (
    <button type="button" onClick={handleClick} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--easa-color-text-secondary)] transition hover:bg-[var(--easa-color-surface-2)] hover:text-[var(--easa-color-text-primary)]">
      <Bot size={17} strokeWidth={1.85} className="shrink-0" />
      Henry
    </button>
  );
}
