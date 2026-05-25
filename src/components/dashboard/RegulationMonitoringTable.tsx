import type { RegulationMonitoringRow } from "@/services/dashboard";

function formatCheckedAt(value: string | null) {
  if (!value) return "—";
  if (/^\d{2}:\d{2}\sUTC$/.test(value)) return value;
  const normalized = value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.toISOString().replace("T", " ").slice(0, 16)} UTC`;
}

function resultBadge(row: RegulationMonitoringRow) {
  if (row.result === "error") {
    return <span className="easa-badge is-red">Error</span>;
  }
  if (row.result === "new_items") {
    return <span className="easa-badge is-orange">{row.count} new item{row.count === 1 ? "" : "s"}</span>;
  }
  return <span className="easa-badge is-green">No changes</span>;
}

export default function RegulationMonitoringTable({ rows }: { rows: RegulationMonitoringRow[] }) {
  return (
    <section className="easa-card overflow-hidden p-0">
      <div className="border-b border-[var(--easa-color-border)] px-5 py-4">
        <h2 className="text-base font-semibold">Regulation monitoring</h2>
        <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
          In-scope EASA regulation parts and the latest scan outcome.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-6 text-sm text-[var(--easa-color-text-muted)]">
          No in-scope regulation parts configured yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--easa-color-border)] text-sm">
            <thead className="bg-[var(--easa-color-surface-2)] text-xs uppercase tracking-wide text-[var(--easa-color-text-muted)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Regulation part</th>
                <th className="px-4 py-3 text-left font-medium">Last checked</th>
                <th className="px-4 py-3 text-left font-medium">Result</th>
                <th className="px-4 py-3 text-left font-medium">Next scheduled scan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--easa-color-border)]">
              {rows.map((row) => (
                <tr key={row.regPart} className="bg-[var(--easa-color-surface-1)]">
                  <td className="px-4 py-3 font-medium">{row.regPart}</td>
                  <td className="px-4 py-3 text-[var(--easa-color-text-muted)]">{formatCheckedAt(row.lastCheckedAt)}</td>
                  <td className="px-4 py-3">{resultBadge(row)}</td>
                  <td className="px-4 py-3 text-[var(--easa-color-text-muted)]">{row.nextScheduledScan ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
