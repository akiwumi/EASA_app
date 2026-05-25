"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

type Props = {
  id: string;
  name?: string;
  compact?: boolean;
  exportId?: string;
  label?: string;
};

export default function DownloadFlightbookButton({
  id,
  compact = false,
  exportId,
  label,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function download(format: "md" | "txt" | "doc" | "pdf") {
    if (loading) return;
    setLoading(true);
    try {
      const exportQuery = exportId ? `&exportId=${exportId}` : "";
      const res = await fetch(`/api/flightbooks/${id}/download?format=${format}${exportQuery}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Download failed" })) as { error?: string };
        alert(err.error ?? "Download failed");
        return;
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `flightbook.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
    } finally {
      setLoading(false);
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        className="rounded-lg p-2 text-[var(--easa-color-text-muted)] transition hover:bg-[var(--easa-color-surface-2)] hover:text-[var(--easa-color-brand-primary)] disabled:opacity-50"
        title="Download flight book"
        disabled={loading}
        onClick={() => download("doc")}
      >
        {loading
          ? <Loader2 size={15} strokeWidth={1.75} className="animate-spin" />
          : <Download size={15} strokeWidth={1.75} />}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="easa-btn secondary flex items-center gap-2 text-sm disabled:opacity-50"
        disabled={loading}
        onClick={() => download("doc")}
      >
        {loading
          ? <Loader2 size={15} strokeWidth={1.75} className="animate-spin" />
          : <Download size={15} strokeWidth={1.75} />}
        {label ?? "Download Word"}
      </button>
      <button
        type="button"
        className="easa-btn secondary text-sm disabled:opacity-50"
        disabled={loading}
        onClick={() => download("pdf")}
      >
        PDF
      </button>
      <button
        type="button"
        className="easa-btn secondary text-sm disabled:opacity-50"
        disabled={loading}
        onClick={() => download("md")}
      >
        MD
      </button>
    </div>
  );
}
