import Link from "next/link";

export default function ChangesPage() {
  return (
    <main className="easa-card p-8">
      <h1 className="text-xl font-semibold">Change list</h1>
      <p className="mt-2 text-sm text-[var(--easa-color-text-muted)]">
        Aggregated <code className="text-xs">reg_changes</code> grouped by part
        arrives in Phase 2 (MASTER_BUILD §11.5).
      </p>
      <Link className="easa-btn primary mt-6 inline-flex" href="/dashboard">
        Back to dashboard
      </Link>
    </main>
  );
}
