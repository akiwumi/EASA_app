"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, X } from "lucide-react";
import { useCoworker } from "./CoworkerProvider";

export const HENRY_WELCOME_DISMISSED_KEY = "henry-welcome-dismissed";

export default function HenryWelcomeBubble() {
  const { open, openCoworker } = useCoworker();
  const [visible, setVisible] = useState(false);

  const dismiss = useCallback(() => {
    window.sessionStorage.setItem(HENRY_WELCOME_DISMISSED_KEY, "true");
    setVisible(false);
  }, []);

  useEffect(() => {
    setVisible(window.sessionStorage.getItem(HENRY_WELCOME_DISMISSED_KEY) !== "true");
  }, []);

  useEffect(() => {
    if (open && visible) dismiss();
  }, [dismiss, open, visible]);

  const openHenry = () => {
    dismiss();
    openCoworker();
  };

  if (!visible) return null;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Open Henry welcome message"
      onClick={openHenry}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") openHenry();
      }}
      className="fixed bottom-20 right-4 z-[55] flex max-w-[280px] cursor-pointer items-start gap-3 rounded-[22px] border border-[var(--easa-color-border)] bg-white px-4 py-3 shadow-[0_16px_42px_rgba(24,38,38,0.18)] transition hover:-translate-y-0.5 lg:bottom-6 lg:left-[236px] lg:right-auto"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--easa-color-brand-light)] text-[var(--easa-color-brand-primary)]">
        <Bot size={17} strokeWidth={1.8} />
      </span>
      <span className="pr-4">
        <span className="block text-xs font-semibold text-[var(--easa-color-brand-primary)]">Henry</span>
        <span className="mt-0.5 block text-sm text-[var(--easa-color-text-primary)]">Hello, how can I help you?</span>
      </span>
      <button
        type="button"
        aria-label="Dismiss Henry welcome message"
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-[var(--easa-color-text-muted)] transition hover:bg-[var(--easa-color-surface-2)] hover:text-[var(--easa-color-text-primary)]"
        onClick={(event) => {
          event.stopPropagation();
          dismiss();
        }}
      >
        <X size={13} />
      </button>
    </div>
  );
}
