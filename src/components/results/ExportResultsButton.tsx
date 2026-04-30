"use client";

import { Download } from "lucide-react";

type ResultItem = {
  id: string;
  title: string;
  summary: string;
  publishedAt: string;
  category: string;
  impact: "High" | "Medium" | "Low";
  confidence: string;
  mappedSection: string;
  status: "New" | "Analyzed" | "Ready";
};

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export default function ExportResultsButton({ items }: { items: ResultItem[] }) {
  function exportCsv() {
    const headers = [
      "ID",
      "Title",
      "Summary",
      "Published At",
      "Category",
      "Impact",
      "Confidence",
      "Mapped Section",
      "Status",
    ];

    const rows = items.map((item) => [
      item.id,
      item.title,
      item.summary,
      item.publishedAt,
      item.category,
      item.impact,
      item.confidence,
      item.mappedSection,
      item.status,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => csvCell(String(cell ?? ""))).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ai-results-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button className="easa-btn primary flex items-center gap-2" type="button" onClick={exportCsv}>
      <Download size={15} strokeWidth={1.75} />
      Export results
    </button>
  );
}
