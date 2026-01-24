"use client";

import { useEffect, useState } from "react";

type ScheduleState = {
  cadence: "daily";
  runTimeUtc: string;
  enabled: boolean;
};

const DEFAULT_STATE: ScheduleState = {
  cadence: "daily",
  runTimeUtc: "06:00",
  enabled: true,
};

export default function ScheduleCard() {
  const [schedule, setSchedule] = useState<ScheduleState>(DEFAULT_STATE);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/schedule");
        const payload = await response.json();
        if (response.ok && payload?.schedule) {
          setSchedule(payload.schedule);
        }
      } catch {
        // ignore load failures for now
      }
    };

    load();
  }, []);

  const saveSchedule = async () => {
    setStatus("saving");
    setMessage(null);

    try {
      const response = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schedule),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Unable to save schedule.");
      }

      setStatus("saved");
      setMessage("Schedule saved.");
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unable to save.";
      setStatus("error");
      setMessage(text);
    }
  };

  return (
    <div className="easa-card p-6">
      <h2 className="text-lg font-semibold">Automation Schedule</h2>
      <p className="text-sm text-[var(--easa-color-text-muted)]">
        Configure the daily AI scrape to run automatically.
      </p>

      <div className="mt-4 space-y-4 text-sm">
        <div className="flex items-center justify-between">
          <span>Daily schedule</span>
          <button
            className={`easa-chip ${schedule.enabled ? "is-active" : ""}`}
            type="button"
            onClick={() =>
              setSchedule((prev) => ({ ...prev, enabled: !prev.enabled }))
            }
          >
            {schedule.enabled ? "Enabled" : "Disabled"}
          </button>
        </div>

        <label className="block text-xs text-[var(--easa-color-text-muted)]">
          Run time (UTC)
          <input
            className="mt-2 w-full rounded-[12px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-3 py-2 text-sm text-[var(--easa-color-text-secondary)] outline-none"
            type="time"
            value={schedule.runTimeUtc}
            onChange={(event) =>
              setSchedule((prev) => ({ ...prev, runTimeUtc: event.target.value }))
            }
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          className="easa-btn primary"
          type="button"
          onClick={saveSchedule}
          disabled={status === "saving"}
        >
          {status === "saving" ? "Saving..." : "Save schedule"}
        </button>
        {message ? (
          <p className="text-xs text-[var(--easa-color-text-muted)]">{message}</p>
        ) : null}
      </div>
    </div>
  );
}
