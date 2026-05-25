import { getOrgScopedContext } from "@/lib/supabase/access";

export default async function ReportsPage() {
  const ctx = await getOrgScopedContext(["admin", "compliance_manager"]);
  if (!ctx) {
    return (
      <div className="easa-card p-8">
        <p className="text-sm text-[var(--easa-color-accent-pink)]">You do not have access to compliance reports.</p>
      </div>
    );
  }

  const defaultEnd = new Date();
  const defaultStart = new Date(defaultEnd.getTime() - 90 * 24 * 60 * 60 * 1000);

  return (
    <div className="space-y-6">
      <div className="easa-card p-6">
        <h1 className="text-xl font-semibold">Compliance report</h1>
        <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
          Generate a CAA-ready audit report showing approved, dismissed, and pending change actions.
        </p>
      </div>

      <div className="easa-card p-6">
        <form action="/api/reports/compliance" method="GET" className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-wide text-[var(--easa-color-text-muted)]">Start date</span>
            <input
              type="date"
              name="start"
              defaultValue={defaultStart.toISOString().slice(0, 10)}
              className="easa-input w-full"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-wide text-[var(--easa-color-text-muted)]">End date</span>
            <input
              type="date"
              name="end"
              defaultValue={defaultEnd.toISOString().slice(0, 10)}
              className="easa-input w-full"
            />
          </label>
          <div className="flex items-end">
            <button type="submit" className="easa-btn primary w-full text-sm">
              Generate report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
