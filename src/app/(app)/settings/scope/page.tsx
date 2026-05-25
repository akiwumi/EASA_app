"use client";

import RegulatoryScopeSettings from "@/components/admin/RegulatoryScopeSettings";

export default function ScopeSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="easa-card p-6">
        <h1 className="text-xl font-semibold">Regulatory scope</h1>
        <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
          Select which EASA parts apply to your school. Excluded parts will be ignored in future scans.
        </p>
      </div>
      <RegulatoryScopeSettings />
    </div>
  );
}
