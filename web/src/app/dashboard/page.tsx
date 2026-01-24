import Link from "next/link";
import { EASA_RSS_FEEDS } from "@/lib/ai-scraper";
import AiScrapeButton from "@/app/dashboard/AiScrapeButton";
import ScheduleCard from "@/app/dashboard/ScheduleCard";

export default function DashboardPage() {
  const navItems = [
    { label: "Dashboard", href: "/dashboard", active: true },
    { label: "Update Queue", href: "/dashboard#queue", active: false },
    { label: "Diff Viewer", href: "/dashboard#diff", active: false },
    { label: "Flight Books", href: "/dashboard#flightbooks", active: false },
    { label: "Time Machine", href: "/dashboard#time-machine", active: false },
    { label: "Results", href: "/results", active: false },
    { label: "Settings", href: "/dashboard#settings", active: false },
  ];

  const stats = [
    { label: "New changes", value: "18", trend: "+6 today", tone: "blue" },
    { label: "Pending approvals", value: "7", trend: "2 high risk", tone: "orange" },
    { label: "Approved this week", value: "31", trend: "93% auto match", tone: "green" },
    { label: "Sources healthy", value: "9/10", trend: "1 scrape error", tone: "red" },
  ];

  const updateQueue = [
    {
      title: "Aircrew licensing — CPL medical validity",
      risk: "High",
      confidence: "92%",
      status: "Needs review",
      summary: "Changed renewal window for medical certificates.",
    },
    {
      title: "OPS Part-NCC — fuel reserve calculation",
      risk: "Medium",
      confidence: "78%",
      status: "Ready",
      summary: "Updated formula for alternate planning.",
    },
    {
      title: "Training manual — night ops syllabus",
      risk: "Low",
      confidence: "88%",
      status: "Ready",
      summary: "Clarified instructor sign-off requirements.",
    },
  ];

  const timeMachineEntries = [
    {
      date: "Jan 22, 2026",
      items: "5 sections",
      note: "Approved batch: Aircrew licensing",
    },
    {
      date: "Jan 19, 2026",
      items: "2 sections",
      note: "Rollback executed for SOP 4.2",
    },
    {
      date: "Jan 17, 2026",
      items: "7 sections",
      note: "Approved batch: Part-NCO updates",
    },
  ];

  const flightbookMappings = [
    { section: "Training Manual 3.4.2", status: "Mapped", tone: "green" },
    { section: "Operations SOP 4.2", status: "Review", tone: "orange" },
    { section: "Checklists 2.1.1", status: "Mapped", tone: "green" },
    { section: "Safety SMS 1.6", status: "Unlinked", tone: "red" },
  ];

  const pipelineSteps = [
    { step: "Fetch sources", time: "06:10 UTC", status: "Complete" },
    { step: "Snapshot & parse", time: "06:16 UTC", status: "Complete" },
    { step: "Diff detection", time: "06:21 UTC", status: "Complete" },
    { step: "Relevance & patch", time: "06:26 UTC", status: "Running" },
  ];

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1400px] gap-6 p-6 lg:p-8">
        <aside className="hidden w-56 flex-col gap-6 rounded-[28px] bg-[var(--easa-color-surface-1)] p-6 shadow-[var(--easa-shadow-1)] lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--easa-color-brand-primary)] text-sm font-semibold text-white">
              EA
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--easa-color-text-primary)]">
                EASA Console
              </p>
              <p className="text-xs text-[var(--easa-color-text-muted)]">
                Flight School Ops
              </p>
            </div>
          </div>
          <nav className="flex flex-col gap-2 text-sm font-medium">
            {navItems.map((item) => (
              <Link
                key={item.label}
                className={`flex items-center justify-between rounded-full px-4 py-2 transition ${
                  item.active
                    ? "bg-[var(--easa-color-brand-primary)] text-white"
                    : "text-[var(--easa-color-text-secondary)] hover:bg-[var(--easa-color-surface-2)]"
                }`}
                href={item.href}
              >
                <span>{item.label}</span>
                <span className="text-xs opacity-70">›</span>
              </Link>
            ))}
          </nav>
          <div className="mt-auto easa-card p-4">
            <p className="text-xs text-[var(--easa-color-text-muted)]">Next ingestion</p>
            <p className="mt-2 text-lg font-semibold">In 4h 12m</p>
            <p className="mt-2 text-xs text-[var(--easa-color-text-muted)]">
              Daily job at 06:00 UTC
            </p>
          </div>
        </aside>

        <main className="flex-1 space-y-6">
          <header className="flex flex-col gap-4 rounded-[28px] bg-[var(--easa-color-surface-1)] p-6 shadow-[var(--easa-shadow-1)] md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs text-[var(--easa-color-text-muted)]">
                Organization · Horizon Flight Academy
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                Regulation Update Dashboard
              </h1>
              <p className="mt-2 max-w-xl text-sm text-[var(--easa-color-text-muted)]">
                Monitor daily EASA updates, review diffs, and approve changes to your
                flight books with full audit history and rollback control.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="easa-input w-full md:w-64">
                <span className="text-xs text-[var(--easa-color-text-muted)]">🔎</span>
                <input
                  className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--easa-color-text-muted)]"
                  placeholder="Search updates, docs, sections"
                />
              </div>
              <button className="easa-btn secondary" type="button">
                Export report
              </button>
              <Link className="easa-btn secondary" href="/results">
                View results
              </Link>
              <button className="easa-btn primary" type="button">
                Start project
              </button>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="easa-card p-5">
                <p className="text-xs text-[var(--easa-color-text-muted)]">
                  {stat.label}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-2xl font-semibold">{stat.value}</span>
                  <span
                    className={`easa-badge ${
                      stat.tone === "green"
                        ? "is-green"
                        : stat.tone === "orange"
                          ? "is-orange"
                          : stat.tone === "red"
                            ? "is-red"
                            : "is-blue"
                    }`}
                  >
                    {stat.trend}
                  </span>
                </div>
              </div>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
            <div id="queue" className="easa-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Update Review Queue</h2>
                  <p className="text-sm text-[var(--easa-color-text-muted)]">
                    Latest changes that need review and approval.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="easa-chip is-active">All</span>
                  <span className="easa-chip">High risk</span>
                  <span className="easa-chip">Awaiting edits</span>
                  <span className="easa-chip">Ready</span>
                </div>
              </div>
              <div className="mt-6 space-y-4">
                {updateQueue.map((item) => (
                  <div
                    key={item.title}
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
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="easa-btn secondary" type="button">
                        View diff
                      </button>
                      <button className="easa-btn primary" type="button">
                        Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="easa-card p-6">
                <h2 className="text-lg font-semibold">AI RSS Ingestion</h2>
                <p className="text-sm text-[var(--easa-color-text-muted)]">
                  AI-assisted scraping of the configured EASA RSS feeds.
                </p>
                <div className="mt-4 space-y-3 text-sm">
                  {EASA_RSS_FEEDS.map((feed) => (
                    <div
                      key={feed}
                      className="rounded-[12px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-3 py-2"
                    >
                      {feed}
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <AiScrapeButton />
                  <Link className="easa-btn secondary" href="/results">
                    View collated results
                  </Link>
                </div>
                <p className="mt-3 text-xs text-[var(--easa-color-text-muted)]">
                  Last run: 2026-01-24 06:26 UTC · 4 updates detected
                </p>
              </div>

              <ScheduleCard />
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div id="diff" className="easa-card p-6">
              <h2 className="text-lg font-semibold">Diff Viewer Preview</h2>
              <p className="text-sm text-[var(--easa-color-text-muted)]">
                Inline vs side-by-side views for rapid review.
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-[14px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4">
                  <p className="text-xs text-[var(--easa-color-text-muted)]">
                    EASA Section 3.2.1 (Before)
                  </p>
                  <p className="mt-3 text-sm text-[var(--easa-color-text-secondary)]">
                    Fuel reserves shall include contingency fuel based on the route
                    flown and known meteorological conditions.
                  </p>
                </div>
                <div className="rounded-[14px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4">
                  <p className="text-xs text-[var(--easa-color-text-muted)]">
                    EASA Section 3.2.1 (After)
                  </p>
                  <p className="mt-3 text-sm text-[var(--easa-color-text-secondary)]">
                    Fuel reserves shall include{" "}
                    <span className="font-semibold text-[var(--easa-color-accent-blue)]">
                      additional
                    </span>{" "}
                    contingency fuel based on the route,{" "}
                    <span className="font-semibold text-[var(--easa-color-accent-green)]">
                      alternate planning
                    </span>
                    , and known meteorological conditions.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <span className="easa-chip is-active">Inline</span>
                <span className="easa-chip">Side-by-side</span>
                <span className="easa-chip">Jump to clause</span>
              </div>
            </div>

            <div id="flightbooks" className="easa-card p-6">
              <h2 className="text-lg font-semibold">Flight Book Mapping</h2>
              <p className="text-sm text-[var(--easa-color-text-muted)]">
                Link EASA clauses to internal manuals and SOP sections.
              </p>
              <div className="mt-4 space-y-3">
                {flightbookMappings.map((mapping) => (
                  <div
                    key={mapping.section}
                    className="flex items-center justify-between rounded-[14px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{mapping.section}</p>
                      <p className="text-xs text-[var(--easa-color-text-muted)]">
                        Mapped to EASA AMC/GM items
                      </p>
                    </div>
                    <span
                      className={`easa-badge ${
                        mapping.tone === "green"
                          ? "is-green"
                          : mapping.tone === "orange"
                            ? "is-orange"
                            : "is-red"
                      }`}
                    >
                      {mapping.status}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-3 text-xs text-[var(--easa-color-text-muted)]">
                <span>Auto-link coverage</span>
                <div className="flex-1 easa-progress">
                  <span
                    style={{
                      width: "68%",
                      background: "var(--easa-color-accent-purple)",
                    }}
                  />
                </div>
                <span className="text-[var(--easa-color-text-secondary)]">68%</span>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div id="time-machine" className="easa-card p-6">
              <h2 className="text-lg font-semibold">Time Machine</h2>
              <p className="text-sm text-[var(--easa-color-text-muted)]">
                Browse history snapshots and restore prior versions.
              </p>
              <div className="mt-5 space-y-3">
                {timeMachineEntries.map((entry) => (
                  <div
                    key={entry.date}
                    className="flex flex-col gap-3 rounded-[14px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold">{entry.date}</p>
                      <p className="text-xs text-[var(--easa-color-text-muted)]">
                        {entry.items} · {entry.note}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button className="easa-btn secondary" type="button">
                        Compare
                      </button>
                      <button className="easa-btn primary" type="button">
                        Restore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="easa-card p-6">
              <h2 className="text-lg font-semibold">Compliance Highlights</h2>
              <p className="text-sm text-[var(--easa-color-text-muted)]">
                Risk and confidence overview across all sources.
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs text-[var(--easa-color-text-muted)]">
                    <span>High risk</span>
                    <span>22%</span>
                  </div>
                  <div className="mt-2 easa-progress">
                    <span
                      style={{
                        width: "22%",
                        background: "var(--easa-color-accent-pink)",
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs text-[var(--easa-color-text-muted)]">
                    <span>Medium risk</span>
                    <span>41%</span>
                  </div>
                  <div className="mt-2 easa-progress">
                    <span
                      style={{
                        width: "41%",
                        background: "var(--easa-color-accent-orange)",
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs text-[var(--easa-color-text-muted)]">
                    <span>Low risk</span>
                    <span>37%</span>
                  </div>
                  <div className="mt-2 easa-progress">
                    <span
                      style={{
                        width: "37%",
                        background: "var(--easa-color-accent-green)",
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-6 rounded-[14px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4">
                <p className="text-xs text-[var(--easa-color-text-muted)]">
                  Notifications
                </p>
                <p className="mt-2 text-sm font-semibold">
                  3 reviewers pending for high-risk batch
                </p>
                <button className="mt-3 easa-btn primary" type="button">
                  Send reminders
                </button>
              </div>
            </div>
          </section>

          <section
            id="settings"
            className="easa-card flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <h2 className="text-lg font-semibold">Admin Settings Snapshot</h2>
              <p className="text-sm text-[var(--easa-color-text-muted)]">
                Roles, sources, and risk thresholds are configured to require
                approval for all updates.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="easa-btn secondary" type="button">
                Manage sources
              </button>
              <button className="easa-btn secondary" type="button">
                Roles & access
              </button>
              <button className="easa-btn primary" type="button">
                Open settings
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
