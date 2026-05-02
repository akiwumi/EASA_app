import Link from "next/link";

const NAV_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/pricing", label: "Pricing" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/book-demo", label: "Book demo" },
] as const;

export default function MarketingShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ffffff_0%,#eef1f6_42%,#f6f7fa_100%)]">
      <div className="mx-auto flex min-h-screen max-w-[1240px] flex-col gap-10 p-6 lg:p-10">
        <header className="rounded-[32px] border border-[var(--easa-color-border)] bg-[color-mix(in_srgb,var(--easa-color-surface-1)_86%,transparent)] p-5 shadow-[var(--easa-shadow-1)] backdrop-blur-md lg:p-6">
          <nav className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--easa-color-brand-primary)] text-sm font-semibold text-white">
                EA
              </div>
              <div>
                <p className="text-sm font-semibold">EASA_app</p>
                <p className="text-xs text-[var(--easa-color-text-muted)]">
                  Flight school training and compliance
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-3 py-2 text-[var(--easa-color-text-muted)] transition hover:bg-[var(--easa-color-surface-2)] hover:text-[var(--easa-color-text-primary)]"
                >
                  {item.label}
                </Link>
              ))}
              <Link className="easa-btn secondary" href="/login">
                Login
              </Link>
              <Link className="easa-btn primary" href="/book-demo">
                Book a demo
              </Link>
            </div>
          </nav>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="rounded-[28px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] p-6 shadow-[var(--easa-shadow-1)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold">EASA_app</p>
              <p className="text-sm text-[var(--easa-color-text-muted)]">
                Controlled manuals, training reading, and EASA awareness in one workflow.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link className="easa-btn secondary" href="/pricing">
                View pricing
              </Link>
              <Link className="easa-btn primary" href="/book-demo">
                Start with a demo
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
