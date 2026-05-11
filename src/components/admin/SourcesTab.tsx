"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, ToggleLeft, ToggleRight, Rss, Globe, Filter } from "lucide-react";
import { CATEGORY_META, type SourceCategory } from "@/lib/seed-default-sources";

interface Source {
  id: string;
  url: string;
  type: string;
  category: SourceCategory | null;
  label: string | null;
  active: boolean;
  created_at: string;
  shared: boolean;
}

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All categories" },
  { value: "easy_access_rules", label: "Easy Access Rules" },
  { value: "amcgm", label: "AMC/GM" },
  { value: "regulation", label: "Regulations" },
  { value: "agency_decisions", label: "Agency Decisions" },
  { value: "airworthiness_directives", label: "Airworthiness Directives" },
  { value: "sib", label: "Safety Information Bulletins" },
  { value: "safety_publications", label: "Safety Publications" },
  { value: "npa", label: "NPA / Consultations" },
  { value: "news", label: "News & Press" },
];

const NEW_CATEGORY_OPTIONS: { value: SourceCategory; label: string }[] = [
  { value: "easy_access_rules", label: "Easy Access Rules" },
  { value: "amcgm", label: "AMC/GM" },
  { value: "regulation", label: "Regulation" },
  { value: "agency_decisions", label: "Agency Decision" },
  { value: "airworthiness_directives", label: "Airworthiness Directive" },
  { value: "sib", label: "Safety Information Bulletin" },
  { value: "safety_publications", label: "Safety Publication" },
  { value: "npa", label: "NPA / Consultation" },
  { value: "news", label: "News" },
];

function categoryBadge(category: SourceCategory | null) {
  if (!category) return "easa-badge is-muted";
  const meta = CATEGORY_META[category];
  return `easa-badge ${meta?.colour ?? "is-muted"}`;
}

function categoryLabel(category: SourceCategory | null, label: string | null) {
  if (label) return label;
  if (!category) return "Uncategorised";
  return CATEGORY_META[category]?.label ?? category;
}

export default function SourcesTab() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newType, setNewType] = useState<"rss" | "html">("rss");
  const [newCategory, setNewCategory] = useState<SourceCategory>("easy_access_rules");
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/sources");
    const json = await res.json();
    setSources(json.sources ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function seedDefaults() {
    setSeeding(true);
    setSeedMsg(null);
    const res = await fetch("/api/admin/seed-sources", { method: "POST" });
    const json = await res.json();
    if (res.ok) {
      setSeedMsg(`Added ${json.inserted?.length ?? 0} new source(s), removed dead URLs.`);
      await load();
    } else {
      setSeedMsg("Failed to seed defaults.");
    }
    setSeeding(false);
  }

  async function add() {
    if (!newUrl.trim()) return;
    setAdding(true);
    setError(null);
    const res = await fetch("/api/admin/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: newUrl.trim(),
        type: newType,
        category: newCategory,
        label: newLabel.trim() || undefined,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to add source");
    } else {
      setNewUrl("");
      setNewLabel("");
      await load();
    }
    setAdding(false);
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch("/api/admin/sources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active: !active }),
    });
    setSources((prev) => prev.map((s) => s.id === id ? { ...s, active: !active } : s));
  }

  async function remove(id: string) {
    await fetch("/api/admin/sources", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setSources((prev) => prev.filter((s) => s.id !== id));
  }

  const displayed = filterCategory
    ? sources.filter((s) => s.category === filterCategory)
    : sources;

  // Group by category for display
  const grouped = new Map<string, Source[]>();
  for (const s of displayed) {
    const key = s.category ?? "uncategorised";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(s);
  }

  const categoryOrder: (SourceCategory | "uncategorised")[] = [
    "easy_access_rules", "amcgm", "regulation", "agency_decisions",
    "airworthiness_directives", "sib", "safety_publications",
    "npa", "news", "press", "uncategorised",
  ];
  const sortedGroups = categoryOrder.filter((k) => grouped.has(k));

  const activeCount = sources.filter((s) => s.active).length;
  const adCount = sources.filter((s) => s.category === "airworthiness_directives" && s.active).length;
  const sibCount = sources.filter((s) => s.category === "sib" && s.active).length;

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="easa-card p-4">
          <p className="text-xs text-[var(--easa-color-text-muted)]">Active sources</p>
          <p className="mt-1 text-2xl font-semibold">{activeCount}</p>
        </div>
        <div className="easa-card p-4">
          <p className="text-xs text-[var(--easa-color-text-muted)]">AD feeds</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--easa-color-accent-red)]">{adCount}</p>
        </div>
        <div className="easa-card p-4">
          <p className="text-xs text-[var(--easa-color-text-muted)]">SIB feeds</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--easa-color-accent-yellow)]">{sibCount}</p>
        </div>
      </div>

      {/* Add form */}
      <div className="easa-card p-5 space-y-4">
        <h2 className="text-sm font-semibold">Add EASA source</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-[var(--easa-color-text-secondary)]">URL</label>
            <input
              className="easa-input w-full"
              placeholder="https://www.easa.europa.eu/en/..."
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--easa-color-text-secondary)]">Category</label>
            <select
              className="easa-input w-full"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as SourceCategory)}
            >
              {NEW_CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--easa-color-text-secondary)]">Type</label>
            <select
              className="easa-input w-full"
              value={newType}
              onChange={(e) => setNewType(e.target.value as "rss" | "html")}
            >
              <option value="rss">RSS feed</option>
              <option value="html">HTML page</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-[var(--easa-color-text-secondary)]">Label (optional)</label>
            <div className="flex gap-2">
              <input
                className="easa-input flex-1"
                placeholder="e.g. EAR — Part-FCL (EU 1178/2011)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && add()}
              />
              <button
                className="easa-btn primary flex items-center gap-1.5 shrink-0"
                disabled={adding || !newUrl.trim()}
                onClick={add}
              >
                <Plus size={14} strokeWidth={2} />
                Add
              </button>
            </div>
          </div>
        </div>
        {error && <p className="text-xs text-[var(--easa-color-accent-red)]">{error}</p>}
      </div>

      {/* Seed defaults + filter row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="easa-card flex-1 p-4 flex items-center justify-between gap-4 min-w-0">
          <div className="min-w-0">
            <p className="text-sm font-medium">Reset to EASA defaults</p>
            <p className="text-xs text-[var(--easa-color-text-muted)] truncate">
              Seeds all 13 EASA sources across EAR, AMC/GM, Agency Decisions, ADs, SIBs, and more.
            </p>
            {seedMsg && <p className="mt-1 text-xs text-[var(--easa-color-accent-green)]">{seedMsg}</p>}
          </div>
          <button
            className="easa-btn secondary shrink-0 flex items-center gap-1.5"
            disabled={seeding}
            onClick={seedDefaults}
          >
            <Rss size={13} strokeWidth={1.75} />
            {seeding ? "Updating…" : "Seed defaults"}
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter size={14} strokeWidth={1.75} className="text-[var(--easa-color-text-muted)]" />
        {CATEGORY_OPTIONS.map((o) => (
          <button
            key={o.value}
            className={`easa-badge cursor-pointer transition ${filterCategory === o.value ? "is-blue" : "is-muted"}`}
            onClick={() => setFilterCategory(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Sources grouped by category */}
      {loading ? (
        <p className="text-sm text-[var(--easa-color-text-muted)]">Loading…</p>
      ) : displayed.length === 0 ? (
        <div className="easa-card p-6 text-center">
          <p className="text-sm text-[var(--easa-color-text-muted)]">
            {filterCategory ? "No sources in this category." : 'No sources configured. Click "Seed defaults" to add all EASA sources.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedGroups.map((catKey) => {
            const items = grouped.get(catKey)!;
            const meta = catKey !== "uncategorised" ? CATEGORY_META[catKey as SourceCategory] : null;
            return (
              <div key={catKey} className="easa-card overflow-hidden">
                {/* Group header */}
                <div className="flex items-center gap-3 border-b border-[var(--easa-color-border)] px-4 py-3 bg-[var(--easa-color-surface-2)]">
                  <span className={`easa-badge ${meta?.colour ?? "is-muted"}`}>
                    {meta?.label ?? "Uncategorised"}
                  </span>
                  <p className="text-xs text-[var(--easa-color-text-muted)] flex-1 truncate">
                    {meta?.description ?? ""}
                  </p>
                  <span className="text-xs text-[var(--easa-color-text-muted)] shrink-0">
                    {items.length} source{items.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Source rows */}
                <div className="divide-y divide-[var(--easa-color-border)]">
                  {items.map((s) => (
                    <div
                      key={s.id}
                      className={`flex items-center gap-3 px-4 py-3 transition ${s.active ? "" : "opacity-50"}`}
                    >
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        s.active
                          ? "bg-[var(--easa-color-accent-orange)]/15"
                          : "bg-[var(--easa-color-surface-2)]"
                      }`}>
                        {s.type === "html"
                          ? <Globe size={13} strokeWidth={1.75} className={s.active ? "text-[var(--easa-color-accent-orange)]" : "text-[var(--easa-color-text-muted)]"} />
                          : <Rss size={13} strokeWidth={1.75} className={s.active ? "text-[var(--easa-color-accent-orange)]" : "text-[var(--easa-color-text-muted)]"} />
                        }
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="truncate text-sm font-medium">
                            {categoryLabel(s.category, s.label)}
                          </p>
                          {s.shared && (
                            <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-[var(--easa-color-accent-blue)]/15 text-[var(--easa-color-accent-blue)]">
                              Built-in
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--easa-color-text-muted)] truncate">
                          {s.url}
                        </p>
                        <p className="text-xs text-[var(--easa-color-text-muted)] uppercase mt-0.5">
                          {s.type} · {s.active
                            ? <span className="text-[var(--easa-color-accent-green)]">active</span>
                            : <span>inactive</span>}
                        </p>
                      </div>

                      {s.shared ? (
                        <span className="shrink-0 text-xs text-[var(--easa-color-text-muted)]" title="Built-in">
                          Always on
                        </span>
                      ) : (
                        <>
                          <button
                            className="shrink-0 transition"
                            title={s.active ? "Disable" : "Enable"}
                            onClick={() => toggleActive(s.id, s.active)}
                          >
                            {s.active
                              ? <ToggleRight size={22} strokeWidth={1.75} className="text-[var(--easa-color-accent-green)]" />
                              : <ToggleLeft size={22} strokeWidth={1.75} className="text-[var(--easa-color-text-muted)]" />
                            }
                          </button>
                          <button
                            className="shrink-0 text-[var(--easa-color-text-muted)] hover:text-[var(--easa-color-accent-red)] transition"
                            title="Remove"
                            onClick={() => remove(s.id)}
                          >
                            <Trash2 size={14} strokeWidth={1.75} />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="easa-card p-4 text-xs text-[var(--easa-color-text-muted)] space-y-1">
        <p><strong className="text-[var(--easa-color-text-secondary)]">Easy Access Rules & AMC/GM</strong> — RSS alerts you to new editions; HTML sources scrape the live consolidated text for diffing against your flight books.</p>
        <p><strong className="text-[var(--easa-color-text-secondary)]">Agency Decisions</strong> — formal EASA decisions that adopt AMC/GM amendments; these create the legal obligation for ATOs.</p>
        <p><strong className="text-[var(--easa-color-text-accent-red)]">Airworthiness Directives</strong> — mandatory compliance with specific dates. ADs appear in the Advisories tracker with applicability and compliance dates.</p>
        <p><strong className="text-[var(--easa-color-text-secondary)]">SIBs</strong> — safety recommendations, no mandatory compliance date. Tracked separately in the Advisories section.</p>
      </div>
    </div>
  );
}
