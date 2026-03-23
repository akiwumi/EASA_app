import Link from "next/link";

export default async function UpdateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="easa-card p-8">
      <p className="text-xs text-[var(--easa-color-text-muted)]">
        Proposed update · {id}
      </p>
      <h1 className="mt-2 text-xl font-semibold">Diff viewer</h1>
      <p className="mt-2 text-sm text-[var(--easa-color-text-muted)]">
        EASA diff panels, AI patch preview, notes thread, and approval actions
        are implemented in Phase 3 (MASTER_BUILD §11.4).
      </p>
      <Link className="easa-btn secondary mt-6 inline-flex" href="/updates">
        Back to queue
      </Link>
    </main>
  );
}
