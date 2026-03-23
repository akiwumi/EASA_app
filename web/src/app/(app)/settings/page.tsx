import Link from "next/link";

export default function SettingsPage() {
  return (
    <main className="easa-card p-8">
      <h1 className="text-xl font-semibold">Settings</h1>
      <p className="mt-2 text-sm text-[var(--easa-color-text-muted)]">
        Admin-only tabs for schedules, approvals, exports, sources, users, and
        org defaults are delivered in Phase 6 (MASTER_BUILD §11.10). The schedule
        card on the dashboard already persists to <code className="text-xs">schedules</code>.
      </p>
      <Link className="easa-btn primary mt-6 inline-flex" href="/dashboard">
        Back to dashboard
      </Link>
    </main>
  );
}
