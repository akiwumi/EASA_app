"use client";

import { useState } from "react";
import { RotateCcw, AlertTriangle, CheckCircle } from "lucide-react";

type State = "idle" | "confirming" | "rolling_back" | "done" | "error";

interface Props {
  sectionId: string;
  versionNumber: number;
  sectionLabel: string;
}

export default function RollbackButton({ sectionId, versionNumber, sectionLabel }: Props) {
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function doRollback() {
    setState("rolling_back");
    setErrorMsg(null);
    const res = await fetch("/api/rollback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sectionId,
        targetVersionNumber: versionNumber,
        reason: `Manual rollback to v${versionNumber} for "${sectionLabel}"`,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setErrorMsg(json.error ?? "Rollback failed");
      setState("error");
    } else {
      setState("done");
    }
  }

  if (state === "done") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-[var(--easa-color-accent-green)]">
        <CheckCircle size={14} strokeWidth={1.75} />
        Rolled back to v{versionNumber}
      </span>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs text-[var(--easa-color-accent-pink)]">
          {errorMsg ?? "Rollback failed"}
        </span>
        <button
          type="button"
          className="easa-btn secondary px-2 py-1 text-xs"
          onClick={() => setState("idle")}
        >
          Retry
        </button>
      </div>
    );
  }

  if (state === "confirming") {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-1.5 text-xs text-[var(--easa-color-text-secondary)]">
          <AlertTriangle size={13} strokeWidth={1.75} className="mt-0.5 shrink-0 text-[var(--easa-color-accent-orange)]" />
          <span>This will replace the current section body.</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="easa-btn primary px-3 py-1.5 text-xs"
            onClick={doRollback}
          >
            Confirm
          </button>
          <button
            type="button"
            className="easa-btn secondary px-3 py-1.5 text-xs"
            onClick={() => setState("idle")}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (state === "rolling_back") {
    return (
      <span className="text-xs text-[var(--easa-color-text-muted)]">
        Rolling back…
      </span>
    );
  }

  // idle
  return (
    <button
      type="button"
      className="easa-btn secondary flex items-center gap-1.5 px-2 py-1.5 text-xs"
      onClick={() => setState("confirming")}
    >
      <RotateCcw size={13} strokeWidth={1.75} />
      Rollback to this version
    </button>
  );
}
