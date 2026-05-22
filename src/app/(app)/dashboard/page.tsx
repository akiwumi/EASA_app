import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardHeaderActions from "@/components/dashboard/DashboardHeaderActions";
import WorkflowBanner from "@/components/dashboard/WorkflowBanner";
import PipelineStatusCard from "@/components/dashboard/PipelineStatusCard";
import { buildDashboardSetupTasks } from "@/components/dashboard/DashboardSectionPanels";
import {
  loadDashboardSetupSummary,
  loadDashboardStats,
  loadOrgContext,
  loadRecentPipelineRun,
} from "@/services/dashboard";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  const org = await loadOrgContext();

  if (!org) {
    redirect("/settings?tab=setup");
  }

  const [setupSummary, stats, lastRun] = await Promise.all([
    loadDashboardSetupSummary(org.organizationId),
    loadDashboardStats(org.organizationId),
    loadRecentPipelineRun(org.organizationId),
  ]);

  const setupTasks = buildDashboardSetupTasks(setupSummary);
  const setupDoneCount = setupTasks.filter((task) => task.done).length;

  return (
    <div className="space-y-6">

      {/* Workflow pipeline banner */}
      <WorkflowBanner
        activeFeeds={setupSummary.activeRssCount}
        totalFeeds={setupSummary.rssSourceCount}
        pendingReview={stats.pendingApprovals}
        flightbookCount={setupSummary.flightbookCount}
        newAlertsThisWeek={stats.newChanges7d}
      />

      {/* Pipeline trigger + quick links */}
      <DashboardHeaderActions />

      {/* Two-column grid below */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Setup checklist */}
        <section className="easa-card overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-[var(--easa-color-border)] px-5 py-4">
            <div>
              <h2 className="text-base font-semibold">Setup checklist</h2>
              <p className="mt-0.5 text-xs text-[var(--easa-color-text-muted)]">
                {setupDoneCount} of {setupTasks.length} complete
              </p>
            </div>
            <span className={`easa-badge ${setupDoneCount === setupTasks.length ? "is-green" : "is-orange"}`}>
              {setupDoneCount === setupTasks.length ? "Ready" : `${setupTasks.length - setupDoneCount} remaining`}
            </span>
          </div>

          <div className="divide-y divide-[var(--easa-color-border)]">
            {setupTasks.map((task) => (
              <Link
                key={task.label}
                href={task.href}
                className="flex items-center gap-4 px-5 py-4 transition hover:bg-[var(--easa-color-surface-2)]"
              >
                {task.done
                  ? <CheckCircle2 size={18} strokeWidth={2} className="shrink-0 text-[var(--easa-color-accent-green)]" />
                  : <Circle size={18} strokeWidth={1.75} className="shrink-0 text-[var(--easa-color-text-muted)]" />
                }
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--easa-color-text-primary)]">{task.label}</p>
                  <p className="mt-0.5 text-xs text-[var(--easa-color-text-muted)]">{task.hint}</p>
                </div>
                {!task.done && (
                  <span className="shrink-0 text-xs font-medium text-[var(--easa-color-brand-primary)]">
                    {task.action}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>

        {/* Status snapshot */}
        <section className="space-y-4">

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <Link
              href="/results"
              className="easa-card flex flex-col gap-1 p-4 transition hover:bg-[var(--easa-color-surface-2)]"
            >
              <p className="text-xs text-[var(--easa-color-text-muted)]">New alerts</p>
              <p className="text-2xl font-semibold">{stats.newChanges7d}</p>
              <p className="text-xs text-[var(--easa-color-text-muted)]">last 7 days</p>
            </Link>

            <Link
              href="/updates"
              className="easa-card flex flex-col gap-1 p-4 transition hover:bg-[var(--easa-color-surface-2)]"
            >
              <p className="text-xs text-[var(--easa-color-text-muted)]">Pending review</p>
              <p className={`text-2xl font-semibold ${stats.pendingApprovals > 0 ? "text-[var(--easa-color-accent-orange)]" : ""}`}>
                {stats.pendingApprovals}
              </p>
              <p className="text-xs text-[var(--easa-color-text-muted)]">updates</p>
            </Link>

            <Link
              href="/flightbooks"
              className="easa-card flex flex-col gap-1 p-4 transition hover:bg-[var(--easa-color-surface-2)]"
            >
              <p className="text-xs text-[var(--easa-color-text-muted)]">Flight books</p>
              <p className="text-2xl font-semibold">{setupSummary.flightbookCount}</p>
              <p className="text-xs text-[var(--easa-color-text-muted)]">controlled docs</p>
            </Link>
          </div>

          {/* Pipeline status */}
          <PipelineStatusCard lastRun={lastRun} />

          {/* Quick actions */}
          <div className="easa-card divide-y divide-[var(--easa-color-border)] p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--easa-color-border)]">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--easa-color-text-muted)]">Quick actions</p>
            </div>
            {[
              {
                label: "Review pending updates",
                sub: stats.pendingApprovals > 0 ? `${stats.pendingApprovals} item${stats.pendingApprovals !== 1 ? "s" : ""} waiting` : "Queue is clear",
                href: "/updates",
                highlight: stats.pendingApprovals > 0,
              },
              {
                label: "View flight books",
                sub: setupSummary.flightbookCount > 0 ? `${setupSummary.flightbookCount} document${setupSummary.flightbookCount !== 1 ? "s" : ""}` : "None uploaded yet",
                href: "/flightbooks",
                highlight: false,
              },
              {
                label: "Upload a flight book",
                sub: "Add or replace a controlled manual",
                href: "/flightbooks/upload",
                highlight: false,
              },
              {
                label: "Manage feeds & settings",
                sub: `${setupSummary.activeRssCount} active feed${setupSummary.activeRssCount !== 1 ? "s" : ""}`,
                href: "/settings",
                highlight: false,
              },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-[var(--easa-color-surface-2)]"
              >
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${item.highlight ? "text-[var(--easa-color-accent-orange)]" : "text-[var(--easa-color-text-primary)]"}`}>
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--easa-color-text-muted)]">{item.sub}</p>
                </div>
                <ArrowRight size={15} strokeWidth={1.75} className="shrink-0 text-[var(--easa-color-text-muted)]" />
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
