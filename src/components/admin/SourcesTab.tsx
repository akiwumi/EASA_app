"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, ToggleLeft, ToggleRight, Rss } from "lucide-react";

interface Source {
  id: string;
  name: string;
  url: string;
  type: string;
  active: boolean;
  created_at: string;
  shared: boolean;
}

export default function SourcesTab() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [newType, setNewType] = useState("rss");
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
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function seedDefaults() {
    setSeeding(true);
    setSeedMsg(null);
    const res = await fetch("/api/admin/seed-sources", { method: "POST" });
    const json = await res.json();
    if (res.ok) {
      setSeedMsg(`Added ${json.inserted?.length ?? 0} new feed(s), removed dead URLs.`);
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
      body: JSON.stringify({ url: newUrl.trim(), type: newType }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to add source");
    } else {
      setNewUrl("");
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

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Add form */}
      <div className="easa-card p-5 space-y-4">
        <h2 className="text-sm font-semibold">Add EASA source</h2>
        <div className="flex gap-2">
          <input
            className="easa-input flex-1"
            placeholder="https://www.easa.europa.eu/en/rss/news"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <select
            className="easa-input w-28"
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
          >
            <option value="rss">RSS</option>
            <option value="html">HTML</option>
          </select>
          <button
            className="easa-btn primary flex items-center gap-1.5"
            disabled={adding || !newUrl.trim()}
            onClick={add}
          >
            <Plus size={14} strokeWidth={2} />
            Add
          </button>
        </div>
        {error && <p className="text-xs text-[var(--easa-color-accent-pink)]">{error}</p>}
      </div>

      {/* Default EASA feeds */}
      <div className="easa-card p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Default EASA feeds</p>
          <p className="text-xs text-[var(--easa-color-text-muted)]">
            Replaces any dead URLs with the current working EASA feed set.
          </p>
          {seedMsg && <p className="mt-1 text-xs text-[var(--easa-color-accent-green)]">{seedMsg}</p>}
        </div>
        <button
          className="easa-btn secondary shrink-0 flex items-center gap-1.5"
          disabled={seeding}
          onClick={seedDefaults}
        >
          <Rss size={13} strokeWidth={1.75} />
          {seeding ? "Updating…" : "Reset to EASA defaults"}
        </button>
      </div>

      {/* Sources list */}
      <div className="easa-card divide-y divide-[var(--easa-color-border)]">
        {loading ? (
          <p className="p-4 text-sm text-[var(--easa-color-text-muted)]">Loading…</p>
        ) : sources.length === 0 ? (
          <p className="p-4 text-sm text-[var(--easa-color-text-muted)]">No sources configured.</p>
        ) : (
          sources.map((s) => (
            <div key={s.id} className={`flex items-center gap-3 px-4 py-3 transition ${s.active ? "" : "opacity-50"}`}>
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${
                s.active
                  ? "bg-[var(--easa-color-accent-orange)]/15"
                  : "bg-[var(--easa-color-surface-2)]"
              }`}>
                <Rss
                  size={14}
                  strokeWidth={1.75}
                  className={s.active ? "text-[var(--easa-color-accent-orange)]" : "text-[var(--easa-color-text-muted)]"}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{s.name}</p>
                  {s.shared && (
                    <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-[var(--easa-color-accent-blue)]/15 text-[var(--easa-color-accent-blue)]">
                      Built-in
                    </span>
                  )}
                </div>
                <p className="text-xs uppercase text-[var(--easa-color-text-muted)]">
                  {s.type} · {s.active ? <span className="text-[var(--easa-color-accent-green)]">Active</span> : <span>Inactive</span>}
                </p>
              </div>
              {s.shared ? (
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                    s.active
                      ? "bg-[color-mix(in_srgb,var(--easa-color-accent-green)_14%,transparent)] text-[var(--easa-color-accent-green)]"
                      : "bg-[var(--easa-color-surface-2)] text-[var(--easa-color-text-muted)]"
                  }`}
                  title="Built-in feeds are always active and cannot be removed"
                >
                  {s.active ? "Active" : "Inactive"}
                </span>
              ) : (
                <>
                  <button
                    className="shrink-0 transition"
                    title={s.active ? "Disable feed" : "Enable feed"}
                    onClick={() => toggleActive(s.id, s.active)}
                  >
                    {s.active
                      ? <ToggleRight size={22} strokeWidth={1.75} className="text-[var(--easa-color-accent-green)]" />
                      : <ToggleLeft size={22} strokeWidth={1.75} className="text-[var(--easa-color-text-muted)]" />
                    }
                  </button>
                  <button
                    className="shrink-0 text-[var(--easa-color-text-muted)] hover:text-[var(--easa-color-accent-pink)] transition"
                    title="Remove feed"
                    onClick={() => remove(s.id)}
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>

      <div className="easa-card p-4 text-xs text-[var(--easa-color-text-muted)] space-y-1">
        <p><strong className="text-[var(--easa-color-text-secondary)]">Active EASA feeds</strong> are fetched when you run &quot;Check for updates&quot; from the dashboard.</p>
        <p>Flight schools do not need their own RSS feeds. Upload their flight books and the app will compare those manuals against the EASA sources listed here.</p>
        <p>Disabled sources are kept for reference but skipped during ingestion.</p>
      </div>
    </div>
  );
}
