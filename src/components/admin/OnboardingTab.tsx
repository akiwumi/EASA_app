"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

type OnboardingItem = {
  key: string;
  label: string;
  help: string;
  autoDone: boolean;
  completed: boolean;
};

type OnboardingPayload = {
  schemaReady: boolean;
  trainingSchemaReady: boolean;
  brandingSchemaReady: boolean;
  items: OnboardingItem[];
};

type SetupTabId =
  | "setup"
  | "users"
  | "flightbooks"
  | "sources"
  | "automation"
  | "branding"
  | "onboarding"
  | "exports";

const ACTION_BY_KEY: Record<string, { label: string; type: "tab" | "route"; value: string }> = {
  branding: { label: "Open branding", type: "tab", value: "branding" },
  sources: { label: "Open RSS feeds", type: "tab", value: "sources" },
  ai: { label: "Open RSS feeds", type: "tab", value: "sources" },
  schedule: { label: "Open automation", type: "tab", value: "automation" },
  manuals: { label: "Open manual upload", type: "route", value: "/flightbooks/upload" },
  programmes: { label: "Open training", type: "route", value: "/training/programmes" },
  assignments: { label: "Open assignments", type: "route", value: "/training/assignments" },
};

export default function OnboardingTab({
  onOpenTab,
}: {
  onOpenTab: (tab: SetupTabId) => void;
}) {
  const [payload, setPayload] = useState<OnboardingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/onboarding");
    const json = (await response.json()) as OnboardingPayload | { error?: string };
    if (response.ok && "items" in json) {
      setPayload(json);
      setMessage(null);
    } else {
      setMessage("Unable to load onboarding checklist.");
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const completedCount = useMemo(
    () => payload?.items.filter((item) => item.completed).length ?? 0,
    [payload],
  );

  async function toggleItem(item: OnboardingItem) {
    setBusyKey(item.key);
    const response = await fetch("/api/admin/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: item.key, completed: !item.completed }),
    });
    const json = (await response.json()) as OnboardingPayload | { error?: string };
    if (response.ok && "items" in json) {
      setPayload(json);
      setMessage(null);
    } else {
      setMessage(("error" in json ? json.error : null) ?? "Unable to update onboarding item.");
    }
    setBusyKey(null);
  }

  function runAction(itemKey: string) {
    const action = ACTION_BY_KEY[itemKey];
    if (!action) return;
    if (action.type === "tab") {
      onOpenTab(action.value as SetupTabId);
      return;
    }
    window.location.assign(action.value);
  }

  if (loading) {
    return (
      <div className="easa-card p-6">
        <div className="flex items-center gap-2 text-sm text-[var(--easa-color-text-muted)]">
          <Loader2 size={16} className="animate-spin" />
          Loading onboarding checklist…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="easa-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">School onboarding checklist</h2>
            <p className="mt-1 max-w-2xl text-sm text-[var(--easa-color-text-muted)]">
              This is the operator-facing version of setup. It turns the roadmap into a guided handoff for bringing a school live with less manual support.
            </p>
          </div>
          <div className="rounded-[16px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-4 py-3 text-sm">
            {completedCount} / {payload?.items.length ?? 0} complete
          </div>
        </div>

        {message && (
          <p className="mt-4 text-sm text-[var(--easa-color-text-muted)]">{message}</p>
        )}
        {payload && !payload.schemaReady && (
          <p className="mt-4 text-sm text-[var(--easa-color-text-muted)]">
            Checklist progress will persist after the Phase 3 onboarding migrations are applied. Auto-detected completion still works now.
          </p>
        )}

        <div className="mt-6 space-y-3">
          {payload?.items.map((item) => (
            <div
              key={item.key}
              className="rounded-[18px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {item.completed ? (
                      <CheckCircle2 size={18} className="text-[var(--easa-color-accent-green)]" />
                    ) : (
                      <Circle size={18} className="text-[var(--easa-color-text-muted)]" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
                      {item.help}
                    </p>
                    {item.autoDone && (
                      <p className="mt-2 text-xs text-[var(--easa-color-accent-green)]">
                        This step is already satisfied from live app data.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {ACTION_BY_KEY[item.key] && (
                    <button
                      className="easa-btn secondary text-sm"
                      onClick={() => runAction(item.key)}
                      type="button"
                    >
                      {ACTION_BY_KEY[item.key].label}
                    </button>
                  )}
                  <button
                    className="easa-btn secondary text-sm"
                    onClick={() => toggleItem(item)}
                    disabled={busyKey === item.key || !payload?.schemaReady}
                    type="button"
                  >
                    {item.completed ? "Mark incomplete" : "Mark complete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
