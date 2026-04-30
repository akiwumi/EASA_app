"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AggregateButton() {
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const [created, setCreated] = useState<number | null>(null);
  const router = useRouter();

  async function run() {
    setState("running");
    const res = await fetch("/api/pipeline/aggregate-reg-changes", { method: "POST" });
    const json = await res.json();
    setCreated(json.created ?? 0);
    setState("done");
    router.refresh();
  }

  if (state === "done") {
    return (
      <span className="flex items-center gap-1.5 text-sm text-[var(--easa-color-accent-green)]">
        <CheckCircle size={14} strokeWidth={1.75} />
        {created === 0 ? "Up to date" : `${created} new change${created !== 1 ? "s" : ""} added`}
      </span>
    );
  }

  return (
    <button
      className="easa-btn secondary flex items-center gap-1.5"
      disabled={state === "running"}
      onClick={run}
    >
      <RefreshCw size={13} strokeWidth={1.75} className={state === "running" ? "animate-spin" : ""} />
      {state === "running" ? "Aggregating…" : "Re-aggregate"}
    </button>
  );
}
