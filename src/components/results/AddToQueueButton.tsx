"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, CheckCircle } from "lucide-react";

export default function AddToQueueButton({ findingId }: { findingId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "exists" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function add() {
    setState("loading");
    setErrorMsg(null);
    const res = await fetch("/api/findings/add-to-queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ findingId }),
    });
    const json = await res.json();
    if (res.ok) {
      setState(json.alreadyQueued ? "exists" : "done");
    } else {
      setErrorMsg((json?.error as string | null) ?? "Failed to add to queue");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-sm text-[var(--easa-color-accent-green)]">
          <CheckCircle size={15} strokeWidth={1.75} /> Added to queue
        </span>
        <Link href="/updates" className="easa-btn primary text-sm">View in queue</Link>
      </div>
    );
  }

  if (state === "exists") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-[var(--easa-color-text-muted)]">Already in queue</span>
        <Link href="/updates" className="easa-btn secondary text-sm">View in queue</Link>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-[var(--easa-color-accent-pink)]">{errorMsg}</span>
        <button className="easa-btn secondary text-sm" onClick={() => setState("idle")}>Retry</button>
      </div>
    );
  }

  return (
    <button
      className="easa-btn primary flex items-center gap-1.5"
      disabled={state === "loading"}
      onClick={add}
    >
      <Plus size={14} strokeWidth={2} />
      {state === "loading" ? "Adding…" : "Add to queue"}
    </button>
  );
}
