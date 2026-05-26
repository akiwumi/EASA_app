"use client";

import { useState } from "react";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";

type Step = "idle" | "confirm" | "clearing" | "done" | "error";

export default function ClearDataButton({ compact = false }: { compact?: boolean }) {
  const [step, setStep] = useState<Step>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleClear() {
    setStep("clearing");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/clear-data", { method: "DELETE" });
      const json = await res.json().catch(() => ({})) as { ok?: boolean; errors?: string[] };
      if (!res.ok || !json.ok) {
        setErrorMsg(json.errors?.join(", ") ?? "Failed to clear data.");
        setStep("error");
        return;
      }
      setStep("done");
      setTimeout(() => setStep("idle"), 3000);
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStep("error");
    }
  }

  if (step === "confirm") {
    return (
      <div className="rounded-xl border border-[var(--easa-color-accent-pink)]/30 bg-[color-mix(in_srgb,var(--easa-color-accent-pink)_6%,transparent)] p-3 space-y-2">
        <div className="flex items-start gap-2">
          <AlertTriangle size={14} strokeWidth={1.85} className="mt-0.5 shrink-0 text-[var(--easa-color-accent-pink)]" />
          <p className="text-xs leading-relaxed text-[var(--easa-color-text-secondary)]">
            This will delete all AI findings, regulatory changes, RSS items, and proposed updates for your organisation. Settings and flight books are not affected.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-lg border border-[var(--easa-color-border)] bg-white px-2 py-1.5 text-xs font-medium text-[var(--easa-color-text-secondary)] transition hover:bg-[var(--easa-color-surface-2)]"
            onClick={() => setStep("idle")}
          >
            Cancel
          </button>
          <button
            type="button"
            className="flex-1 rounded-lg bg-[var(--easa-color-accent-pink)] px-2 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
            onClick={handleClear}
          >
            Yes, clear all
          </button>
        </div>
      </div>
    );
  }

  if (step === "clearing") {
    return (
      <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--easa-color-text-muted)]">
        <Loader2 size={17} strokeWidth={1.85} className="shrink-0 animate-spin" />
        Clearing…
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="rounded-xl px-3 py-2.5 text-sm text-[var(--easa-color-accent-green)]">
        ✓ Data cleared
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="space-y-1.5">
        <p className="px-3 text-xs text-[var(--easa-color-accent-pink)]">{errorMsg}</p>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--easa-color-accent-pink)] transition hover:bg-[var(--easa-color-surface-2)]"
          onClick={() => setStep("idle")}
        >
          <Trash2 size={17} strokeWidth={1.85} className="shrink-0" />
          {!compact && "Clear all data"}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      title="Clear all AI-ingested data"
      className={
        compact
          ? "flex h-8 w-8 items-center justify-center rounded-full text-[var(--easa-color-text-secondary)] hover:bg-[var(--easa-color-border)] hover:text-[var(--easa-color-accent-pink)]"
          : "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--easa-color-text-secondary)] transition hover:bg-[var(--easa-color-surface-2)] hover:text-[var(--easa-color-accent-pink)]"
      }
      onClick={() => setStep("confirm")}
    >
      <Trash2 size={compact ? 16 : 17} strokeWidth={1.85} className="shrink-0" />
      {!compact && "Clear all data"}
    </button>
  );
}
