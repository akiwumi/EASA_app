import Link from "next/link";

export default function UpdatesQueuePage() {
  return (
    <main className="easa-card p-8">
      <h1 className="text-xl font-semibold">Update queue</h1>
      <p className="mt-2 text-sm text-[var(--easa-color-text-muted)]">
        Full queue with filters, bulk actions, and exports ships in Phase 2–3
        (MASTER_BUILD §11.3).
      </p>
      <Link className="easa-btn primary mt-6 inline-flex" href="/dashboard">
        Back to dashboard
      </Link>
    </main>
  );
}
