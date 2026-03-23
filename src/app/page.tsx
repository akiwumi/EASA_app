import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1200px] flex-col gap-10 p-6 lg:p-10">
        <header className="flex flex-col gap-6 rounded-[28px] bg-[var(--easa-color-surface-1)] p-6 shadow-[var(--easa-shadow-1)] lg:p-10">
          <nav className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--easa-color-brand-primary)] text-sm font-semibold text-white">
                EA
              </div>
              <span className="font-semibold">EASA Regulation Console</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[var(--easa-color-text-muted)]">
              <Link className="hover:text-[var(--easa-color-text-primary)]" href="/">
                Overview
              </Link>
              <Link
                className="hover:text-[var(--easa-color-text-primary)]"
                href="/dashboard"
              >
                Dashboard
              </Link>
              <Link
                className="hover:text-[var(--easa-color-text-primary)]"
                href="/results"
              >
                Results
              </Link>
              <Link className="easa-btn primary" href="/login">
                Login
              </Link>
            </div>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--easa-color-text-muted)]">
                Daily compliance intelligence
              </p>
              <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
                Track EASA regulation changes and keep your flight books aligned.
              </h1>
              <p className="text-sm text-[var(--easa-color-text-muted)]">
                The EASA Regulation Update Console monitors daily RSS updates, uses
                AI-assisted analysis to map changes to your manuals, and keeps a full
                audit trail with rollback controls.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link className="easa-btn primary" href="/dashboard">
                  Open dashboard
                </Link>
                <Link className="easa-btn secondary" href="/results">
                  View latest results
                </Link>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="easa-chip is-active">Daily RSS ingestion</span>
                <span className="easa-chip">Human approval required</span>
                <span className="easa-chip">Time Machine history</span>
              </div>
            </div>

            <div className="easa-card p-6">
              <h2 className="text-lg font-semibold">Sign in</h2>
              <p className="text-sm text-[var(--easa-color-text-muted)]">
                Use your compliance manager credentials to access the console.
              </p>
              <form className="mt-4 space-y-4">
                <label className="block text-xs text-[var(--easa-color-text-muted)]">
                  Email
                  <input
                    className="mt-2 w-full rounded-[12px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-3 py-2 text-sm text-[var(--easa-color-text-secondary)] outline-none"
                    placeholder="name@school.org"
                    type="email"
                  />
                </label>
                <label className="block text-xs text-[var(--easa-color-text-muted)]">
                  Password
                  <input
                    className="mt-2 w-full rounded-[12px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-3 py-2 text-sm text-[var(--easa-color-text-secondary)] outline-none"
                    placeholder="••••••••"
                    type="password"
                  />
                </label>
                <button className="easa-btn primary w-full" type="button">
                  Login
                </button>
              </form>
              <div className="mt-4 text-xs text-[var(--easa-color-text-muted)]">
                Need access? Contact your organization admin.
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-3">
          {[
            {
              title: "AI-driven relevance",
              body: "RSS updates are parsed, classified, and mapped to flightbook sections with confidence scoring.",
            },
            {
              title: "Approval workflows",
              body: "Review proposed edits, request revisions, and approve only what is safe.",
            },
            {
              title: "Time Machine rollback",
              body: "Restore any manual or section with full audit history and diff traceability.",
            },
          ].map((item) => (
            <div key={item.title} className="easa-card p-6">
              <h3 className="text-base font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-[var(--easa-color-text-muted)]">
                {item.body}
              </p>
            </div>
          ))}
        </section>

        <section className="easa-card p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Ready to start a project?</h2>
              <p className="text-sm text-[var(--easa-color-text-muted)]">
                Set up your sources, start the AI scrape, and review the first batch
                in minutes.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link className="easa-btn secondary" href="/login">
                Login
              </Link>
              <Link className="easa-btn primary" href="/dashboard">
                Start project
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
