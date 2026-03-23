import Link from "next/link";

export default function HistoryPage() {
  return (
    <main className="easa-card p-8">
      <h1 className="text-xl font-semibold">Time machine</h1>
      <p className="mt-2 text-sm text-[var(--easa-color-text-muted)]">
        Timeline, compare mode, and rollback via the{" "}
        <code className="text-xs">rollback</code> Edge Function land in Phase 5
        (MASTER_BUILD §11.8).
      </p>
      <Link className="easa-btn primary mt-6 inline-flex" href="/dashboard">
        Back to dashboard
      </Link>
    </main>
  );
}
