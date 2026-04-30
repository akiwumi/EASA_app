import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bot,
  BookOpen,
  CheckCircle2,
  Clock3,
  Newspaper,
  Radio,
  ShieldCheck,
} from "lucide-react";
import StatCard from "@/components/cards/StatCard";
import AiScrapeButton from "@/components/dashboard/AiScrapeButton";
import NoFeedsWarning from "@/components/dashboard/NoFeedsWarning";
import ScheduleCard from "@/components/dashboard/ScheduleCard";
import SetupAssistCard from "@/components/dashboard/SetupAssistCard";
import {
  loadDashboardStats,
  loadDashboardSetupSummary,
  loadFlightbookMappingRows,
  loadLastRssIngestAt,
  loadOrgContext,
  loadRecentPipelineRun,
  loadRecentSectionVersions,
  loadRiskMix,
  loadRssSourceUrls,
  loadUpdateQueuePreview,
  sourcesHealthLabel,
} from "@/services/dashboard";

export default async function DashboardPage() {
  const org = await loadOrgContext();

  if (!org) {
    redirect("/settings?tab=setup");
  }

  const [
    stats,
    queuePreview,
    rssUrls,
    lastRssAt,
    mappingRows,
    riskMix,
    pipeline,
    timeMachinePreview,
    setupSummary,
  ] = await Promise.all([
    loadDashboardStats(org.organizationId),
    loadUpdateQueuePreview(org.organizationId, 5),
    loadRssSourceUrls(org.organizationId),
    loadLastRssIngestAt(org.organizationId),
    loadFlightbookMappingRows(org.organizationId),
    loadRiskMix(org.organizationId),
    loadRecentPipelineRun(org.organizationId),
    loadRecentSectionVersions(org.organizationId, 3),
    loadDashboardSetupSummary(org.organizationId),
  ]);

  const health = sourcesHealthLabel(stats.sourcesActive, stats.sourcesTotal);
  const riskTotal = riskMix.high + riskMix.medium + riskMix.low;
  const pct = (n: number) =>
    riskTotal === 0 ? 0 : Math.round((n / riskTotal) * 100);

  const statCards = [
    {
      label: "New changes",
      value: String(stats.newChanges7d),
      trend: "Last 7 days",
      tone: "blue" as const,
    },
    {
      label: "Pending approvals",
      value: String(stats.pendingApprovals),
      trend: "In update queue",
      tone: "orange" as const,
    },
    {
      label: "Approved this week",
      value: String(stats.approvedThisWeek),
      trend: "UTC week",
      tone: "green" as const,
    },
    {
      label: "Sources healthy",
      value: health.value,
      trend: health.trend,
      tone: health.tone,
    },
  ];

  const pipelineSteps =
    pipeline?.steps && typeof pipeline.steps === "object"
      ? Object.entries(pipeline.steps).map(([step, meta]) => ({
          step,
          status:
            typeof meta === "object" && meta && "status" in meta
              ? String((meta as { status?: string }).status)
              : "—",
          time: pipeline.startedAt ?? "—",
        }))
      : [
          { step: "RSS ingest", status: "Idle", time: "—" },
          { step: "HTML / PDF pipeline", status: "Phase 1", time: "—" },
          { step: "Diff worker", status: "Phase 1", time: "—" },
          { step: "Relevance & patch", status: "Phase 2", time: "—" },
        ];

  const lastRunLabel = lastRssAt
    ? new Date(lastRssAt).toISOString().replace("T", " ").slice(0, 16) + " UTC"
    : "No items ingested yet";

  const hasActiveFeeds = rssUrls.some((f) => f.active);
  const setupTasks = [
    {
      label: "RSS feeds connected",
      done: hasActiveFeeds,
      hint: hasActiveFeeds
        ? `${rssUrls.filter((feed) => feed.active).length} active feed(s) ready to ingest.`
        : "Add or restore EASA feeds so the app can fetch regulation updates to compare with your manuals.",
      href: "/settings?tab=sources",
      action: "Manage feeds",
      icon: Radio,
    },
    {
      label: "AI analysis configured",
      done: setupSummary.hasAiConfig && setupSummary.hasAiKey,
      hint:
        setupSummary.hasAiConfig && setupSummary.hasAiKey
          ? "Provider and API key are saved."
          : "Save your provider, model, and API key so the app can draft update text.",
      href: "/settings?tab=ai",
      action: "Open AI settings",
      icon: Bot,
    },
    {
      label: "Automation schedule saved",
      done: setupSummary.hasSchedule,
      hint: setupSummary.hasSchedule
        ? "The pipeline has a saved schedule."
        : "Choose when the pipeline should run and whether notifications are enabled.",
      href: "/settings?tab=automation",
      action: "Open automation",
      icon: Clock3,
    },
    {
      label: "Flight books imported",
      done: setupSummary.hasFlightbooks,
      hint: setupSummary.hasFlightbooks
        ? `${setupSummary.flightbookCount} flight book(s) available for comparison.`
        : "Upload or import flight books so the app has manuals to compare against EASA changes.",
      href: "/flightbooks/upload",
      action: "Upload flight books",
      icon: BookOpen,
    },
  ];
  const setupDoneCount = setupTasks.filter((task) => task.done).length;
  const isEmptyWorkspace =
    queuePreview.length === 0 &&
    mappingRows.length === 0 &&
    !lastRssAt &&
    !setupSummary.hasFlightbooks;
  const featureCards = [
    {
      title: "Regulation monitoring",
      body: hasActiveFeeds
        ? "Your EASA sources are connected and ready for manual or scheduled ingest runs."
        : "Connect EASA feeds first so monitoring can begin.",
      href: "/settings?tab=sources",
      cta: hasActiveFeeds ? "Review feeds" : "Connect feeds",
      icon: Newspaper,
    },
    {
      title: "Manual comparison",
      body: setupSummary.hasFlightbooks
        ? "Flight books are available for automatic comparison, retrieval, and update drafting."
        : "Bring in your manuals so the app can compare them against EASA changes and draft updates.",
      href: "/flightbooks",
      cta: setupSummary.hasFlightbooks ? "Browse flight books" : "Import manuals",
      icon: BookOpen,
    },
    {
      title: "Human approval",
      body:
        "Every proposed amendment stays in review until someone approves, rejects, or sends it back.",
      href: "/updates",
      cta: "Open queue",
      icon: ShieldCheck,
    },
  ];

  return (
    <div id="top" className="space-y-6">
      {!hasActiveFeeds && <NoFeedsWarning />}
      <header className="flex flex-col gap-4 rounded-[28px] bg-[var(--easa-color-surface-1)] p-6 shadow-[var(--easa-shadow-1)] md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs text-[var(--easa-color-text-muted)]">
            Organisation · {org.organizationName}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Regulation update dashboard
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--easa-color-text-muted)]">
            Track EASA updates, compare them with your flight books, and keep a
            clear approval history for every accepted manual change.
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
        <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
          <Link className="easa-btn primary whitespace-nowrap text-sm" href="/settings?tab=setup">
            Finish setup
          </Link>
          <AiScrapeButton compact />
          <Link className="easa-btn secondary whitespace-nowrap text-sm" href="/results">
            View AI results
          </Link>
          <Link className="easa-btn secondary whitespace-nowrap text-sm" href="/updates">
            Open update queue
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </section>

      <SetupAssistCard
        hasActiveFeeds={hasActiveFeeds}
        hasFlightbooks={setupSummary.hasFlightbooks}
        hasAiConfig={setupSummary.hasAiConfig && setupSummary.hasAiKey}
        hasSchedule={setupSummary.hasSchedule}
      />

      <section className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <div className="easa-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Start here</h2>
              <p className="text-sm text-[var(--easa-color-text-muted)]">
                This dashboard walks through the full workflow: collect EASA
                updates, compare them to your flight books, review suggestions,
                then approve changes with an audit trail.
              </p>
            </div>
            <Link className="easa-btn secondary text-sm" href="/settings?tab=setup">
              Open setup guide
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {setupTasks.map((task) => {
              const Icon = task.icon;
              return (
                <div
                  key={task.label}
                  className="flex items-start gap-3 rounded-[16px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4"
                >
                  <div className="mt-0.5 shrink-0">
                    {task.done ? (
                      <CheckCircle2
                        size={18}
                        className="text-[var(--easa-color-accent-green)]"
                      />
                    ) : (
                      <Icon
                        size={18}
                        className="text-[var(--easa-color-text-muted)]"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{task.label}</p>
                    <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
                      {task.hint}
                    </p>
                  </div>
                  <Link className="easa-btn secondary shrink-0 text-xs" href={task.href}>
                    {task.action}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        <div className="easa-card p-6">
          <h2 className="text-lg font-semibold">What this app does</h2>
          <p className="text-sm text-[var(--easa-color-text-muted)]">
            The dashboard should explain the features even before your project has
            real data. These are the main workflows available in the app.
          </p>
          <div className="mt-5 space-y-3">
            {featureCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="rounded-[16px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[var(--easa-color-surface-1)]">
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{card.title}</p>
                      <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
                        {card.body}
                      </p>
                      <Link className="mt-3 inline-flex text-xs underline" href={card.href}>
                        {card.cta}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div id="queue" className="easa-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Update review queue</h2>
              <p className="text-sm text-[var(--easa-color-text-muted)]">
                Top pending proposed updates from{" "}
                <code className="text-xs">v_update_queue</code>.
              </p>
            </div>
            <Link className="easa-btn secondary text-sm" href="/updates">
              View all
            </Link>
          </div>
          <div className="mt-6 space-y-4">
            {queuePreview.length === 0 ? (
              <div className="rounded-[14px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4 text-sm text-[var(--easa-color-text-muted)]">
                {isEmptyWorkspace
                  ? "No proposed updates yet because setup is still incomplete. Start by adding feeds, saving AI settings, and uploading flight books."
                  : "No proposed updates yet. Run the RSS pipeline and review incoming regulation items once they have been analyzed."}
              </div>
            ) : (
              queuePreview.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-[14px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-xs text-[var(--easa-color-text-muted)]">
                      {item.summary}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`easa-badge ${
                          item.risk === "High"
                            ? "is-red"
                            : item.risk === "Medium"
                              ? "is-orange"
                              : "is-green"
                        }`}
                      >
                        {item.risk} risk
                      </span>
                      <span className="easa-badge is-blue">
                        Confidence {item.confidence}
                      </span>
                      <span className="easa-badge is-orange">{item.status}</span>
                      <span className="easa-badge is-purple">
                        {item.classification}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      className="easa-btn secondary"
                      href={`/updates/${item.id}`}
                    >
                      View diff
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="easa-card p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">AI RSS ingestion</h2>
                <p className="text-sm text-[var(--easa-color-text-muted)]">
                  RSS sources configured for your organisation.
                </p>
              </div>
              <Link
                className="easa-btn secondary shrink-0 text-xs"
                href="/settings?tab=sources"
              >
                Manage feeds
              </Link>
            </div>
            <div className="mt-4 max-h-48 space-y-2 overflow-y-auto text-sm">
            {rssUrls.length === 0 ? (
              <div className="rounded-[12px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-3 py-2 text-xs text-[var(--easa-color-text-muted)]">
                No feeds connected yet.{" "}
                <Link href="/settings?tab=sources" className="underline">
                  Manage feeds →
                </Link>
                </div>
              ) : (
                rssUrls.map((feed) => (
                  <div
                    key={feed.url}
                    className="flex items-center gap-2 rounded-[12px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-3 py-2"
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${feed.active ? "bg-[var(--easa-color-accent-green)]" : "bg-[var(--easa-color-border)]"}`}
                    />
                    <span className="min-w-0 truncate text-xs">{feed.url}</span>
                  </div>
                ))
              )}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Link className="easa-btn secondary" href="/results">
                Collated results
              </Link>
              <Link className="easa-btn secondary" href="#top">
                Run from dashboard header
              </Link>
            </div>
            <p className="mt-3 text-xs text-[var(--easa-color-text-muted)]">
              Last RSS row stored: {lastRunLabel}
            </p>
          </div>

          <ScheduleCard />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div id="diff" className="easa-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Latest pending update</h2>
              <p className="text-sm text-[var(--easa-color-text-muted)]">
                Most recent item in the review queue.
              </p>
            </div>
            {queuePreview.length > 0 && (
              <Link className="easa-btn secondary text-sm" href={`/updates/${queuePreview[0].id}`}>
                Open diff viewer
              </Link>
            )}
          </div>
          <div className="mt-5">
            {queuePreview.length === 0 ? (
              <div className="rounded-[14px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4 text-sm text-[var(--easa-color-text-muted)]">
                No pending updates yet. Once feeds are connected and analysis runs,
                the latest proposal will appear here with risk, confidence, and diff context.
              </div>
            ) : (
              <div className="rounded-[14px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4 space-y-3">
                <p className="text-sm font-semibold">{queuePreview[0].title}</p>
                <p className="text-sm text-[var(--easa-color-text-secondary)] leading-relaxed">
                  {queuePreview[0].summary}
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className={`easa-badge ${queuePreview[0].risk === "High" ? "is-red" : queuePreview[0].risk === "Medium" ? "is-orange" : "is-green"}`}>
                    {queuePreview[0].risk} risk
                  </span>
                  <span className="easa-badge is-blue">
                    {queuePreview[0].confidence} confidence
                  </span>
                  <span className="easa-badge is-purple capitalize">
                    {queuePreview[0].classification.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div id="flightbooks" className="easa-card p-6">
          <h2 className="text-lg font-semibold">Flight book mapping</h2>
          <p className="text-sm text-[var(--easa-color-text-muted)]">
            Coverage from <code className="text-xs">flightbook_mappings</code> per
            document.
          </p>
          <div className="mt-4 space-y-3">
            {mappingRows.length === 0 ? (
              <p className="text-sm text-[var(--easa-color-text-muted)]">
                No flight books uploaded yet. Upload manuals from the app or run{" "}
                <code className="text-xs">scripts/import-flightbooks.mjs</code>{" "}
                if you are doing a bulk import.
              </p>
            ) : (
              mappingRows.map((row) => {
                const total = row.totalSections || 1;
                const pctMapped = Math.round(
                  (row.mappedSections / total) * 100,
                );
                return (
                  <div
                    key={row.id}
                    className="flex items-center justify-between rounded-[14px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-4 py-3"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="truncate text-sm font-medium">{row.name}</p>
                      <p className="text-xs text-[var(--easa-color-text-muted)]">
                        {row.mappedSections}/{row.totalSections} sections mapped
                      </p>
                    </div>
                    <span
                      className={`easa-badge shrink-0 ${
                        pctMapped >= 80
                          ? "is-green"
                          : pctMapped >= 40
                            ? "is-orange"
                            : "is-red"
                      }`}
                    >
                      {pctMapped}%
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div id="time-machine" className="easa-card p-6">
          <h2 className="text-lg font-semibold">Time machine</h2>
          <p className="text-sm text-[var(--easa-color-text-muted)]">
            Recent <code className="text-xs">flightbook_section_versions</code>{" "}
            entries.
          </p>
          <div className="mt-5 space-y-3">
            {timeMachinePreview.length === 0 ? (
              <p className="text-sm text-[var(--easa-color-text-muted)]">
                No version history until approvals or manual edits are recorded.
              </p>
            ) : (
              timeMachinePreview.map((entry) => (
                <div
                  key={entry.at + entry.note}
                  className="flex flex-col gap-2 rounded-[14px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold">{entry.at}</p>
                    <p className="text-xs text-[var(--easa-color-text-muted)]">
                      {entry.note}
                    </p>
                  </div>
                  <Link className="easa-btn secondary" href="/history">
                    Open history
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="easa-card p-6">
          <h2 className="text-lg font-semibold">Compliance highlights</h2>
          <p className="text-sm text-[var(--easa-color-text-muted)]">
            Risk mix from active proposed updates.
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs text-[var(--easa-color-text-muted)]">
                <span>High risk</span>
                <span>{pct(riskMix.high)}%</span>
              </div>
              <div className="mt-2 easa-progress">
                <span
                  style={{
                    width: `${pct(riskMix.high)}%`,
                    background: "var(--easa-color-accent-pink)",
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-[var(--easa-color-text-muted)]">
                <span>Medium risk</span>
                <span>{pct(riskMix.medium)}%</span>
              </div>
              <div className="mt-2 easa-progress">
                <span
                  style={{
                    width: `${pct(riskMix.medium)}%`,
                    background: "var(--easa-color-accent-orange)",
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-[var(--easa-color-text-muted)]">
                <span>Low risk</span>
                <span>{pct(riskMix.low)}%</span>
              </div>
              <div className="mt-2 easa-progress">
                <span
                  style={{
                    width: `${pct(riskMix.low)}%`,
                    background: "var(--easa-color-accent-green)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="easa-card p-6">
        <h2 className="text-lg font-semibold">Pipeline status</h2>
        <p className="text-sm text-[var(--easa-color-text-muted)]">
          Latest row in <code className="text-xs">pipeline_runs</code>
          {pipeline
            ? ` · ${pipeline.status} (${pipeline.startedAt ?? "—"})`
            : " · none yet"}
        </p>
        <div className="mt-4 space-y-3">
          {pipelineSteps.map((row) => (
            <div
              key={row.step}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-4 py-3 text-sm"
            >
              <span className="font-medium">{row.step}</span>
              <span className="text-xs text-[var(--easa-color-text-muted)]">
                {row.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section
        id="settings"
        className="easa-card flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h2 className="text-lg font-semibold">Admin settings</h2>
          <p className="text-sm text-[var(--easa-color-text-muted)]">
            Manage RSS sources, scrape schedules, approval workflows, and team
            access from the settings workspace.
          </p>
        </div>
        <Link className="easa-btn primary" href="/settings">
          Open settings
        </Link>
      </section>
    </div>
  );
}
