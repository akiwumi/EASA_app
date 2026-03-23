"use client";

import { useState } from "react";
import { Users, BookOpen, Bot, Rss } from "lucide-react";
import UsersTab from "@/components/admin/UsersTab";
import FlightbooksTab from "@/components/admin/FlightbooksTab";
import AiSettingsTab from "@/components/admin/AiSettingsTab";
import SourcesTab from "@/components/admin/SourcesTab";

const TABS = [
  { id: "users", label: "Users", icon: Users },
  { id: "flightbooks", label: "Flight books", icon: BookOpen },
  { id: "sources", label: "RSS feeds", icon: Rss },
  { id: "ai", label: "AI settings", icon: Bot },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function SettingsPage() {
  const [active, setActive] = useState<TabId>("users");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Admin panel</h1>
        <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
          Manage users, flight books, and AI provider configuration for your organisation.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-2xl bg-[var(--easa-color-surface-2)] p-1">
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
      {active === "users" && <UsersTab />}
      {active === "flightbooks" && <FlightbooksTab />}
      {active === "sources" && <SourcesTab />}
      {active === "ai" && <AiSettingsTab />}
    </div>
  );
}
