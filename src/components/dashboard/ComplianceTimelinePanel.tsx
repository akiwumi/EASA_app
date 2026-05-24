import type { ComplianceTimeline } from "@/services/dashboard";

function AgeBadge({ count, label, tone }: { count: number; label: string; tone: "green" | "orange" | "red" }) {
  const colors = {
    green: "bg-[var(--easa-color-accent-green)]/10 text-[var(--easa-color-accent-green)]",
    orange: "bg-[var(--easa-color-accent-orange)]/10 text-[var(--easa-color-accent-orange)]",
    red: "bg-red-100 text-red-700",
  };
  return (
    <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: "var(--easa-color-surface-2)" }}>
      <span className="text-[var(--easa-color-text-muted)]">{label}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colors[tone]}`}>{count}</span>
    </div>
  );
}

export default function ComplianceTimelinePanel({ data }: { data: ComplianceTimeline }) {
  const maxWeek = Math.max(...data.detectedByWeek.map((w) => w.count), 1);
  const totalPending = data.pendingFresh + data.pendingAgeing + data.pendingOverdue;

  return (
    <section className="easa-card overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-[var(--easa-color-border)] px-5 py-4">
        <div>
          <h2 className="text-base font-semibold">Compliance timeline</h2>
          <p className="mt-0.5 text-xs text-[var(--easa-color-text-muted)]">
            EASA changes detected and review status
          </p>
        </div>
        {data.nextScanUtc && (
          <span className="easa-badge is-blue text-xs">
            Next scan {data.nextScanUtc} UTC
          </span>
        )}
      </div>

      <div className="divide-y divide-[var(--easa-color-border)]">

        {/* Detected last 30 days — mini bar chart */}
        <div className="px-5 py-4">
          <div className="mb-3 flex items-baseline justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--easa-color-text-muted)]">
              Changes detected — last 30 days
            </p>
            <span className="text-lg font-semibold text-[var(--easa-color-text-primary)]">
              {data.detectedLast30d}
            </span>
          </div>
          <div className="flex items-end gap-1.5" style={{ height: 48 }}>
            {data.detectedByWeek.map((week) => {
              const pct = maxWeek > 0 ? (week.count / maxWeek) * 100 : 0;
              return (
                <div key={week.label} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-sm transition-all"
                    style={{
                      height: `${Math.max(pct, 4)}%`,
                      backgroundColor: week.count > 0
                        ? "var(--easa-color-brand-primary)"
                        : "var(--easa-color-border)",
                      opacity: week.count > 0 ? 1 : 0.4,
                    }}
                  />
                  <span className="text-[10px] text-[var(--easa-color-text-muted)]">{week.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pending review age breakdown */}
        <div className="px-5 py-4">
          <div className="mb-3 flex items-baseline justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--easa-color-text-muted)]">
              Pending review
            </p>
            <span className={`text-lg font-semibold ${totalPending > 0 ? "text-[var(--easa-color-accent-orange)]" : "text-[var(--easa-color-text-primary)]"}`}>
              {totalPending}
            </span>
          </div>
          <div className="space-y-1.5">
            <AgeBadge count={data.pendingFresh} label="Fresh (< 7 days)" tone="green" />
            <AgeBadge count={data.pendingAgeing} label="Ageing (7–30 days)" tone="orange" />
            <AgeBadge count={data.pendingOverdue} label="Overdue (> 30 days)" tone="red" />
          </div>
        </div>

        {/* Approved this week */}
        <div className="flex items-center justify-between px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--easa-color-text-muted)]">
            Approved this week
          </p>
          <span className={`text-lg font-semibold ${data.approvedThisWeek > 0 ? "text-[var(--easa-color-accent-green)]" : "text-[var(--easa-color-text-muted)]"}`}>
            {data.approvedThisWeek}
          </span>
        </div>
      </div>
    </section>
  );
}
