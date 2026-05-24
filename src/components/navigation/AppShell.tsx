"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpen,
  GraduationCap,
  HelpCircle,
  Home,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Mail,
  Menu,
  Search,
  Settings,
  User,
  X,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import NotificationDrawer from "@/components/notifications/NotificationDrawer";
import SchoolSwitcher from "@/components/navigation/SchoolSwitcher";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
};

const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard",           label: "Dashboard",    icon: LayoutDashboard },
  { href: "/updates",             label: "Review queue", icon: ListChecks },
  { href: "/flightbooks",         label: "Flight books", icon: BookOpen },
  { href: "/training/programmes", label: "Training",     icon: GraduationCap },
  { href: "/settings",            label: "Settings",     icon: Settings, adminOnly: true },
];

const MOBILE_NAV: NavItem[] = [
  { href: "/dashboard",           label: "Home",         icon: LayoutDashboard },
  { href: "/updates",             label: "Review",       icon: ListChecks },
  { href: "/flightbooks",         label: "Books",        icon: BookOpen },
  { href: "/training/programmes", label: "Training",     icon: GraduationCap },
  { href: "/settings",            label: "Settings",     icon: Settings, adminOnly: true },
];

function navItemActive(pathname: string, href: string) {
  if (href === "/flightbooks") {
    return pathname.startsWith("/flightbooks") && !pathname.startsWith("/flightbooks/upload");
  }
  if (pathname === href) return true;
  if (href === "/dashboard") return false;
  return pathname.startsWith(`${href}/`);
}

export default function AppShell({
  organizationName,
  logoUrl,
  websiteUrl,
  contactEmail,
  contactPhone,
  role,
  children,
}: {
  organizationName: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  brandPrimaryColor?: string | null;
  brandSecondaryColor?: string | null;
  role: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Close mobile menu on navigation
  useEffect(() => {
    const timer = window.setTimeout(() => setMenuOpen(false), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  // Initial unread count
  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json && typeof json.unreadCount === "number") setUnreadCount(json.unreadCount);
      })
      .catch(() => {});
  }, []);

  // Realtime notification updates
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled || !user) return;

      channel = supabase
        .channel(`appshell-notif:${user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          () => setUnreadCount((c) => c + 1),
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          () => {
            fetch("/api/notifications")
              .then((r) => (r.ok ? r.json() : null))
              .then((json) => {
                if (json && typeof json.unreadCount === "number") setUnreadCount(json.unreadCount);
              })
              .catch(() => {});
          },
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) {
        const sb = getSupabaseBrowserClient();
        sb?.removeChannel(channel);
      }
    };
  }, []);

  const handleUnreadChange = useCallback((count: number) => {
    setUnreadCount(count);
  }, []);

  const signOut = async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    window.location.assign("/login");
  };

  return (
    <div className="easa-quicken-app relative min-h-screen overflow-x-clip bg-[var(--easa-color-bg)] pb-16 lg:pb-0">

      {/* ─── Desktop sidebar ─────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[220px] flex-col border-r border-[var(--easa-color-border)] bg-white shadow-[1px_0_4px_rgba(15,23,42,0.08)] lg:flex">

        {/* Gradient accent bar — matches landing page header */}
        <div className="easa-gradient-bar shrink-0" />

        {/* Brand / org header */}
        <div className="border-b border-[var(--easa-color-border)] px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 rounded-xl p-1 transition-opacity hover:opacity-80">
            <Image
              alt="Flight Lyceum logo"
              className="object-contain"
              height={28}
              priority
              src="/images/flight-lyceum-logo.png"
              style={{ width: 52, height: 28 }}
              width={52}
            />
            <div className="min-w-0">
              <p className="easa-display truncate text-[13px] leading-tight text-[var(--easa-color-text-primary)]">
                Flight Lyceum
              </p>
              <p className="mt-0.5 truncate text-[10px] text-[var(--easa-color-text-muted)]">
                {organizationName || "Your organisation"}
              </p>
            </div>
          </Link>
          <SchoolSwitcher />
        </div>

        {/* Primary navigation */}
        <nav aria-label="Primary navigation" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
          {PRIMARY_NAV.map((item) => {
            if (item.adminOnly && role !== "admin") return null;
            const active = navItemActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-[var(--easa-color-brand-light)] text-[var(--easa-color-brand-primary)]"
                    : "text-[var(--easa-color-text-secondary)] hover:bg-[var(--easa-color-surface-2)] hover:text-[var(--easa-color-text-primary)]"
                }`}
              >
                <Icon size={17} strokeWidth={active ? 2.25 : 1.85} className="shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Utility / bottom section */}
        <div className="border-t border-[var(--easa-color-border)] px-3 py-3 space-y-1">
          {/* Notifications */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--easa-color-text-secondary)] transition hover:bg-[var(--easa-color-surface-2)] hover:text-[var(--easa-color-text-primary)]"
          >
            <Bell size={17} strokeWidth={1.85} className="shrink-0" />
            Notifications
            {unreadCount > 0 && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--easa-color-accent-pink)] px-1.5 text-[10px] font-bold leading-none text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          <Link
            href="/search"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--easa-color-text-secondary)] transition hover:bg-[var(--easa-color-surface-2)] hover:text-[var(--easa-color-text-primary)]"
          >
            <Search size={17} strokeWidth={1.85} className="shrink-0" />
            Search
          </Link>

          <Link
            href="/profile"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--easa-color-text-secondary)] transition hover:bg-[var(--easa-color-surface-2)] hover:text-[var(--easa-color-text-primary)]"
          >
            <User size={17} strokeWidth={1.85} className="shrink-0" />
            Profile
          </Link>

          <div className="my-1 border-t border-[var(--easa-color-border)]" />

          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--easa-color-text-secondary)] transition hover:bg-[var(--easa-color-surface-2)] hover:text-[var(--easa-color-text-primary)]"
          >
            <Home size={17} strokeWidth={1.85} className="shrink-0" />
            Home
          </Link>

          <Link
            href="/help"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--easa-color-text-secondary)] transition hover:bg-[var(--easa-color-surface-2)] hover:text-[var(--easa-color-text-primary)]"
          >
            <HelpCircle size={17} strokeWidth={1.85} className="shrink-0" />
            Help Center
          </Link>

          <Link
            href="/contact"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--easa-color-text-secondary)] transition hover:bg-[var(--easa-color-surface-2)] hover:text-[var(--easa-color-text-primary)]"
          >
            <Mail size={17} strokeWidth={1.85} className="shrink-0" />
            Contact
          </Link>

          <div className="my-1 border-t border-[var(--easa-color-border)]" />

          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--easa-color-text-secondary)] transition hover:bg-[var(--easa-color-surface-2)] hover:text-[var(--easa-color-text-primary)]"
          >
            <LogOut size={17} strokeWidth={1.85} className="shrink-0" />
            Sign out
          </button>
        </div>

        {/* Role chip */}
        <div className="border-t border-[var(--easa-color-border)] px-4 py-3">
          <p className="text-[11px] capitalize text-[var(--easa-color-text-muted)]">
            Signed in as <span className="font-medium text-[var(--easa-color-text-secondary)]">{role}</span>
          </p>
        </div>
      </aside>

      {/* ─── Mobile / tablet top header ──────────────────────────── */}
      <header className="z-40 w-full lg:hidden">
        <div className="w-full border-b border-[var(--easa-color-border)] bg-[rgba(255,253,248,0.94)] shadow-[var(--easa-shadow-1)] backdrop-blur-xl">
          {/* Gradient accent bar — matches landing page */}
          <div className="easa-gradient-bar" />
          <div className="flex min-h-[60px] w-full items-center gap-3 px-4 py-3 sm:px-5">

            {/* Logo + title */}
            <Link
              href="/dashboard"
              className="flex min-w-0 flex-1 items-center gap-2.5 transition-opacity hover:opacity-80"
            >
              <Image
                alt="Flight Lyceum logo"
                className="object-contain"
                height={32}
                priority
                src="/images/flight-lyceum-logo.png"
                style={{ width: 58, height: 32 }}
                width={58}
              />
              <div className="min-w-0">
                <p className="easa-display text-[13px] leading-tight text-[var(--easa-color-text-primary)]">
                  Flight Lyceum
                </p>
                <p className="mt-0.5 truncate text-[10px] text-[var(--easa-color-text-muted)]">
                  {organizationName || "Your organisation"}
                </p>
              </div>
            </Link>

            {/* Bell */}
            <button
              aria-label="Notifications"
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--easa-color-text-secondary)] transition hover:bg-[var(--easa-color-surface-2)] hover:text-[var(--easa-color-brand-primary)]"
            >
              <Bell size={18} strokeWidth={1.85} />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[var(--easa-color-accent-pink)] px-0.5 text-[9px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {/* Hamburger */}
            <button
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--easa-color-text-secondary)] transition hover:bg-[var(--easa-color-surface-2)] hover:text-[var(--easa-color-brand-primary)]"
            >
              {menuOpen ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
            </button>
          </div>

          {/* Expanded mobile menu */}
          {menuOpen && (
            <div
              className="border-t border-[var(--easa-color-border)] bg-white px-4 pb-5 pt-3 sm:px-5"
              style={{ backdropFilter: "blur(16px)" }}
            >
              <nav className="grid gap-1 sm:grid-cols-2">
                {PRIMARY_NAV.map((item) => {
                  if (item.adminOnly && role !== "admin") return null;
                  const active = navItemActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                        active
                          ? "bg-[var(--easa-color-brand-light)] text-[var(--easa-color-brand-primary)]"
                          : "text-[var(--easa-color-text-secondary)] hover:bg-[var(--easa-color-surface-2)] hover:text-[var(--easa-color-text-primary)]"
                      }`}
                    >
                      <Icon size={16} strokeWidth={active ? 2.25 : 1.85} className="shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              {/* Org info + utilities */}
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--easa-color-text-primary)]">
                    {organizationName || "Organisation"}
                  </p>
                  <p className="mt-0.5 text-xs capitalize text-[var(--easa-color-text-muted)]">{role}</p>
                  {websiteUrl && (
                    <a className="mt-1 block truncate text-xs text-[var(--easa-color-brand-primary)] hover:underline" href={websiteUrl} rel="noreferrer" target="_blank">
                      {websiteUrl}
                    </a>
                  )}
                  {contactEmail && (
                    <a className="mt-0.5 block truncate text-xs text-[var(--easa-color-text-muted)]" href={`mailto:${contactEmail}`}>
                      {contactEmail}
                    </a>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Link href="/" title="Home" onClick={() => setMenuOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--easa-color-text-secondary)] hover:bg-[var(--easa-color-border)] hover:text-[var(--easa-color-brand-primary)]">
                    <Home size={16} strokeWidth={1.85} />
                  </Link>
                  <Link href="/help" title="Help Center" onClick={() => setMenuOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--easa-color-text-secondary)] hover:bg-[var(--easa-color-border)] hover:text-[var(--easa-color-brand-primary)]">
                    <HelpCircle size={16} strokeWidth={1.85} />
                  </Link>
                  <Link href="/contact" title="Contact" onClick={() => setMenuOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--easa-color-text-secondary)] hover:bg-[var(--easa-color-border)] hover:text-[var(--easa-color-brand-primary)]">
                    <Mail size={16} strokeWidth={1.85} />
                  </Link>
                  <Link href="/profile" title="Profile" onClick={() => setMenuOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--easa-color-text-secondary)] hover:bg-[var(--easa-color-border)] hover:text-[var(--easa-color-brand-primary)]">
                    <User size={16} strokeWidth={1.85} />
                  </Link>
                  <button type="button" title="Sign out" onClick={signOut} className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--easa-color-text-secondary)] hover:bg-[var(--easa-color-border)] hover:text-[var(--easa-color-brand-primary)]">
                    <LogOut size={16} strokeWidth={1.85} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ─── Main content ────────────────────────────────────────── */}
      <main className="min-w-0 px-4 pb-8 pt-4 lg:ml-[220px] lg:px-8 lg:py-10">
        <div className="easa-page-enter min-w-0 mx-auto max-w-6xl">
          {children}
        </div>
      </main>

      {/* ─── Mobile bottom nav ───────────────────────────────────── */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--easa-color-border)] bg-white px-2 pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-1.5 shadow-[0_-8px_24px_rgba(15,23,42,0.10)] lg:hidden"
      >
        <div className="flex w-full items-center">
          {MOBILE_NAV.map((item) => {
            if (item.adminOnly && role !== "admin") return null;
            const active = navItemActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className={`flex h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl transition ${
                  active
                    ? "text-[var(--easa-color-brand-primary)]"
                    : "text-[var(--easa-color-text-muted)]"
                }`}
              >
                <Icon size={19} strokeWidth={active ? 2.25 : 1.85} />
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <NotificationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onUnreadChange={handleUnreadChange}
      />
    </div>
  );
}
