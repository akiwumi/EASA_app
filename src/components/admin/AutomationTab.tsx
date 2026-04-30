"use client";

import { useEffect, useMemo, useState } from "react";

type AutomationSettings = {
  cadence: "daily";
  runTimeUtc: string;
  runsPerDay: number;
  enabled: boolean;
  autoApproveLow: boolean;
  autoApproveDelayHours: number;
  notifyOnDetect: boolean;
  defaultExportFmt: "pdf" | "docx";
};

const DEFAULT_SETTINGS: AutomationSettings = {
  cadence: "daily",
  runTimeUtc: "06:00",
  runsPerDay: 1,
  enabled: true,
  autoApproveLow: false,
  autoApproveDelayHours: 24,
  notifyOnDetect: true,
  defaultExportFmt: "pdf",
};

function buildRunPreview(runTimeUtc: string, runsPerDay: number) {
  const [hourText, minuteText] = runTimeUtc.split(":");
  const baseMinutes = Number(hourText) * 60 + Number(minuteText);
  const spacing = Math.floor((24 * 60) / runsPerDay);

  return Array.from({ length: runsPerDay }, (_, index) => {
    const total = (baseMinutes + spacing * index) % (24 * 60);
    const hours = String(Math.floor(total / 60)).padStart(2, "0");
    const minutes = String(total % 60).padStart(2, "0");
    return `${hours}:${minutes}`;
  });
}

export default function AutomationTab() {
  const [settings, setSettings] = useState<AutomationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/schedule");
        const payload = await response.json();
        if (response.ok && payload?.schedule) {
          setSettings({
            cadence: "daily",
            runTimeUtc: payload.schedule.runTimeUtc ?? DEFAULT_SETTINGS.runTimeUtc,
            runsPerDay: payload.schedule.runsPerDay ?? DEFAULT_SETTINGS.runsPerDay,
            enabled: payload.schedule.enabled ?? DEFAULT_SETTINGS.enabled,
            autoApproveLow:
              payload.schedule.autoApproveLow ?? DEFAULT_SETTINGS.autoApproveLow,
            autoApproveDelayHours:
              payload.schedule.autoApproveDelayHours ??
              DEFAULT_SETTINGS.autoApproveDelayHours,
            notifyOnDetect:
              payload.schedule.notifyOnDetect ?? DEFAULT_SETTINGS.notifyOnDetect,
            defaultExportFmt:
              payload.schedule.defaultExportFmt ?? DEFAULT_SETTINGS.defaultExportFmt,
          });
        }
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const runPreview = useMemo(
    () => buildRunPreview(settings.runTimeUtc, settings.runsPerDay),
    [settings.runTimeUtc, settings.runsPerDay],
  );

  async function save() {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Unable to save automation settings.");
      }
      setMessage({ text: "Automation settings saved.", ok: true });
    } catch (error) {
      setMessage({
        text:
          error instanceof Error
            ? error.message
            : "Unable to save automation settings.",
        ok: false,
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="easa-card p-6">
        <p className="text-sm text-[var(--easa-color-text-muted)]">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="easa-card p-6">
        <h2 className="text-base font-semibold">Automation schedule</h2>
        <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
          This is the missing settings workflow from the build plan: how often the
          regulation pipeline runs, whether low-risk items can auto-approve later,
          and whether users should be notified when updates are detected.
        </p>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="text-xs text-[var(--easa-color-text-muted)]">
              Pipeline enabled
            </span>
            <button
              type="button"
              className={`easa-chip w-fit ${settings.enabled ? "is-active" : ""}`}
              onClick={() =>
                setSettings((prev) => ({ ...prev, enabled: !prev.enabled }))
              }
            >
              {settings.enabled ? "Enabled" : "Disabled"}
            </button>
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-xs text-[var(--easa-color-text-muted)]">
              Runs per day
            </span>
            <input
              className="easa-input w-full"
              type="number"
              min={1}
              max={4}
              value={settings.runsPerDay}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  runsPerDay: Math.min(4, Math.max(1, Number(event.target.value) || 1)),
                }))
              }
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-xs text-[var(--easa-color-text-muted)]">
              First run time (UTC)
            </span>
            <input
              className="easa-input w-full"
              type="time"
              value={settings.runTimeUtc}
              onChange={(event) =>
                setSettings((prev) => ({ ...prev, runTimeUtc: event.target.value }))
              }
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-xs text-[var(--easa-color-text-muted)]">
              Default export format
            </span>
            <select
              className="easa-input w-full"
              value={settings.defaultExportFmt}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  defaultExportFmt: event.target.value as "pdf" | "docx",
                }))
              }
            >
              <option value="pdf">PDF</option>
              <option value="docx">DOCX</option>
            </select>
          </label>
        </div>

        <div className="mt-5 rounded-[16px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4">
          <p className="text-sm font-medium">Calculated run window preview</p>
          <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
            Extra runs are spaced evenly across the day from your first UTC time.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {runPreview.map((time) => (
              <span key={time} className="easa-badge is-blue">
                {time} UTC
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="easa-card p-6">
        <h2 className="text-base font-semibold">Review safety</h2>
        <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
          Keep the compliance principle from the build plan: the app should assist
          review, not silently make your manuals compliant by itself.
        </p>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="text-xs text-[var(--easa-color-text-muted)]">
              Auto-approve low risk updates
            </span>
            <button
              type="button"
              className={`easa-chip w-fit ${
                settings.autoApproveLow ? "is-active" : ""
              }`}
              onClick={() =>
                setSettings((prev) => ({
                  ...prev,
                  autoApproveLow: !prev.autoApproveLow,
                }))
              }
            >
              {settings.autoApproveLow ? "Allowed" : "Manual review only"}
            </button>
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-xs text-[var(--easa-color-text-muted)]">
              Delay before low risk auto-approval (hours)
            </span>
            <input
              className="easa-input w-full"
              type="number"
              min={1}
              max={168}
              value={settings.autoApproveDelayHours}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  autoApproveDelayHours: Math.min(
                    168,
                    Math.max(1, Number(event.target.value) || 1),
                  ),
                }))
              }
            />
          </label>

          <label className="space-y-2 text-sm md:col-span-2">
            <span className="text-xs text-[var(--easa-color-text-muted)]">
              Notify users when new updates are detected
            </span>
            <button
              type="button"
              className={`easa-chip w-fit ${
                settings.notifyOnDetect ? "is-active" : ""
              }`}
              onClick={() =>
                setSettings((prev) => ({
                  ...prev,
                  notifyOnDetect: !prev.notifyOnDetect,
                }))
              }
            >
              {settings.notifyOnDetect ? "Notifications on" : "Notifications off"}
            </button>
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            className="easa-btn primary"
            disabled={saving}
            onClick={save}
          >
            {saving ? "Saving..." : "Save automation settings"}
          </button>
          {message ? (
            <p
              className={`text-sm ${
                message.ok
                  ? "text-[var(--easa-color-accent-green)]"
                  : "text-[var(--easa-color-accent-pink)]"
              }`}
            >
              {message.text}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
