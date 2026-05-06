"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Who it's for", href: "/#who-it-s-for" },
  { label: "Pricing", href: "/pricing" },
  { label: "Register", href: "/register" },
] as const;

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="z-40 w-full px-0 py-0">
      <div className="w-full overflow-hidden border-b border-[var(--easa-color-border)] bg-[rgba(255,253,248,0.9)] shadow-[var(--easa-shadow-2)] backdrop-blur-xl">
        <div className="easa-gradient-bar" />

        <div className="flex min-h-[72px] items-center gap-3 px-4 py-3 sm:px-5 lg:px-6">
          <Link
            href="/"
            className="flex min-w-0 flex-1 items-center gap-3 transition-opacity hover:opacity-85"
          >
            <Image
              alt="Flight Lyceum logo"
              className="h-10 w-auto object-contain"
              height={40}
              priority
              src="/images/flight-lyceum-logo.png"
              width={72}
            />
            <div className="min-w-0">
              <p className="easa-display text-lg leading-none text-[var(--easa-color-text-primary)]">
                Flight Lyceum
              </p>
              <p className="mt-1 truncate text-[11px] uppercase tracking-[0.14em] text-[var(--easa-color-text-muted)]">
                Training and compliance platform
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1.5 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-3.5 py-2 text-sm font-medium text-[var(--easa-color-text-muted)] transition-all duration-150 hover:bg-[var(--easa-color-brand-muted)] hover:text-[var(--easa-color-brand-primary)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            <Link
              href="/login"
              className="easa-btn secondary text-sm"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="easa-btn primary text-sm"
            >
              Register school
            </Link>
          </div>

          <button
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none border-0 bg-transparent p-0 text-[var(--easa-color-text-secondary)] transition-colors hover:text-[var(--easa-color-brand-primary)] lg:hidden"
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
          </button>
        </div>

        {menuOpen ? (
          <div className="border-t border-[var(--easa-color-border)] bg-[rgba(255,253,248,0.96)] px-4 py-4 sm:px-5 lg:hidden">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full px-3.5 py-2 text-sm font-medium text-[var(--easa-color-text-muted)] transition-all duration-150 hover:bg-[var(--easa-color-brand-muted)] hover:text-[var(--easa-color-brand-primary)]"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-2 flex flex-col gap-2 sm:hidden">
                <Link className="easa-btn secondary w-full" href="/login" onClick={() => setMenuOpen(false)}>
                  Login
                </Link>
                <Link className="easa-btn primary w-full" href="/register" onClick={() => setMenuOpen(false)}>
                  Register school
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
