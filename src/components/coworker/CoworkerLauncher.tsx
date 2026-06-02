"use client";

import { Bot } from "lucide-react";
import { useCoworker } from "./CoworkerProvider";

export default function CoworkerLauncher({
  variant = "sidebar",
  onClick,
}: {
  variant?: "sidebar" | "icon";
  onClick?: () => void;
}) {
  const { openCoworker } = useCoworker();
  const handleClick = onClick ?? openCoworker;
  if (variant === "icon") {
    return (
      <button aria-label="Open compliance coworker" type="button" onClick={handleClick} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--easa-color-text-secondary)] transition hover:bg-[var(--easa-color-surface-2)] hover:text-[var(--easa-color-brand-primary)]">
        <Bot size={18} strokeWidth={1.85} />
      </button>
    );
  }
  return (
    <button type="button" onClick={handleClick} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--easa-color-text-secondary)] transition hover:bg-[var(--easa-color-surface-2)] hover:text-[var(--easa-color-text-primary)]">
      <Bot size={17} strokeWidth={1.85} className="shrink-0" />
      Compliance coworker
    </button>
  );
}
