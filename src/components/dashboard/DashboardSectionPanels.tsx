import Link from "next/link";
import {
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
import RoleFocusPanel from "@/components/dashboard/RoleFocusPanel";
import ScheduleCard from "@/components/dashboard/ScheduleCard";
import SetupAssistCard from "@/components/dashboard/SetupAssistCard";
import type {
  AffectedLessonPreview,
  DashboardOperationalStats,
  DashboardRoleFocus,
  DashboardSetupSummary,
  FlightbookMappingRow,
  OrgContext,
  PipelinePreview,
  QueuePreviewItem,
  RssSourceRow,
} from "@/services/dashboard";
import { pipelineHealthLabel } from "@/services/dashboard";

export function buildDashboardSetupTasks(setupSummary: DashboardSetupSummary) {
  const hasActiveFeeds = setupSummary.activeRssCount > 0;

  return [
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
}

export function OperationsPanel({
  org,
  operationalStats,
  roleFocus,
  pipeline,
}: {
  org: OrgContext;
  operationalStats: DashboardOperationalStats;
  roleFocus: DashboardRoleFocus;
  pipeline: PipelinePreview | null;
}) {
  const pipelineHealth = pipelineHealthLabel(pipeline?.status ?? null);
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

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {statCards.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </section>

      <RoleFocusPanel org={org} focus={roleFocus} />

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
    </div>
  );
}

export function SetupPanel({ setupSummary }: { setupSummary: DashboardSetupSummary }) {
  const setupTasks = buildDashboardSetupTasks(setupSummary);
  const hasActiveFeeds = setupSummary.activeRssCount > 0;
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
    <div className="space-y-6">
      <SetupAssistCard
        hasActiveFeeds={hasActiveFeeds}
        hasFlightbooks={setupSummary.hasFlightbooks}
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
                  className="flex flex-col gap-3 rounded-[16px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4 sm:flex-row sm:items-start"
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
                  <Link className="easa-btn secondary w-full shrink-0 text-center text-xs sm:w-auto" href={task.href}>
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
            These are the main workflows available in the app.
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
    </div>
  );
}

export function ProposedUpdatesPanel({
  queuePreview,
  isEmptyWorkspace,
}: {
  queuePreview: QueuePreviewItem[];
  isEmptyWorkspace: boolean;
}) {
  return (
    <section className="easa-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Newest proposed updates</h2>
          <p className="text-sm text-[var(--easa-color-text-muted)]">
            Latest review items from <code className="text-xs">v_update_queue</code>.
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
              ? "No proposed updates yet because setup is still incomplete. Start by adding feeds and uploading flight books."
              : "No proposed updates yet. Run the RSS pipeline and review incoming regulation items once they have been analyzed."}
          </div>
        ) : (
          queuePreview.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-[14px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0 space-y-2">
                <p className="break-words text-sm font-semibold">{item.title}</p>
                <p className="break-words text-xs text-[var(--easa-color-text-muted)]">
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
              <Link className="easa-btn secondary w-full text-center md:w-auto" href={`/updates/${item.id}`}>
                View diff
              </Link>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export function RssIngestionPanel({
  rssUrls,
  lastRssAt,
}: {
  rssUrls: RssSourceRow[];
  lastRssAt: string | null;
}) {
  const lastRunLabel = lastRssAt
    ? new Date(lastRssAt).toISOString().replace("T", " ").slice(0, 16) + " UTC"
    : "No items ingested yet";

  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="easa-card min-w-0 overflow-hidden p-4 sm:p-6">
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">AI RSS ingestion</h2>
            <p className="text-sm text-[var(--easa-color-text-muted)]">
              RSS sources configured for your organisation.
            </p>
          </div>
          <Link
            className="easa-btn secondary w-full shrink-0 text-xs sm:w-auto"
            href="/settings?tab=sources"
          >
            Manage feeds
          </Link>
        </div>
        <div className="mt-4 max-h-80 min-w-0 space-y-2 overflow-y-auto text-sm">
          {rssUrls.length === 0 ? (
            <div className="min-w-0 rounded-[12px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-3 py-2 text-xs text-[var(--easa-color-text-muted)]">
              No feeds connected yet.{" "}
              <Link href="/settings?tab=sources" className="underline">
                Manage feeds →
              </Link>
            </div>
          ) : (
            rssUrls.map((feed) => (
              <div
                key={feed.url}
                className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1 rounded-[12px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-3 py-2 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${feed.active ? "bg-[var(--easa-color-accent-green)]" : "bg-[var(--easa-color-border)]"}`}
                />
                <span className="min-w-0 break-words text-xs font-medium">{feed.name}</span>
                <span className={`col-start-2 w-fit shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  feed.active
                    ? "bg-[color-mix(in_srgb,var(--easa-color-accent-green)_14%,transparent)] text-[var(--easa-color-accent-green)]"
                    : "bg-[var(--easa-color-surface-3)] text-[var(--easa-color-text-muted)]"
                } sm:col-auto`}>
                  {feed.active ? "Active" : "Inactive"}
                </span>
              </div>
            ))
          )}
        </div>
        <div className="mt-5 grid gap-2 sm:flex sm:flex-wrap sm:items-center">
          <Link className="easa-btn secondary w-full text-center sm:w-auto" href="/results">
            Collated results
          </Link>
          <Link className="easa-btn secondary w-full text-center sm:w-auto" href="/dashboard">
            Run from dashboard header
          </Link>
        </div>
        <p className="mt-3 text-xs text-[var(--easa-color-text-muted)]">
          Last RSS row stored: {lastRunLabel}
        </p>
      </div>

      <ScheduleCard />
    </section>
  );
}

export function LessonsAffectedPanel({ affectedLessons }: { affectedLessons: AffectedLessonPreview[] }) {
  return (
    <section className="easa-card min-w-0 overflow-hidden p-4 sm:p-6">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Lessons affected by recent changes</h2>
          <p className="break-words text-sm text-[var(--easa-color-text-muted)]">
            Lessons linked to manual sections touched by recent proposed updates.
          </p>
        </div>
        <Link className="easa-btn secondary w-full text-center text-sm sm:w-auto" href="/training/programmes">
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
                className="flex min-w-0 flex-col gap-3 rounded-[14px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-4 py-3 transition hover:bg-[var(--easa-color-surface-3)] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium">
                    {(lesson.lessonCode ? `${lesson.lessonCode} · ` : "") + lesson.title}
                  </p>
                  <p className="text-xs text-[var(--easa-color-text-muted)]">
                    {lesson.impactCount} linked section{lesson.impactCount !== 1 ? "s" : ""} impacted
                  </p>
                </div>
                <span className="easa-badge is-blue w-fit shrink-0">Affected</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function FlightbookMappingPanel({ mappingRows }: { mappingRows: FlightbookMappingRow[] }) {
  return (
    <section className="easa-card min-w-0 overflow-hidden p-4 sm:p-6">
      <h2 className="text-lg font-semibold">Flight book mapping</h2>
      <p className="break-words text-sm text-[var(--easa-color-text-muted)]">
        Coverage from <code className="text-xs">flightbook_mappings</code> per document.
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
            const pctMapped = Math.round((row.mappedSections / total) * 100);
            return (
              <div
                key={row.id}
                className="flex min-w-0 flex-col gap-3 rounded-[14px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium">{row.name}</p>
                  <p className="text-xs text-[var(--easa-color-text-muted)]">
                    {row.mappedSections}/{row.totalSections} sections mapped
                  </p>
                </div>
                <span
                  className={`easa-badge w-fit shrink-0 ${
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
    </section>
  );
}

export function TimeMachinePanel({ entries }: { entries: { at: string; note: string }[] }) {
  return (
    <section className="easa-card p-6">
      <h2 className="text-lg font-semibold">Time machine</h2>
      <p className="break-words text-sm text-[var(--easa-color-text-muted)]">
        Recent <code className="text-xs">flightbook_section_versions</code> entries.
      </p>
      <div className="mt-5 space-y-3">
        {entries.length === 0 ? (
          <p className="text-sm text-[var(--easa-color-text-muted)]">
            No version history until approvals or manual edits are recorded.
          </p>
        ) : (
          entries.map((entry, index) => (
            <div
              key={`${entry.at}-${entry.note}-${index}`}
              className="flex flex-col gap-2 rounded-[14px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold">{entry.at}</p>
                <p className="break-words text-xs text-[var(--easa-color-text-muted)]">
                  {entry.note}
                </p>
              </div>
              <Link className="easa-btn secondary w-full text-center md:w-auto" href="/history">
                Open history
              </Link>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export function ComplianceHighlightsPanel({ riskMix }: { riskMix: { high: number; medium: number; low: number } }) {
  const riskTotal = riskMix.high + riskMix.medium + riskMix.low;
  const pct = (n: number) => (riskTotal === 0 ? 0 : Math.round((n / riskTotal) * 100));

  return (
    <section className="easa-card p-6">
      <h2 className="text-lg font-semibold">Compliance highlights</h2>
      <p className="text-sm text-[var(--easa-color-text-muted)]">
        Risk mix from active proposed updates.
      </p>
      <div className="mt-4 space-y-4">
        {[
          ["High risk", riskMix.high, "var(--easa-color-accent-pink)"],
          ["Medium risk", riskMix.medium, "var(--easa-color-accent-orange)"],
          ["Low risk", riskMix.low, "var(--easa-color-accent-green)"],
        ].map(([label, value, color]) => (
          <div key={label}>
            <div className="flex items-center justify-between text-xs text-[var(--easa-color-text-muted)]">
              <span>{label}</span>
              <span>{pct(Number(value))}%</span>
            </div>
            <div className="mt-2 easa-progress">
              <span style={{ width: `${pct(Number(value))}%`, background: String(color) }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PipelineStatusPanel({ pipeline }: { pipeline: PipelinePreview | null }) {
  const pipelineSteps =
    pipeline?.steps && typeof pipeline.steps === "object"
      ? Object.entries(pipeline.steps).map(([step, meta]) => ({
          step,
          status:
            typeof meta === "object" && meta && "status" in meta
              ? String((meta as { status?: string }).status)
              : "—",
        }))
      : [
          { step: "RSS ingest", status: "Idle" },
          { step: "HTML / PDF pipeline", status: "Phase 1" },
          { step: "Diff worker", status: "Phase 1" },
          { step: "Relevance & patch", status: "Phase 2" },
        ];

  return (
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
  );
}

export function AdminSettingsPanel() {
  return (
    <section className="easa-card flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-lg font-semibold">Admin settings</h2>
        <p className="text-sm text-[var(--easa-color-text-muted)]">
          Manage RSS sources, scrape schedules, approval workflows, and team access from the settings workspace.
        </p>
      </div>
      <Link className="easa-btn primary" href="/settings">
        Open settings
      </Link>
    </section>
  );
}
