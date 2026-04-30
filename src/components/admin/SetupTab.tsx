"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Copy, Loader2 } from "lucide-react";

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

const DEMO_ORG_ID = "00000000-0000-4000-8000-000000000001";

type CopyState = Record<string, boolean>;

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
  const [copied, setCopied] = useState<CopyState>({});

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

  const linkUserSql = useMemo(() => {
    const userId = status?.currentUser.id ?? "PASTE_REAL_AUTH_USER_UUID_HERE";
    return `insert into org_users (organization_id, user_id, role)
select
  '${DEMO_ORG_ID}',
  '${userId}',
  'admin'
where not exists (
  select 1
  from org_users
  where organization_id = '${DEMO_ORG_ID}'
    and user_id = '${userId}'
);`;
  }, [status?.currentUser.id]);

  const aiConfigSql = `insert into ai_provider_config (
  organization_id,
  provider,
  model,
  api_key
)
values (
  '${DEMO_ORG_ID}',
  'openai',
  'gpt-4o',
  'PASTE_REAL_API_KEY_HERE'
)
on conflict (organization_id) do update
set
  provider = excluded.provider,
  model = excluded.model,
  api_key = excluded.api_key,
  updated_at = now();`;

  const orgSql = `insert into organizations (id, name)
values ('${DEMO_ORG_ID}', 'Demo Flight School')
on conflict (id) do update
set name = excluded.name;`;

  async function copy(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied((prev) => ({ ...prev, [key]: true }));
      window.setTimeout(() => {
        setCopied((prev) => ({ ...prev, [key]: false }));
      }, 1600);
    } catch {
      // ignore clipboard failures
    }
  }

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
          label: "At least one active EASA source exists",
          done: status.setup.activeSources > 0,
          help: "Active feeds are what the dashboard checks for updates.",
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
                <p className="font-medium">Sources</p>
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
        <SqlCard
          title="If the organization row is missing"
          description="Run this in Supabase SQL Editor only if the checklist says the demo organization does not exist."
          code={orgSql}
          copied={copied.organization}
          onCopy={() => copy("organization", orgSql)}
        />
        <SqlCard
          title="If your user is not linked to the app"
          description="This is the most common reason the app looks empty after login."
          code={linkUserSql}
          copied={copied.orgUser}
          onCopy={() => copy("orgUser", linkUserSql)}
        />
        <SqlCard
          title="If AI settings are still missing"
          description="You can also save this from the AI settings tab, which is easier for most beginners."
          code={aiConfigSql}
          copied={copied.ai}
          onCopy={() => copy("ai", aiConfigSql)}
        />
        <div className="easa-card p-6">
          <h3 className="text-sm font-semibold">Beginner reminder</h3>
          <div className="mt-3 space-y-3 text-sm text-[var(--easa-color-text-muted)]">
            <p>
              Use the app tabs whenever possible. SQL should be the backup plan,
              not the first plan.
            </p>
            <p>
              If you copy SQL, paste one block at a time in Supabase SQL Editor and
              run it slowly. Check the result after each block before moving on.
            </p>
            <p>
              After setup is done, go back to the dashboard and click
              <strong className="text-[var(--easa-color-text-secondary)]">
                {" "}Check for updates
              </strong>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SqlCard({
  title,
  description,
  code,
  copied,
  onCopy,
}: {
  title: string;
  description: string;
  code: string;
  copied?: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="easa-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
            {description}
          </p>
        </div>
        <button className="easa-btn secondary" onClick={onCopy}>
          <Copy size={14} strokeWidth={1.75} />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="mt-4 overflow-x-auto rounded-[16px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4 text-xs leading-6 text-[var(--easa-color-text-secondary)]">
        <code>{code}</code>
      </pre>
    </div>
  );
}
