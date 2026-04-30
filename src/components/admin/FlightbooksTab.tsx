"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

interface Flightbook {
  id: string;
  name: string;
  doc_type: string;
  version_label: string | null;
  active: boolean;
  created_at: string;
}

const DOC_TYPES = ["OM-A", "OM-B", "OM-C", "OM-D", "MEL", "MMEL", "MCC", "AOM", "FCL", "Other"];

export default function FlightbooksTab() {
  const [books, setBooks] = useState<Flightbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [docType, setDocType] = useState("OM-A");
  const [versionLabel, setVersionLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/flightbooks");
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to load flight books");
      setLoading(false);
      return;
    }
    setBooks(json.flightbooks ?? []);
    if (json.missingSchema) {
      setError("Flight book tables are not set up yet. Run the flightbooks migration first.");
    }
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function addBook() {
    if (!name.trim()) return;
    setAdding(true);
    setAddMsg(null);
    const res = await fetch("/api/admin/flightbooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), docType, versionLabel: versionLabel.trim() || undefined }),
    });
    const json = await res.json();
    if (!res.ok) { setAddMsg(`Error: ${json.error}`); }
    else { setName(""); setVersionLabel(""); setAddMsg(null); load(); }
    setAdding(false);
  }

  async function toggleActive(book: Flightbook) {
    await fetch("/api/admin/flightbooks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: book.id, active: !book.active }),
    });
    load();
  }

  async function deleteBook(book: Flightbook) {
    if (!confirm(`Delete "${book.name}"? This will also remove all its sections and mappings.`)) return;
    await fetch("/api/admin/flightbooks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: book.id }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      {/* Add form */}
      <div className="easa-card p-5">
        <h2 className="mb-4 text-sm font-semibold">Add flight book</h2>
        <div className="flex flex-wrap gap-3">
          <input
            className="easa-input flex-1 min-w-[180px]"
            placeholder="Document name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addBook()}
          />
          <select
            className="easa-input w-32"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
          >
            {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            className="easa-input w-36"
            placeholder="Version (optional)"
            value={versionLabel}
            onChange={(e) => setVersionLabel(e.target.value)}
          />
          <button
            className="easa-btn primary flex items-center gap-2"
            disabled={adding || !name.trim()}
            onClick={addBook}
          >
            <Plus size={16} strokeWidth={1.75} />
            {adding ? "Adding…" : "Add book"}
          </button>
        </div>
        {addMsg && (
          <p className="mt-3 text-sm text-[var(--easa-color-accent-pink)]">{addMsg}</p>
        )}
      </div>

      {/* Books table */}
      <div className="easa-card overflow-hidden p-0">
        {loading ? (
          <p className="p-5 text-sm text-[var(--easa-color-text-muted)]">Loading…</p>
        ) : error ? (
          <p className="p-5 text-sm text-[var(--easa-color-accent-pink)]">{error}</p>
        ) : books.length === 0 ? (
          <p className="p-5 text-sm text-[var(--easa-color-text-muted)]">No flight books yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)]">
                <th className="px-4 py-3 text-left font-medium text-[var(--easa-color-text-muted)]">Name</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--easa-color-text-muted)]">Type</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--easa-color-text-muted)]">Version</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--easa-color-text-muted)]">Added</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--easa-color-text-muted)]">Active</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {books.map((b) => (
                <tr key={b.id} className="border-b border-[var(--easa-color-border)] last:border-0">
                  <td className="px-4 py-3 font-medium">{b.name}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[var(--easa-color-surface-2)] px-2 py-0.5 text-xs font-medium">
                      {b.doc_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--easa-color-text-muted)]">
                    {b.version_label ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--easa-color-text-muted)]">
                    {new Date(b.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition ${
                        b.active
                          ? "bg-[var(--easa-color-accent-green)]/15 text-[var(--easa-color-accent-green)]"
                          : "bg-[var(--easa-color-surface-3)] text-[var(--easa-color-text-muted)]"
                      }`}
                      onClick={() => toggleActive(b)}
                      title="Toggle active"
                    >
                      {b.active
                        ? <ToggleRight size={13} strokeWidth={1.75} />
                        : <ToggleLeft size={13} strokeWidth={1.75} />}
                      {b.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="rounded-lg p-2 text-[var(--easa-color-text-muted)] transition hover:bg-[var(--easa-color-surface-2)] hover:text-[var(--easa-color-accent-pink)]"
                      title="Delete"
                      onClick={() => deleteBook(b)}
                    >
                      <Trash2 size={15} strokeWidth={1.75} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
