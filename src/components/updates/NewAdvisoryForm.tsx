"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewAdvisoryForm({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const body = {
      organization_id: orgId,
      doc_type: fd.get("doc_type") as string,
      reference_number: (fd.get("reference_number") as string) || null,
      title: fd.get("title") as string,
      applicability: (fd.get("applicability") as string) || null,
      compliance_date: (fd.get("compliance_date") as string) || null,
      compliance_category: fd.get("compliance_category") as string,
      effective_date: (fd.get("effective_date") as string) || null,
      url: (fd.get("url") as string) || null,
      summary: (fd.get("summary") as string) || null,
      status: "open",
    };

    const res = await fetch("/api/advisories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      router.push("/updates/advisories");
      router.refresh();
    } else {
      const data = await res.json() as { error?: string };
      setError(data.error ?? "Failed to save advisory");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="easa-card space-y-5 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Type */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">Type</label>
          <select name="doc_type" required className="w-full rounded-xl border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] px-3 py-2 text-sm">
            <option value="ad">Airworthiness Directive (AD)</option>
            <option value="sib">Safety Information Bulletin (SIB)</option>
          </select>
        </div>

        {/* Reference number */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">Reference number</label>
          <input
            name="reference_number"
            type="text"
            placeholder="e.g. EASA AD 2024-0123"
            className="w-full rounded-xl border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] px-3 py-2 text-sm"
          />
        </div>

        {/* Title */}
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium">Title <span className="text-[var(--easa-color-accent-red)]">*</span></label>
          <input
            name="title"
            type="text"
            required
            placeholder="Short descriptive title"
            className="w-full rounded-xl border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] px-3 py-2 text-sm"
          />
        </div>

        {/* Applicability */}
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium">Applicability</label>
          <input
            name="applicability"
            type="text"
            placeholder="e.g. All PA-28 series aircraft"
            className="w-full rounded-xl border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] px-3 py-2 text-sm"
          />
        </div>

        {/* Compliance category */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">Compliance category</label>
          <select name="compliance_category" className="w-full rounded-xl border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] px-3 py-2 text-sm">
            <option value="mandatory">Mandatory</option>
            <option value="recommended">Recommended</option>
            <option value="informational">Informational</option>
          </select>
        </div>

        {/* Compliance date */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">Compliance deadline</label>
          <input
            name="compliance_date"
            type="date"
            className="w-full rounded-xl border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] px-3 py-2 text-sm"
          />
        </div>

        {/* Effective date */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">Effective date</label>
          <input
            name="effective_date"
            type="date"
            className="w-full rounded-xl border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] px-3 py-2 text-sm"
          />
        </div>

        {/* URL */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">EASA link</label>
          <input
            name="url"
            type="url"
            placeholder="https://ad.easa.europa.eu/…"
            className="w-full rounded-xl border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] px-3 py-2 text-sm"
          />
        </div>

        {/* Summary */}
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium">Summary</label>
          <textarea
            name="summary"
            rows={3}
            placeholder="Brief description of the advisory and required action…"
            className="w-full rounded-xl border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] px-3 py-2 text-sm resize-none"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-[var(--easa-color-accent-red)]">{error}</p>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="easa-btn primary">
          {saving ? "Saving…" : "Save advisory"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="easa-btn secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
