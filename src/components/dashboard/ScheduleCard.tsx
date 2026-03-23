"use client";

import { useEffect, useState } from "react";

type ScheduleState = {
  cadence: "daily";
  runTimeUtc: string;
  runsPerDay: number;
  enabled: boolean;
};

const DEFAULT_STATE: ScheduleState = {
  cadence: "daily",
  runTimeUtc: "06:00",
  runsPerDay: 1,
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
          setSchedule({
            cadence: "daily",
            runTimeUtc: payload.schedule.runTimeUtc ?? DEFAULT_STATE.runTimeUtc,
            runsPerDay:
              payload.schedule.runsPerDay ?? DEFAULT_STATE.runsPerDay,
            enabled:
              payload.schedule.enabled ?? DEFAULT_STATE.enabled,
          });
        }
      } catch {
        // ignore load failures
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
      <h2 className="text-lg font-semibold">Automation schedule</h2>
      <p className="text-sm text-[var(--easa-color-text-muted)]">
        Daily pipeline window (UTC). Full multi-run configuration lives in
        Settings.
      </p>

      <div className="mt-4 space-y-4 text-sm">
        <div className="flex items-center justify-between">
          <span>Enabled</span>
          <button
            className={`easa-chip ${schedule.enabled ? "is-active" : ""}`}
            type="button"
            onClick={() =>
              setSchedule((prev) => ({ ...prev, enabled: !prev.enabled }))
            }
          >
            {schedule.enabled ? "On" : "Off"}
          </button>
        </div>

        <label className="block text-xs text-[var(--easa-color-text-muted)]">
          Primary run time (UTC)
          <input
            className="mt-2 w-full rounded-[12px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-3 py-2 text-sm text-[var(--easa-color-text-secondary)] outline-none"
            type="time"
            value={schedule.runTimeUtc}
            onChange={(event) =>
              setSchedule((prev) => ({
                ...prev,
                runTimeUtc: event.target.value,
              }))
            }
          />
        </label>

        <label className="block text-xs text-[var(--easa-color-text-muted)]">
          Runs per day (1–4)
          <input
            className="mt-2 w-full rounded-[12px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-3 py-2 text-sm text-[var(--easa-color-text-secondary)] outline-none"
            type="number"
            min={1}
            max={4}
            value={schedule.runsPerDay}
            onChange={(event) =>
              setSchedule((prev) => ({
                ...prev,
                runsPerDay: Math.min(
                  4,
                  Math.max(1, Number(event.target.value) || 1),
                ),
              }))
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
