"use client";

import { useEffect, useMemo, useState } from "react";

type ScopePart = {
  id: string;
  label: string;
  defaultIncluded: boolean;
};

const SCOPE_PARTS: ScopePart[] = [
  { id: "Part-FCL", label: "Part-FCL (Pilot licensing)", defaultIncluded: true },
  { id: "Part-MED", label: "Part-MED (Medical certificates)", defaultIncluded: true },
  { id: "Part-ORA", label: "Part-ORA (Approved Training Organisations)", defaultIncluded: true },
  { id: "Part-DTO", label: "Part-DTO (Declared Training Organisations)", defaultIncluded: false },
  { id: "Part-ARA", label: "Part-ARA (Authority requirements for aircrew)", defaultIncluded: false },
  { id: "Part-ORO", label: "Part-ORO (Organisation requirements — operations)", defaultIncluded: false },
  { id: "Part-CAT", label: "Part-CAT (Commercial air transport)", defaultIncluded: false },
  { id: "Part-NCC", label: "Part-NCC (Non-commercial complex aircraft)", defaultIncluded: false },
  { id: "Part-NCO", label: "Part-NCO (Non-commercial other aircraft)", defaultIncluded: false },
  { id: "CS-FSTD(A)", label: "CS-FSTD(A) (Simulator certification)", defaultIncluded: false },
  { id: "CS-FTL.1", label: "CS-FTL.1 (Flight time limitations)", defaultIncluded: false },
];

function defaultIncludedSet() {
  return new Set(SCOPE_PARTS.filter((part) => part.defaultIncluded).map((part) => part.id.toLowerCase()));
}

export default function RegulatoryScopeSettings() {
  const defaults = useMemo(defaultIncludedSet, []);
  const [included, setIncluded] = useState<Set<string>>(new Set(defaults));
  const [initialIncluded, setInitialIncluded] = useState<Set<string>>(new Set(defaults));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/org-filters");
        const payload = (await response.json()) as {
          items?: Array<{ id: string; filter_type?: string | null; filter_value?: string | null }>;
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error ?? "Failed to load regulatory scope.");

        const excluded = new Set(
          (payload.items ?? [])
            .filter((item) => String(item.filter_type ?? "").toLowerCase() === "reg_part")
            .map((item) => String(item.filter_value ?? "").toLowerCase())
            .filter(Boolean),
        );
        const nextIncluded = new Set<string>();
        for (const part of SCOPE_PARTS) {
          const key = part.id.toLowerCase();
          if (!excluded.has(key)) nextIncluded.add(key);
        }
        setIncluded(nextIncluded);
        setInitialIncluded(new Set(nextIncluded));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load regulatory scope.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const dirty = useMemo(() => {
    if (included.size !== initialIncluded.size) return true;
    for (const value of included) {
      if (!initialIncluded.has(value)) return true;
    }
    return false;
  }, [included, initialIncluded]);

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const currentResponse = await fetch("/api/org-filters");
      const currentPayload = (await currentResponse.json()) as {
        items?: Array<{ id: string; filter_type?: string | null; filter_value?: string | null }>;
        error?: string;
      };
      if (!currentResponse.ok) throw new Error(currentPayload.error ?? "Failed to read scope filters.");

      const existingRegPartFilters = (currentPayload.items ?? []).filter(
        (item) => String(item.filter_type ?? "").toLowerCase() === "reg_part",
      );

      const includedNow = new Set(included);
      const excludedTargets = SCOPE_PARTS
        .map((part) => part.id.toLowerCase())
        .filter((part) => !includedNow.has(part));

      const existingByValue = new Map(
        existingRegPartFilters.map((item) => [String(item.filter_value ?? "").toLowerCase(), item]),
      );

      for (const existing of existingRegPartFilters) {
        const value = String(existing.filter_value ?? "").toLowerCase();
        if (!excludedTargets.includes(value)) {
          await fetch("/api/org-filters", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: existing.id }),
          });
        }
      }

      for (const value of excludedTargets) {
        if (!existingByValue.has(value)) {
          await fetch("/api/org-filters", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filter_type: "reg_part", filter_value: value }),
          });
        }
      }

      setInitialIncluded(new Set(includedNow));
      setMessage("Regulatory scope saved. Future scans will respect these exclusions.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save regulatory scope.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="easa-card p-6">
      <h2 className="text-base font-semibold">Regulatory scope</h2>
      <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
        Uncheck regulation parts that do not apply to your school. Future scans will ignore changes in those areas.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-[var(--easa-color-text-muted)]">Loading scope settings…</p>
      ) : (
        <div className="mt-4 grid gap-2">
          {SCOPE_PARTS.map((part) => {
            const checked = included.has(part.id.toLowerCase());
            return (
              <label
                key={part.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    setIncluded((prev) => {
                      const next = new Set(prev);
                      const key = part.id.toLowerCase();
                      if (event.target.checked) next.add(key);
                      else next.delete(key);
                      return next;
                    });
                  }}
                />
                <span>{part.label}</span>
              </label>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          className="easa-btn primary"
          disabled={loading || saving || !dirty}
          onClick={() => {
            void save();
          }}
        >
          {saving ? "Saving…" : "Save scope"}
        </button>
        {message ? <span className="text-sm text-[var(--easa-color-accent-green)]">{message}</span> : null}
        {error ? <span className="text-sm text-[var(--easa-color-accent-pink)]">{error}</span> : null}
      </div>
    </section>
  );
}
