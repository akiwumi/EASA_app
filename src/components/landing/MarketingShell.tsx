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
    <div className="min-h-screen">
      <div className="easa-shell flex min-h-screen flex-col gap-8 py-5 lg:py-6">
        <header className="z-40 overflow-hidden rounded-[30px] border border-[var(--easa-color-border)] bg-[rgba(255,253,248,0.76)] shadow-[var(--easa-shadow-1)] backdrop-blur-xl">
          <div className="easa-gradient-bar" />
          <nav className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-5">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[var(--easa-color-brand-primary)] text-sm font-semibold text-[#f7f2e8] shadow-[var(--easa-shadow-brand)]">
                EA
              </div>
              <div>
                <p className="easa-display text-lg leading-none">EASA_app</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--easa-color-text-muted)]">
                  Training and compliance platform
                </p>
              </div>
            </Link>

            <div className="flex flex-wrap items-center gap-1.5 text-sm">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-3.5 py-2 font-medium text-[var(--easa-color-text-muted)] transition-all duration-150 hover:bg-[var(--easa-color-brand-muted)] hover:text-[var(--easa-color-brand-primary)]"
                >
                  {item.label}
                </Link>
              ))}
              <Link className="easa-btn secondary ml-1" href="/login">
                Login
              </Link>
              <Link className="easa-btn primary" href="/book-demo">
                Book a demo
              </Link>
            </div>
          </nav>
        </header>

        <main className="easa-page-enter flex-1">{children}</main>

        <footer className="overflow-hidden rounded-[30px] border border-[var(--easa-color-border)] bg-[rgba(255,253,248,0.72)] shadow-[var(--easa-shadow-1)] backdrop-blur-md">
          <div className="easa-gradient-bar" />
          <div className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="easa-display text-lg">EASA_app</p>
              <p className="mt-1 text-sm text-[var(--easa-color-text-muted)]">
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
