"use client";

import { useState } from "react";
import { Save } from "lucide-react";

export default function SaveFlightbookVersionButton({ id }: { id: string }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function saveVersion() {
    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/flightbooks/${id}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? "Unable to save version");
      setSaving(false);
      return;
    }
    const label = json.export?.revisionLabel as string | undefined;
    setMessage(label ? `Saved ${label}` : "Saved version");
    setSaving(false);
    window.setTimeout(() => window.location.reload(), 700);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        className="easa-btn primary flex items-center gap-2 text-sm"
        disabled={saving}
        onClick={saveVersion}
      >
        <Save size={15} strokeWidth={1.75} />
        {saving ? "Saving..." : "Save version"}
      </button>
      {message && (
        <p className="max-w-56 text-right text-xs text-[var(--easa-color-text-muted)]">
          {message}
        </p>
      )}
    </div>
  );
}
