import Link from "next/link";

export default function FlightbookUploadPage() {
  return (
    <main className="easa-card p-8">
      <h1 className="text-xl font-semibold">Upload flight book</h1>
      <p className="mt-2 text-sm text-[var(--easa-color-text-muted)]">
        Drag-and-drop import with <code className="text-xs">pdf-parse</code>{" "}
        integration is scheduled for Phase 5 (MASTER_BUILD §11.7). Until then,
        use <code className="text-xs">scripts/import-flightbooks.mjs</code>.
      </p>
      <Link className="easa-btn secondary mt-6 inline-flex" href="/flightbooks">
        Back to flight books
      </Link>
    </main>
  );
}
