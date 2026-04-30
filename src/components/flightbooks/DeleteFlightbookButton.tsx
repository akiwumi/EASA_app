"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useState } from "react";

type Props = {
  id: string;
  name: string;
  compact?: boolean;
};

export default function DeleteFlightbookButton({ id, name, compact = false }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${name}"? This will remove the flight book, its sections, and any related mappings.`,
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      const response = await fetch("/api/admin/flightbooks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Failed to delete flight book.");
      }

      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to delete flight book.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={
        compact
          ? "rounded-lg p-2 text-[var(--easa-color-text-muted)] transition hover:bg-[var(--easa-color-surface-2)] hover:text-[var(--easa-color-accent-pink)]"
          : "easa-btn secondary flex items-center gap-2 text-sm"
      }
      title="Delete flight book"
      onClick={handleDelete}
      disabled={busy}
    >
      <Trash2 size={15} strokeWidth={1.75} />
      {!compact && (busy ? "Deleting…" : "Delete")}
    </button>
  );
}
