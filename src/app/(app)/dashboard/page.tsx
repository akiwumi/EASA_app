import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bot,
  BookOpen,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Newspaper,
  Radio,
  ShieldCheck,
  Siren,
} from "lucide-react";
import StatCard from "@/components/cards/StatCard";
import DashboardHeaderActions from "@/components/dashboard/DashboardHeaderActions";
import RoleFocusPanel from "@/components/dashboard/RoleFocusPanel";
import ScheduleCard from "@/components/dashboard/ScheduleCard";
import SetupAssistCard from "@/components/dashboard/SetupAssistCard";
import {
  loadDashboardOperationalStats,
  loadDashboardRoleFocus,
  loadDashboardSetupSummary,
  loadAffectedLessonsPreview,
  loadFlightbookMappingRows,
  loadLastRssIngestAt,
  loadOrgContext,
  pipelineHealthLabel,
  loadRecentPipelineRun,
  loadRecentSectionVersions,
  loadRiskMix,
  loadRssSourceUrls,
  loadUpdateQueuePreview,
} from "@/services/dashboard";

export default async function DashboardPage() {
  const org = await loadOrgContext();

  if (!org) {
    redirect("/settings?tab=setup");
  }

  const [
    operationalStats,
    roleFocus,
    queuePreview,
    affectedLessons,
    rssUrls,
    lastRssAt,
    mappingRows,
    riskMix,
    pipeline,
    timeMachinePreview,
    setupSummary,
  ] = await Promise.all([
    loadDashboardOperationalStats(org.organizationId, org.userId),
    loadDashboardRoleFocus(org.organizationId, org.userId),
    loadUpdateQueuePreview(org.organizationId, 5),
    loadAffectedLessonsPreview(org.organizationId, 5),
    loadRssSourceUrls(org.organizationId),
    loadLastRssIngestAt(org.organizationId),
    loadFlightbookMappingRows(org.organizationId),
    loadRiskMix(org.organizationId),
    loadRecentPipelineRun(org.organizationId),
    loadRecentSectionVersions(org.organizationId, 3),
    loadDashboardSetupSummary(org.organizationId),
  ]);

  const pipelineHealth = pipelineHealthLabel(pipeline?.status ?? null);
  const riskTotal = riskMix.high + riskMix.medium + riskMix.low;
  const pct = (n: number) =>
    riskTotal === 0 ? 0 : Math.round((n / riskTotal) * 100);

  const statCards = [
    {
      label: "Unread critical updates",
      value: String(operationalStats.unreadCriticalUpdates),
      trend: "Needs review",
      tone: operationalStats.unreadCriticalUpdates > 0 ? ("red" as const) : ("green" as const),
    },
    {
      label: "Students pending acknowledgement",
      value: String(operationalStats.studentsPendingAcknowledgement),
      trend: "Reading still open",
      tone: "orange" as const,
    },
    {
      label: "Instructors pending sign-off",
      value: String(operationalStats.instructorsPendingSignoff),
      trend: "Training items waiting",
      tone: operationalStats.instructorsPendingSignoff > 0 ? ("orange" as const) : ("green" as const),
    },
    {
      label: "Lessons affected by recent changes",
      value: String(operationalStats.lessonsAffectedByRecentChanges),
      trend: "Last 14 days",
      tone: operationalStats.lessonsAffectedByRecentChanges > 0 ? ("blue" as const) : ("green" as const),
    },
    {
      label: "Latest pipeline run health",
      value: pipelineHealth.value,
      trend: pipelineHealth.trend,
      tone: pipelineHealth.tone,
    },
    {
      label: "Newest proposed updates",
      value: String(operationalStats.newestProposedUpdates),
      trend: "Created this week",
      tone: operationalStats.newestProposedUpdates > 0 ? ("blue" as const) : ("green" as const),
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

  const hasActiveFeeds = setupSummary.activeRssCount > 0;
  const setupTasks = [
    {
      label: "RSS feeds connected",
      done: hasActiveFeeds,
      hint: hasActiveFeeds
        ? `${setupSummary.activeRssCount} active feed(s) ready to ingest.`
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
      <header className="easa-card-glass flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="easa-eyebrow">
            Organisation · {org.organizationName}
          </p>
          <h1 className="easa-display easa-h1-mobile-app mt-3 text-3xl leading-tight text-[var(--easa-color-text-primary)] md:text-4xl">
            Flight school operations dashboard
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--easa-color-text-muted)]">
            Track EASA updates, pending reading, sign-offs, training impact, and pipeline health from one place.
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
        <DashboardHeaderActions />
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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

      <RoleFocusPanel org={org} focus={roleFocus} />

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

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="easa-card p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--easa-color-accent-pink)_14%,transparent)] text-[var(--easa-color-accent-pink)]">
              <Siren size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Critical update queue</h2>
              <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
                {operationalStats.unreadCriticalUpdates} unread notification{operationalStats.unreadCriticalUpdates !== 1 ? "s" : ""} still need attention.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="easa-btn secondary text-sm" href="/notifications">
              Open notifications
            </Link>
            <Link className="easa-btn secondary text-sm" href="/updates">
              Review updates
            </Link>
          </div>
        </div>

        <div className="easa-card p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--easa-color-accent-orange)_14%,transparent)] text-[var(--easa-color-accent-orange)]">
              <GraduationCap size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Reading acknowledgements</h2>
              <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
                {operationalStats.studentsPendingAcknowledgement} student acknowledgement{operationalStats.studentsPendingAcknowledgement !== 1 ? "s are" : " is"} still pending.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="easa-btn secondary text-sm" href="/training/acknowledgements">
              Open acknowledgements
            </Link>
            <Link className="easa-btn secondary text-sm" href="/training/assignments">
              Manage assignments
            </Link>
          </div>
        </div>

        <div className="easa-card p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--easa-color-accent-blue)_14%,transparent)] text-[var(--easa-color-accent-blue)]">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Instructor sign-offs</h2>
              <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
                {operationalStats.instructorsPendingSignoff} sign-off{operationalStats.instructorsPendingSignoff !== 1 ? "s are" : " is"} waiting to be completed.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="easa-btn secondary text-sm" href="/training/signoffs">
              Open sign-offs
            </Link>
            <Link className="easa-btn secondary text-sm" href="/training/programmes">
              Training programmes
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div id="queue" className="easa-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Newest proposed updates</h2>
              <p className="text-sm text-[var(--easa-color-text-muted)]">
                Latest review items from{" "}
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
              <h2 className="text-lg font-semibold">Lessons affected by recent changes</h2>
              <p className="text-sm text-[var(--easa-color-text-muted)]">
                Lessons linked to manual sections touched by recent proposed updates.
              </p>
            </div>
            <Link className="easa-btn secondary text-sm" href="/training/programmes">
              Open training
            </Link>
          </div>
          <div className="mt-5">
            {affectedLessons.length === 0 ? (
              <div className="rounded-[14px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4 text-sm text-[var(--easa-color-text-muted)]">
                No linked lessons are affected right now, or the training and manual link tables have not been populated yet.
              </div>
            ) : (
              <div className="space-y-3">
                {affectedLessons.map((lesson) => (
                  <Link
                    key={lesson.lessonId}
                    href={`/training/lessons/${lesson.lessonId}`}
                    className="flex items-center justify-between rounded-[14px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-4 py-3 transition hover:bg-[var(--easa-color-surface-3)]"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="truncate text-sm font-medium">
                        {(lesson.lessonCode ? `${lesson.lessonCode} · ` : "") + lesson.title}
                      </p>
                      <p className="text-xs text-[var(--easa-color-text-muted)]">
                        {lesson.impactCount} linked section{lesson.impactCount !== 1 ? "s" : ""} impacted
                      </p>
                    </div>
                    <span className="easa-badge is-blue shrink-0">Affected</span>
                  </Link>
                ))}
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
              timeMachinePreview.map((entry, index) => (
                <div
                  key={`${entry.at}-${entry.note}-${index}`}
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
