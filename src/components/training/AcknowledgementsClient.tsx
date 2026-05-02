"use client";

import { useState } from "react";
import type { AcknowledgementRow } from "@/services/training";

function unwrapAssignment(value: AcknowledgementRow["document_assignments"]) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default function AcknowledgementsClient({
  acknowledgements,
  currentUserId,
  role = "viewer",
}: {
  acknowledgements: AcknowledgementRow[];
  currentUserId: string | null;
  role?: string;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});

  async function acknowledge(row: AcknowledgementRow) {
    setBusyId(row.id);
    const res = await fetch("/api/training/acknowledgements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: row.id,
        acknowledgementNote: note[row.id] || null,
      }),
    });
    if (res.ok) {
      window.location.reload();
      return;
    }
    setBusyId(null);
  }

  return (
    <div className="space-y-4">
      {acknowledgements.length === 0 ? (
        <div className="easa-card p-6">
          <p className="text-sm text-[var(--easa-color-text-muted)]">
            {role === "student"
              ? "Nothing is waiting for your acknowledgement right now."
              : role === "instructor"
                ? "No student acknowledgements are pending right now."
                : "No acknowledgements are waiting right now."}
          </p>
        </div>
      ) : (
        acknowledgements.map((row) => {
          const assignment = unwrapAssignment(row.document_assignments);
          const isOwn = currentUserId != null && row.user_id === currentUserId;
          const isPending = row.status === "pending";
          return (
            <div key={row.id} className="easa-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">{assignment?.title || "Assignment acknowledgement"}</h2>
                  <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
                    Due {assignment?.due_at ? new Date(assignment.due_at).toLocaleString() : "when assigned"}
                  </p>
                </div>
                <span className={`easa-badge ${isPending ? "is-orange" : "is-green"}`}>{row.status}</span>
              </div>

              {isOwn && isPending && (
                <div className="mt-4 space-y-3">
                  <textarea
                    className="easa-input min-h-24 w-full resize-y"
                    placeholder="Optional note"
                    value={note[row.id] ?? ""}
                    onChange={(e) => setNote((current) => ({ ...current, [row.id]: e.target.value }))}
                  />
                  <button className="easa-btn primary" disabled={busyId === row.id} onClick={() => acknowledge(row)}>
                    {busyId === row.id ? "Saving…" : "Acknowledge reading"}
                  </button>
                </div>
              )}

              {row.acknowledgement_note && (
                <p className="mt-3 text-sm text-[var(--easa-color-text-secondary)]">{row.acknowledgement_note}</p>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
