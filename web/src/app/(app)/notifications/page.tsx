import Link from "next/link";

export default function NotificationsPage() {
  return (
    <main className="easa-card p-8">
      <h1 className="text-xl font-semibold">Notifications</h1>
      <p className="mt-2 text-sm text-[var(--easa-color-text-muted)]">
        Realtime notification centre + Resend email hooks are part of Phase 4
        (MASTER_BUILD §11.9).
      </p>
      <Link className="easa-btn primary mt-6 inline-flex" href="/dashboard">
        Back to dashboard
      </Link>
    </main>
  );
}
