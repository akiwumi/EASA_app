"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

type SetupTabId =
  | "users"
  | "flightbooks"
  | "sources"
  | "ai"
  | "setup"
  | "automation";

type SetupStatus = {
  currentUser: {
    id: string;
    email: string | null;
  };
  organization: {
    id: string;
    name: string;
    linked: boolean;
    role: string | null;
    exists: boolean;
    isAdmin: boolean;
  };
  setup: {
    hasOrganization: boolean;
    sourcesTotal: number;
    activeSources: number;
    hasAiConfig: boolean;
    aiProvider: string | null;
    aiModel: string | null;
    hasAiKey: boolean;
    hasSchedule: boolean;
    scheduleEnabled: boolean | null;
    runsPerDay: number | null;
    runTimeUtc: string | null;
  };
};

export default function SetupTab({
  onOpenTab,
}: {
  onOpenTab: (tab: SetupTabId) => void;
}) {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/setup-status");
      const payload = (await response.json()) as SetupStatus | { error?: string };

      if (!response.ok || !("currentUser" in payload)) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Unable to load setup status.",
        );
      }

      setStatus(payload);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load setup status.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function seedDefaults() {
    setSeeding(true);
    setSeedMessage(null);

    try {
      const response = await fetch("/api/admin/seed-sources", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to seed default feeds.");
      }
      setSeedMessage(
        `Ready. Added ${payload.inserted?.length ?? 0} new feed(s) and re-activated the current EASA defaults.`,
      );
      await load();
    } catch (seedError) {
      setSeedMessage(
        seedError instanceof Error
          ? seedError.message
          : "Unable to seed default feeds.",
      );
    } finally {
      setSeeding(false);
    }
  }

  const checklist = status
    ? [
        {
          label: "Demo organization exists",
          done: status.setup.hasOrganization,
          help: "Needed so sources, schedules, and AI settings have somewhere to live.",
        },
        {
          label: "Your login user is linked to the organization",
          done: status.organization.linked,
          help: "Without this, the app can log you in but still look empty.",
        },
        {
          label: "At least one active EASA RSS feed exists",
          done: status.setup.activeSources > 0,
          help: "Active RSS feeds are what the dashboard and pipeline use for update checks.",
        },
        {
          label: "AI provider settings are saved",
          done: status.setup.hasAiConfig && status.setup.hasAiKey,
          help: "Needed for AI analysis, matching, and suggested update text.",
        },
        {
          label: "Automation schedule exists",
          done: status.setup.hasSchedule,
          help: "This controls when the pipeline is allowed to run automatically.",
        },
      ]
    : [];

  const readyCount = checklist.filter((item) => item.done).length;

  return (
    <div className="space-y-6">
      <div className="easa-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">Beginner setup checklist</h2>
            <p className="mt-1 max-w-2xl text-sm text-[var(--easa-color-text-muted)]">
              This page tells you what the app is still missing before the dashboard
              becomes useful. Use this first, then fall back to the SQL guide only
              for the steps that are still incomplete.
            </p>
          </div>
          <div className="rounded-[16px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-4 py-3 text-xs text-[var(--easa-color-text-muted)]">
            SQL guide file: <code>docs/SUPABASE_SQL_NOVICE_GUIDE.md</code>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-[var(--easa-color-text-muted)]">
            <Loader2 size={16} className="animate-spin" />
            Checking your setup...
          </div>
        ) : error ? (
          <p className="mt-6 text-sm text-[var(--easa-color-accent-pink)]">{error}</p>
        ) : status ? (
          <div className="mt-6 space-y-5">
            <div className="rounded-[18px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--easa-color-text-muted)]">
                Progress
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {readyCount} / {checklist.length} setup steps complete
              </p>
              <p className="mt-2 text-sm text-[var(--easa-color-text-muted)]">
                Current user: {status.currentUser.email ?? "No email"} ·{" "}
                <code className="text-xs">{status.currentUser.id}</code>
              </p>
            </div>

            <div className="space-y-3">
              {checklist.map((item) => (
                <div
                  key={item.label}
                  className="flex items-start gap-3 rounded-[16px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4"
                >
                  <div className="mt-0.5 shrink-0">
                    {item.done ? (
                      <CheckCircle2
                        size={18}
                        className="text-[var(--easa-color-accent-green)]"
                      />
                    ) : (
                      <Circle
                        size={18}
                        className="text-[var(--easa-color-text-muted)]"
                      />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
                      {item.help}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="easa-card p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Use the app first</h3>
            <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
              These actions are safer than editing SQL by hand when they are available.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button className="easa-btn secondary" onClick={() => onOpenTab("sources")}>
              Open RSS feeds
            </button>
            <button className="easa-btn secondary" onClick={() => onOpenTab("ai")}>
              Open AI settings
            </button>
            <button className="easa-btn secondary" onClick={() => onOpenTab("users")}>
              Open users
            </button>
            <button
              className="easa-btn secondary"
              onClick={() => onOpenTab("automation")}
            >
              Open automation
            </button>
          </div>

          <div className="rounded-[16px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4">
            <p className="text-sm font-medium">Seed the current EASA default feeds</p>
            <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
              This removes old dead EASA URLs and restores the current working feed set.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                className="easa-btn primary"
                disabled={seeding}
                onClick={seedDefaults}
              >
                {seeding ? "Updating..." : "Restore EASA defaults"}
              </button>
              {seedMessage ? (
                <p className="text-xs text-[var(--easa-color-text-muted)]">
                  {seedMessage}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="easa-card p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Current app status</h3>
            <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
              These values come from your live Supabase project.
            </p>
          </div>

          {status ? (
            <div className="space-y-3 text-sm">
              <div className="rounded-[16px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4">
                <p className="font-medium">Organisation</p>
                <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
                  {status.organization.name} ·{" "}
                  <code className="text-xs">{status.organization.id}</code>
                </p>
                <p className="mt-2 text-xs text-[var(--easa-color-text-muted)]">
                  Linked user: {status.organization.linked ? "Yes" : "No"} · Role:{" "}
                  {status.organization.role ?? "Not linked yet"}
                </p>
              </div>

              <div className="rounded-[16px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4">
                <p className="font-medium">RSS feeds</p>
                <p className="mt-2 text-xs text-[var(--easa-color-text-muted)]">
                  {status.setup.activeSources} active of {status.setup.sourcesTotal} total
                </p>
              </div>

              <div className="rounded-[16px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4">
                <p className="font-medium">AI config</p>
                <p className="mt-2 text-xs text-[var(--easa-color-text-muted)]">
                  {status.setup.hasAiConfig
                    ? `${status.setup.aiProvider ?? "provider"} · ${status.setup.aiModel ?? "model"}`
                    : "Not configured yet"}
                </p>
              </div>

              <div className="rounded-[16px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4">
                <p className="font-medium">Automation</p>
                <p className="mt-2 text-xs text-[var(--easa-color-text-muted)]">
                  {status.setup.hasSchedule
                    ? `${status.setup.runsPerDay ?? 1} run(s) per day · ${status.setup.runTimeUtc ?? "06:00"} UTC`
                    : "No schedule saved yet"}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="easa-card p-6">
          <h3 className="text-sm font-semibold">Troubleshooting without SQL</h3>
          <div className="mt-3 space-y-3 text-sm text-[var(--easa-color-text-muted)]">
            <p>
              The app should create and link the default organisation for you
              automatically. If this page still says your user is not linked,
              sign out and sign back in, then refresh the dashboard.
            </p>
            <p>
              If feeds are missing, use <strong className="text-[var(--easa-color-text-secondary)]">Restore EASA defaults</strong> or open the RSS feeds tab and add them there.
            </p>
            <p>
              If AI is not producing results, open AI settings and save a provider,
              model, and API key from the app instead of editing the database directly.
            </p>
            <p>
              After setup is done, go back to the dashboard and click
              <strong className="text-[var(--easa-color-text-secondary)]">
                {" "}Run now
              </strong>
              to fetch feeds and compare them with your uploaded flight books.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
