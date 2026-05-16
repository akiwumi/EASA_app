"use client";

import Footer from "@/components/home/Footer";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/pricing", label: "Pricing" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/register", label: "Register" },
] as const;

export default function MarketingShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="easa-quicken-app min-h-screen bg-[var(--easa-color-bg)]">
      <div className="easa-shell flex min-h-screen flex-col gap-8 py-5 lg:py-6">
        <header className="z-40 overflow-hidden rounded-[30px] border border-[var(--easa-color-border)] bg-[rgba(255,253,248,0.76)] shadow-[var(--easa-shadow-1)] backdrop-blur-xl">
          <div className="easa-gradient-bar" />
          <nav className="flex items-center justify-between px-4 py-4 lg:px-5">
            <Link href="/" className="flex items-center gap-3">
              <Image
                alt="Flight Lyceum logo"
                className="object-contain"
                height={44}
                priority
                src="/images/flight-lyceum-logo.png"
                style={{ width: 80, height: 44 }}
                width={80}
              />
              <div>
                <p className="easa-display text-lg leading-none">Flight Lyceum</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--easa-color-text-muted)]">
                  Training and compliance platform
                </p>
              </div>
            </Link>

            <div className="hidden items-center gap-1.5 text-sm lg:flex">
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
              <Link className="easa-btn primary" href="/register">
                Register school
              </Link>
            </div>

            <button
              aria-controls="marketing-mobile-nav"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none border-0 bg-transparent p-0 text-[var(--easa-color-text-secondary)] transition-colors hover:text-[var(--easa-color-brand-primary)] lg:hidden"
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
            </button>
          </nav>

          {menuOpen && (
            <div id="marketing-mobile-nav" className="border-t border-[var(--easa-color-border)] bg-[rgba(255,253,248,0.96)] px-4 py-4 lg:hidden">
              <div className="flex flex-col gap-2">
                {NAV_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-full px-3.5 py-2 text-sm font-medium text-[var(--easa-color-text-muted)] transition-all duration-150 hover:bg-[var(--easa-color-brand-muted)] hover:text-[var(--easa-color-brand-primary)]"
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="mt-2 flex flex-col gap-2">
                  <Link className="easa-btn secondary w-full" href="/login" onClick={() => setMenuOpen(false)}>
                    Login
                  </Link>
                  <Link className="easa-btn primary w-full" href="/register" onClick={() => setMenuOpen(false)}>
                    Register school
                  </Link>
                </div>
              </div>
            </div>
          )}
        </header>

        <main className="easa-page-enter flex-1">{children}</main>

        <div className="overflow-hidden rounded-[30px] border border-[var(--easa-color-border)] bg-[rgba(255,253,248,0.72)] shadow-[var(--easa-shadow-1)] backdrop-blur-md">
          <div className="easa-gradient-bar" />
          <Footer className="border-t-0 py-0" innerClassName="p-6" />
        </div>
      </div>
    </div>
  );
}
