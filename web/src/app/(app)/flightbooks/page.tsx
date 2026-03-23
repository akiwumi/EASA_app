import Link from "next/link";

export default function FlightbooksPage() {
  return (
    <main className="easa-card p-8">
      <h1 className="text-xl font-semibold">Flight books</h1>
      <p className="mt-2 text-sm text-[var(--easa-color-text-muted)]">
        Document browser, section tree, and inline editing ship in Phase 5
        (MASTER_BUILD §11.6).
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link className="easa-btn secondary" href="/flightbooks/upload">
          Upload (admin)
        </Link>
        <Link className="easa-btn primary" href="/dashboard">
          Dashboard
        </Link>
      </div>
    </main>
  );
}
