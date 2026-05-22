"use client";

import { useEffect, useState } from "react";
import { Cookie, X } from "lucide-react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem("cookie_consent");
      if (!consent) setVisible(true);
    } catch {
      // localStorage unavailable — don't show banner
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem("cookie_consent", "accepted");
      document.cookie =
        "cookie_consent=accepted; max-age=31536000; path=/; samesite=lax";
    } catch {
      // ignore
    }
    setVisible(false);
  }

  function decline() {
    try {
      localStorage.setItem("cookie_consent", "declined");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-start gap-3 rounded-2xl border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] px-4 py-3.5 shadow-[var(--easa-shadow-2)] backdrop-blur-xl"
    >
      {/* Icon */}
      <div className="mt-0.5 shrink-0 rounded-lg bg-[var(--easa-color-brand-light)] p-1.5">
        <Cookie
          size={16}
          strokeWidth={1.75}
          className="text-[var(--easa-color-brand-primary)]"
        />
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-[var(--easa-color-text-primary)]">
          We use cookies
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-[var(--easa-color-text-muted)]">
          Flight Lyceum uses cookies for authentication and, with your consent,
          anonymous analytics to improve the platform.
        </p>
        <div className="mt-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={accept}
            className="easa-btn primary px-3 py-1.5 text-xs"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={decline}
            className="easa-btn secondary px-3 py-1.5 text-xs"
          >
            Decline
          </button>
        </div>
      </div>

      {/* Dismiss */}
      <button
        type="button"
        onClick={decline}
        title="Dismiss"
        aria-label="Dismiss cookie banner"
        className="easa-icon-btn shrink-0"
      >
        <X size={14} strokeWidth={1.75} />
      </button>
    </div>
  );
}
