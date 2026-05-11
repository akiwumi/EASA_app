"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Users, BookOpen, Rss, Rocket, TimerReset, Palette, ClipboardList, Files } from "lucide-react";
import UsersTab from "@/components/admin/UsersTab";
import FlightbooksTab from "@/components/admin/FlightbooksTab";
import SourcesTab from "@/components/admin/SourcesTab";
import SetupTab from "@/components/admin/SetupTab";
import AutomationTab from "@/components/admin/AutomationTab";
import BrandingTab from "@/components/admin/BrandingTab";
import OnboardingTab from "@/components/admin/OnboardingTab";
import ExportsTab from "@/components/admin/ExportsTab";

const TABS = [
  { id: "setup", label: "Setup", icon: Rocket },
  { id: "users", label: "Users", icon: Users },
  { id: "flightbooks", label: "Flight books", icon: BookOpen },
  { id: "sources", label: "RSS feeds", icon: Rss },
  { id: "automation", label: "Automation", icon: TimerReset },
  { id: "branding", label: "School profile", icon: Palette },
  { id: "onboarding", label: "Onboarding", icon: ClipboardList },
  { id: "exports", label: "Exports", icon: Files },
] as const;

type TabId = (typeof TABS)[number]["id"];
const TAB_IDS = TABS.map((t) => t.id) as readonly string[];

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initial = (searchParams.get("tab") ?? "setup") as TabId;
  const [active, setActive] = useState<TabId>(TAB_IDS.includes(initial) ? initial : "setup");

  // Keep URL in sync when tab changes
  useEffect(() => {
    router.replace(`/settings?tab=${active}`, { scroll: false });
  }, [active, router]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Admin panel</h1>
        <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
          Start with setup, then manage users, feeds, branding, automation, exports, and school onboarding.
        </p>
      </div>

      <div className="md:hidden">
        <label
          className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-[var(--easa-color-text-muted)]"
          htmlFor="admin-section-select"
        >
          Admin section
        </label>
        <select
          id="admin-section-select"
          className="w-full rounded-2xl border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] px-4 py-3 text-sm font-medium text-[var(--easa-color-text-primary)] shadow-[var(--easa-shadow-1)] outline-none focus:border-[var(--easa-color-brand-primary)]"
          value={active}
          onChange={(event) => setActive(event.target.value as TabId)}
        >
          {TABS.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
            </option>
          ))}
        </select>
      </div>

      {/* Tab bar */}
      <div className="hidden gap-1 rounded-2xl bg-[var(--easa-color-surface-2)] p-1 md:flex">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-[var(--easa-color-surface-1)] shadow-[var(--easa-shadow-1)] text-[var(--easa-color-text-primary)]"
                  : "text-[var(--easa-color-text-muted)] hover:text-[var(--easa-color-text-secondary)]"
              }`}
              onClick={() => setActive(tab.id)}
            >
              <Icon size={16} strokeWidth={1.75} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {active === "setup" && <SetupTab onOpenTab={setActive} />}
      {active === "users" && <UsersTab />}
      {active === "flightbooks" && <FlightbooksTab />}
      {active === "sources" && <SourcesTab />}
      {active === "automation" && <AutomationTab />}
      {active === "branding" && <BrandingTab />}
      {active === "onboarding" && <OnboardingTab onOpenTab={setActive} />}
      {active === "exports" && <ExportsTab />}
    </div>
  );
}
