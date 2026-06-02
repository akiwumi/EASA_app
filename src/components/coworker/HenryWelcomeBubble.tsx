"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { Bot, X } from "lucide-react";
import { useCoworker } from "./CoworkerProvider";

export const HENRY_WELCOME_DISMISSED_KEY = "henry-welcome-dismissed";
const HENRY_WELCOME_DISMISSED_EVENT = "henry-welcome-dismissed-change";

function subscribeToDismissal(callback: () => void) {
  window.addEventListener(HENRY_WELCOME_DISMISSED_EVENT, callback);
  return () => window.removeEventListener(HENRY_WELCOME_DISMISSED_EVENT, callback);
}

function isDismissed() {
  return window.sessionStorage.getItem(HENRY_WELCOME_DISMISSED_KEY) === "true";
}

function dismissWelcome() {
  window.sessionStorage.setItem(HENRY_WELCOME_DISMISSED_KEY, "true");
  window.dispatchEvent(new Event(HENRY_WELCOME_DISMISSED_EVENT));
}

export default function HenryWelcomeBubble() {
  const { open, openCoworker } = useCoworker();
  const dismissed = useSyncExternalStore(subscribeToDismissal, isDismissed, () => true);

  const dismiss = useCallback(() => {
    dismissWelcome();
  }, []);

  useEffect(() => {
    if (open) dismiss();
  }, [dismiss, open]);

  const openHenry = () => {
    dismiss();
    openCoworker();
  };

  if (dismissed || open) return null;
  return (
    <div className="fixed bottom-20 right-4 z-[55] max-w-[280px] rounded-[22px] border border-[var(--easa-color-border)] bg-white shadow-[0_16px_42px_rgba(24,38,38,0.18)] transition hover:-translate-y-0.5 lg:bottom-6 lg:left-[236px] lg:right-auto">
      <button type="button" aria-label="Open Henry welcome message" onClick={openHenry} className="flex cursor-pointer items-start gap-3 px-4 py-3 pr-8 text-left">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--easa-color-brand-light)] text-[var(--easa-color-brand-primary)]">
          <Bot size={17} strokeWidth={1.8} />
        </span>
        <span>
          <span className="block text-xs font-semibold text-[var(--easa-color-brand-primary)]">Henry</span>
          <span className="mt-0.5 block text-sm text-[var(--easa-color-text-primary)]">Hello, how can I help you?</span>
        </span>
      </button>
      <button
        type="button"
        aria-label="Dismiss Henry welcome message"
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-[var(--easa-color-text-muted)] transition hover:bg-[var(--easa-color-surface-2)] hover:text-[var(--easa-color-text-primary)]"
        onKeyDown={(event) => event.stopPropagation()}
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
