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
    <div id="top" className="grid gap-8 xl:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)]">
      <div className="xl:col-span-2">
        <DashboardHeaderActions />
      </div>

      <section className="easa-card xl:col-span-2 min-h-[458px] p-8">
        <div className="grid h-full gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(520px,0.92fr)]">
          <div>
            <h1 className="easa-h1-mobile-app text-[32px] font-medium leading-none text-[var(--easa-color-text-primary)]">
              Compliance Plan
            </h1>
            <p className="mt-2 text-[18px] text-[var(--easa-color-text-muted)]">
              {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>

            <div className="mt-12 flex flex-col items-center gap-7 sm:flex-row sm:items-start sm:justify-center">
              <div className="quicken-donut shrink-0" aria-hidden="true" />
              <div className="pt-11 text-center sm:text-left">
                <p className="text-[34px] font-medium leading-none">{setupDoneCount}/{setupTasks.length}</p>
                <p className="mt-3 text-[18px]">Setup complete</p>
                <p className="mt-2 text-[15px] text-[var(--easa-color-text-secondary)]">
                  {hasIncompleteSetup ? "Finish the remaining controls" : "Workspace ready"}
                </p>
              </div>
            </div>

            <div className="mx-auto mt-5 grid max-w-[340px] gap-2 text-[18px] text-[var(--easa-color-text-secondary)]">
              <div className="flex items-center gap-4"><span className="h-5 w-5 rounded-full bg-[#78c5d4]" /> Planned monitoring</div>
              <div className="flex items-center gap-4"><span className="h-5 w-5 rounded-full bg-[#6550d1]" /> Review workload</div>
              <div className="flex items-center gap-4"><span className="h-5 w-5 rounded-full bg-[#aee4bd]" /> Available controls</div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-center text-[22px] font-medium">Planned Monitoring</h2>
              <div className="flex items-center gap-8 text-[32px] text-[var(--easa-color-text-disabled)]">
                <span>‹</span>
                <span>›</span>
              </div>
            </div>

            <div className="mt-14 grid gap-3 md:grid-cols-2">
              <article className="rounded-[8px] border border-[var(--easa-color-border)] bg-white p-4 shadow-[var(--easa-shadow-1)]">
                <div className="flex items-center justify-between text-[18px]">
                  <span>Feeds</span>
                  <span className="text-[var(--easa-color-text-muted)]">↕</span>
                </div>
                <p className="mt-4 text-[20px]">{setupSummary.activeRssCount} active</p>
                <div className="quicken-progress mt-2"><span style={{ width: hasActiveFeeds ? "72%" : "12%" }} /></div>
                <p className="mt-1 text-right text-[15px]">out of monitoring plan</p>
              </article>
              <article className="rounded-[8px] border border-[var(--easa-color-border)] bg-white p-4 shadow-[var(--easa-shadow-1)]">
                <div className="flex items-center justify-between text-[18px]">
                  <span>Manuals</span>
                  <span className="text-[var(--easa-color-text-muted)]">↕</span>
                </div>
                <p className="mt-4 text-[20px]">{setupSummary.flightbookCount} uploaded</p>
                <div className="quicken-progress mt-2"><span style={{ width: setupSummary.hasFlightbooks ? "86%" : "18%" }} /></div>
                <p className="mt-1 text-right text-[15px]">out of controlled library</p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="easa-card overflow-hidden p-0">
        <div className="bg-[#eef6ff] px-8 py-6">
          <h2 className="text-[32px] font-medium leading-none">{setupDoneCount} Tasks Ready</h2>
          <p className="mt-2 text-[18px] text-[var(--easa-color-text-muted)]">from setup to today</p>
        </div>
        <div className="divide-y divide-[var(--easa-color-border)] px-8">
          {setupTasks.map((task) => (
            <div key={task.label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-4">
              <div>
                <p className="text-[22px] leading-tight">{task.label}</p>
                <p className="mt-1 text-[18px] text-[var(--easa-color-text-secondary)]">{task.done ? "Ready" : "Needs setup"}</p>
              </div>
              <div className={`text-right text-[22px] font-medium ${task.done ? "text-[var(--easa-color-accent-green)]" : ""}`}>
                {task.done ? "+Done" : "Open"}
                <p className="text-[18px] font-normal text-[var(--easa-color-text-muted)]">Now</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="easa-card p-8">
        <div className="flex items-center justify-between">
          <h2 className="text-[32px] font-medium leading-none">Schedule Settings</h2>
          <div className="flex items-center gap-8 text-[32px] text-[var(--easa-color-text-disabled)]">
            <span>‹</span>
            <span className="text-[var(--easa-color-text-primary)]">›</span>
          </div>
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          {[
            ["F", "Feeds", hasActiveFeeds ? "+Connected" : "No feeds", "is-green"],
            ["M", "Manuals", setupSummary.hasFlightbooks ? "+Ready" : "Missing", setupSummary.hasFlightbooks ? "is-green" : "is-orange"],
            ["A", "Automation", setupSummary.hasSchedule ? "+Scheduled" : "Manual", setupSummary.hasSchedule ? "is-green" : "is-orange"],
            ["R", "Role", org.role, "is-purple"],
          ].map(([letter, title, value, badge]) => (
            <article key={title} className="rounded-[8px] border border-[var(--easa-color-border)] bg-white p-3 shadow-[var(--easa-shadow-1)]">
              <div className="flex items-center justify-between border-b border-[var(--easa-color-border)] pb-3">
                <div className="flex items-center gap-3">
                  <span className={`easa-badge ${badge} h-8 w-8 justify-center p-0 text-base`}>{letter}</span>
                  <span>today</span>
                </div>
                <span className="text-[var(--easa-color-text-muted)]">⋮</span>
              </div>
              <p className="mt-4 text-[20px]">{title}</p>
              <p className={`mt-2 text-[20px] font-bold ${badge === "is-green" ? "text-[var(--easa-color-accent-green)]" : ""}`}>{value}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
