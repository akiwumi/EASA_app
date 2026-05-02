"use client";

import { useState } from "react";
import Link from "next/link";
import type { TrainingProgrammeRow } from "@/services/training";

export default function ProgrammesClient({
  programmes,
  canManage,
}: {
  programmes: TrainingProgrammeRow[];
  canManage: boolean;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function createProgramme() {
    if (!name.trim()) return;
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/training/programmes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        code: code.trim() || null,
        description: description.trim() || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(`Error: ${json.error ?? "Failed to create programme"}`);
      setSaving(false);
      return;
    }
    window.location.assign(`/training/programmes/${json.programme.id}`);
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="easa-card p-5">
          <h2 className="text-sm font-semibold">Create programme</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px]">
            <input
              className="easa-input"
              placeholder="Programme name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="easa-input"
              placeholder="Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <textarea
            className="easa-input mt-3 min-h-28 w-full resize-y"
            placeholder="What this programme covers"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button className="easa-btn primary" disabled={saving || !name.trim()} onClick={createProgramme}>
              {saving ? "Creating…" : "Create programme"}
            </button>
            {message && <p className="text-sm text-[var(--easa-color-accent-pink)]">{message}</p>}
          </div>
        </div>
      )}

      {programmes.length === 0 ? (
        <div className="easa-card p-10 text-center">
          <p className="text-sm font-medium">No training programmes yet</p>
          <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
            Create your first programme, then add phases, lessons, reading, and sign-offs.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {programmes.map((programme) => (
            <Link
              key={programme.id}
              href={`/training/programmes/${programme.id}`}
              className="easa-card p-5 transition hover:shadow-[var(--easa-shadow-2)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--easa-color-text-muted)]">
                    {programme.code || "Programme"}
                  </p>
                  <h2 className="mt-2 text-lg font-semibold">{programme.name}</h2>
                </div>
                <span className={`easa-badge ${programme.active ? "is-green" : "is-muted"}`}>
                  {programme.active ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="mt-3 text-sm text-[var(--easa-color-text-muted)]">
                {programme.description || "No description yet."}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
