import Link from "next/link";

export default function ProfilePage() {
  return (
    <main className="easa-card p-8">
      <h1 className="text-xl font-semibold">Profile</h1>
      <p className="mt-2 text-sm text-[var(--easa-color-text-muted)]">
        Avatar upload, notification preferences, and password change UI arrive in
        Phase 4 (MASTER_BUILD §11.11). A <code className="text-xs">user_profiles</code>{" "}
        row is created automatically on login once migrations are applied.
      </p>
      <Link className="easa-btn primary mt-6 inline-flex" href="/dashboard">
        Back to dashboard
      </Link>
    </main>
  );
}
