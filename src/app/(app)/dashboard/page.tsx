import { redirect } from "next/navigation";
import DashboardHeaderActions from "@/components/dashboard/DashboardHeaderActions";
import { buildDashboardSetupTasks } from "@/components/dashboard/DashboardSectionPanels";
import {
  loadDashboardSetupSummary,
  loadOrgContext,
} from "@/services/dashboard";

export default async function DashboardPage() {
  const org = await loadOrgContext();

  if (!org) {
    redirect("/settings?tab=setup");
  }

  const setupSummary = await loadDashboardSetupSummary(org.organizationId);
  const setupTasks = buildDashboardSetupTasks(setupSummary);
  const setupDoneCount = setupTasks.filter((task) => task.done).length;
  const hasIncompleteSetup = setupDoneCount < setupTasks.length;
  const hasActiveFeeds = setupSummary.activeRssCount > 0;

  return (
    <div id="top" className="space-y-6">
      <header className="easa-card-glass flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="easa-eyebrow">
            Organisation · {org.organizationName}
          </p>
          <h1 className="easa-display easa-h1-mobile-app mt-3 text-3xl leading-tight text-[var(--easa-color-text-primary)] md:text-4xl">
            Flight school operations dashboard
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--easa-color-text-muted)]">
            Track EASA updates, pending reading, sign-offs, training impact, and pipeline health from the dashboard menu.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="easa-badge is-blue">
              Setup {setupDoneCount}/{setupTasks.length}
            </span>
            <span className={`easa-badge ${hasActiveFeeds ? "is-green" : "is-orange"}`}>
              {hasActiveFeeds ? "Feeds connected" : "No active feeds"}
            </span>
            <span className={`easa-badge ${setupSummary.hasFlightbooks ? "is-green" : "is-orange"}`}>
              {setupSummary.hasFlightbooks ? "Flight books ready" : "No flight books uploaded"}
            </span>
          </div>
        </div>
        <DashboardHeaderActions showFinishSetup={hasIncompleteSetup} />
      </header>
    </div>
  );
}
