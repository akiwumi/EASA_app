"use client";

import { Download } from "lucide-react";

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
  function download(format: "md" | "txt") {
    const link = document.createElement("a");
    const exportQuery = exportId ? `&exportId=${exportId}` : "";
    link.href = `/api/flightbooks/${id}/download?format=${format}${exportQuery}`;
    link.click();
  }

  if (compact) {
    return (
      <button
        type="button"
        className="rounded-lg p-2 text-[var(--easa-color-text-muted)] transition hover:bg-[var(--easa-color-surface-2)] hover:text-[var(--easa-color-brand-primary)]"
        title="Download flight book"
        onClick={() => download("md")}
      >
        <Download size={15} strokeWidth={1.75} />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="easa-btn secondary flex items-center gap-2 text-sm"
        onClick={() => download("md")}
      >
        <Download size={15} strokeWidth={1.75} />
        {label ?? "Download Markdown"}
      </button>
      <button
        type="button"
        className="easa-btn secondary text-sm"
        onClick={() => download("txt")}
      >
        TXT
      </button>
    </div>
  );
}
