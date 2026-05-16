"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Bell,
  CalendarDays,
  CircleHelp,
  ClipboardList,
  GraduationCap,
  History,
  Home,
  LayoutDashboard,
  LineChart,
  ListChecks,
  LogOut,
  Menu,
  MoreVertical,
  PieChart,
  PlusCircle,
  RefreshCw,
  ScrollText,
  Search,
  Settings,
  Upload,
  User,
  X,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import NotificationDrawer from "@/components/notifications/NotificationDrawer";

type NavItem = {
  href: string;
  label: string;
  icon: (typeof LayoutDashboard);
  adminOnly?: boolean;
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/updates", label: "Update queue", icon: ListChecks },
  { href: "/changes", label: "Change list", icon: ScrollText },
  { href: "/flightbooks", label: "Flight Books", icon: BookOpen },
  { href: "/search", label: "Search", icon: Search },
  { href: "/training/programmes", label: "Training", icon: GraduationCap },
  { href: "/flightbooks/upload", label: "Update", icon: Upload },
  { href: "/history", label: "Time machine", icon: History },
  { href: "/results", label: "AI results", icon: LineChart },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings, adminOnly: true },
] as const;

const DASHBOARD_SECTIONS: NavItem[] = [
  { href: "/dashboard/setup", label: "Setup", icon: Settings },
  { href: "/dashboard/operations", label: "Operations", icon: LayoutDashboard },
  { href: "/dashboard/proposed-updates", label: "Proposed updates", icon: ListChecks },
  { href: "/dashboard/rss-ingestion", label: "RSS ingestion", icon: LineChart },
  { href: "/dashboard/lessons-affected", label: "Lessons affected", icon: GraduationCap },
  { href: "/dashboard/flightbook-mapping", label: "Flight book mapping", icon: BookOpen },
  { href: "/dashboard/time-machine", label: "Time machine", icon: History },
  { href: "/dashboard/compliance", label: "Compliance", icon: ScrollText },
  { href: "/dashboard/pipeline", label: "Pipeline status", icon: LineChart },
  { href: "/dashboard/admin-settings", label: "Admin settings", icon: Settings, adminOnly: true },
] as const;

const MOBILE_NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/training/programmes", label: "Training", icon: GraduationCap },
  { href: "/changes", label: "Changes", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings, adminOnly: true },
  { href: "/profile", label: "Profile", icon: User },
] as const;

const RAIL_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/updates", label: "Update queue", icon: RefreshCw },
  { href: "/changes", label: "Change list", icon: ClipboardList },
  { href: "/training/programmes", label: "Training", icon: CalendarDays },
  { href: "/flightbooks", label: "Flight books", icon: BookOpen },
  { href: "/results", label: "AI results", icon: PieChart },
  { href: "/history", label: "Time machine", icon: LineChart },
  { href: "/search", label: "Search", icon: Search },
] as const;

const UTILITY_NAV: NavItem[] = [
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings, adminOnly: true },
  { href: "/dashboard/setup", label: "Help", icon: CircleHelp },
  { href: "/profile", label: "Profile", icon: User },
] as const;

function navItemActive(pathname: string, href: string) {
  if (href === "/flightbooks") {
    if (!pathname.startsWith("/flightbooks")) return false;
    if (pathname.startsWith("/flightbooks/upload")) return false;
    return true;
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

  useEffect(() => {
    const timer = window.setTimeout(() => setMenuOpen(false), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        if (json && typeof json.unreadCount === "number") {
          setUnreadCount(json.unreadCount);
        }
      })
      .catch(() => {});
  }, []);

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
              .then((r) => r.ok ? r.json() : null)
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

  const renderNavLink = (item: NavItem, onNavigate?: () => void) => {
    if (item.adminOnly && role !== "admin") {
      return null;
    }

    const active = navItemActive(pathname, item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        className={`relative flex min-w-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-all duration-150 md:px-3.5 ${
          active
            ? "bg-[var(--easa-color-brand-light)] text-[var(--easa-color-brand-primary)]"
            : "text-[var(--easa-color-text-muted)] hover:bg-[var(--easa-color-brand-muted)] hover:text-[var(--easa-color-brand-primary)]"
        }`}
        href={item.href}
        onClick={onNavigate}
      >
        <span className="relative shrink-0">
          <Icon
            size={16}
            strokeWidth={active ? 2.25 : 1.85}
            className="shrink-0"
          />
          {item.href === "/notifications" && unreadCount > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--easa-color-accent-pink)] px-1 text-[10px] font-bold leading-none text-white shadow-sm">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </span>
        <span className="min-w-0 break-words">{item.label}</span>
      </Link>
    );
  };

  const renderRailLink = (item: NavItem) => {
    if (item.adminOnly && role !== "admin") return null;

    const active = navItemActive(pathname, item.href);
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        aria-label={item.label}
        className={`relative flex h-16 w-full items-center justify-center border-l-2 transition ${
          active
            ? "border-[var(--easa-color-brand-primary)] bg-[var(--easa-color-brand-light)] text-[var(--easa-color-brand-primary)]"
            : "border-transparent text-[var(--easa-color-text-secondary)] hover:bg-[var(--easa-color-surface-2)] hover:text-[var(--easa-color-brand-primary)]"
        }`}
        href={item.href}
        title={item.label}
      >
        <Icon size={21} strokeWidth={active ? 2.25 : 1.85} />
        {item.href === "/notifications" && unreadCount > 0 ? (
          <span className="absolute right-3 top-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--easa-color-accent-pink)] px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <div className="easa-quicken-app relative min-h-screen overflow-x-clip bg-[var(--easa-color-bg)] pb-16 lg:pb-0">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[72px] overflow-y-auto border-r border-[var(--easa-color-border)] bg-white shadow-[1px_0_3px_rgba(15,23,42,0.12)] lg:flex lg:flex-col">
        <Link
          aria-label="Dashboard home"
          className="mx-auto my-6 flex h-[52px] w-[52px] items-center justify-center rounded-[10px] bg-[var(--easa-color-brand-primary)] text-white shadow-[0_8px_18px_rgba(67,38,232,0.24)]"
          href="/dashboard"
        >
          <span className="relative block h-7 w-7 rounded-full border-[5px] border-white">
            <span className="absolute -bottom-1 right-0 h-[5px] w-3 rotate-45 rounded-full bg-white" />
          </span>
        </Link>

        <nav aria-label="Primary app navigation" className="flex flex-1 flex-col items-center">
          {RAIL_NAV.map((item) => renderRailLink(item))}
        </nav>

        <nav aria-label="Utility navigation" className="mb-5 flex flex-col items-center">
          <button
            aria-label="Refresh page"
            className="flex h-16 w-full items-center justify-center text-[var(--easa-color-text-secondary)] transition hover:bg-[var(--easa-color-surface-2)] hover:text-[var(--easa-color-brand-primary)]"
            type="button"
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={21} strokeWidth={1.85} />
          </button>
          {UTILITY_NAV.map((item) => renderRailLink(item))}
          <button
            aria-label="Sign out"
            className="flex h-16 w-full items-center justify-center text-[var(--easa-color-text-secondary)] transition hover:bg-[var(--easa-color-surface-2)] hover:text-[var(--easa-color-brand-primary)]"
            title="Sign out"
            type="button"
            onClick={signOut}
          >
            <LogOut size={21} strokeWidth={1.85} />
          </button>
        </nav>
      </aside>

      <aside className="fixed bottom-8 left-[120px] top-12 z-30 hidden w-[408px] overflow-hidden rounded-[24px] border border-[var(--easa-color-border)] bg-white shadow-[var(--easa-shadow-1)] xl:block">
        <div className="flex items-center justify-between px-8 pb-5 pt-11">
          <h2 className="text-[32px] font-medium leading-none text-[var(--easa-color-text-primary)]">Workspace</h2>
          <div className="flex items-center gap-3 text-[var(--easa-color-brand-primary)]">
            <Link className="flex items-center gap-2 text-[18px] font-semibold" href="/flightbooks/upload">
              <PlusCircle size={18} fill="currentColor" strokeWidth={2.25} />
              Add
            </Link>
            <MoreVertical size={24} className="text-[var(--easa-color-text-muted)]" />
          </div>
        </div>

        <div className="px-6 pb-7">
          <div className="rounded-b-none border-b border-[var(--easa-color-border)] px-2 pb-5">
            <div className="flex items-center justify-between text-[22px] font-semibold">
              <span>Operations</span>
              <span>{organizationName || "EASA"}</span>
            </div>
          </div>

          <div className="mt-6 space-y-6 text-[19px]">
            <section>
              <div className="flex items-center justify-between font-medium">
                <span className="flex items-center gap-2"><span className="text-xs">▾</span> Compliance</span>
                <span>Live</span>
              </div>
              <div className="mt-4 space-y-3 pl-6 text-[16px] text-[var(--easa-color-text-secondary)]">
                <Link className="flex justify-between hover:text-[var(--easa-color-brand-primary)]" href="/updates"><span>Update Queue</span><span>Review</span></Link>
                <Link className="flex justify-between hover:text-[var(--easa-color-brand-primary)]" href="/changes"><span>Change List</span><span>Active</span></Link>
                <Link className="flex justify-between hover:text-[var(--easa-color-brand-primary)]" href="/results"><span>AI Results</span><span>Drafts</span></Link>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between font-medium">
                <span className="flex items-center gap-2"><span className="text-xs">▾</span> Manuals</span>
                <span>Library</span>
              </div>
              <div className="mt-4 space-y-3 pl-6 text-[16px] text-[var(--easa-color-text-secondary)]">
                <Link className="flex justify-between hover:text-[var(--easa-color-brand-primary)]" href="/flightbooks"><span>Flight Books</span><span>Controlled</span></Link>
                <Link className="flex justify-between hover:text-[var(--easa-color-brand-primary)]" href="/flightbooks/upload"><span>Upload</span><span>New</span></Link>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between font-medium">
                <span className="flex items-center gap-2"><span className="text-xs">▾</span> Training</span>
                <span>School</span>
              </div>
              <div className="mt-4 space-y-3 pl-6 text-[16px] text-[var(--easa-color-text-secondary)]">
                <Link className="flex justify-between hover:text-[var(--easa-color-brand-primary)]" href="/training/programmes"><span>Programmes</span><span>Core</span></Link>
                <Link className="flex justify-between hover:text-[var(--easa-color-brand-primary)]" href="/training/assignments"><span>Assignments</span><span>Open</span></Link>
                <Link className="flex justify-between hover:text-[var(--easa-color-brand-primary)]" href="/training/signoffs"><span>Sign-offs</span><span>Pending</span></Link>
              </div>
            </section>
          </div>

          <div className="mt-6 rounded-[14px] border border-[var(--easa-color-border)] p-5">
            <p className="text-[20px] font-medium">Settings</p>
            <Link className="mt-2 block text-[16px] font-medium text-[var(--easa-color-brand-primary)]" href="/settings">
              + Admin settings
            </Link>
          </div>
        </div>
      </aside>

      <header className="z-40 w-full px-0 py-0 lg:hidden">
        <div className="w-full overflow-hidden border-b border-[var(--easa-color-border)] bg-white shadow-[var(--easa-shadow-1)]">
          <div className="flex min-h-[72px] w-full items-center gap-3 px-4 py-3 sm:px-5">
            <Link
              href="/dashboard"
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl pr-2 transition-opacity hover:opacity-85"
            >
              {logoUrl ? (
                <Image
                  alt={`${organizationName || "Organisation"} logo`}
                  className="h-10 w-10 rounded-[14px] border border-[var(--easa-color-border)] bg-white object-cover"
                  height={40}
                  src={logoUrl}
                  unoptimized
                  width={40}
                />
              ) : (
                <Image
                  alt="Flight Lyceum logo"
                  className="object-contain"
                  height={40}
                  priority
                  src="/images/flight-lyceum-logo.png"
                  style={{ width: 73, height: 40 }}
                  width={73}
                />
              )}
              <div className="min-w-0">
                <p className="easa-display text-[1.05rem] leading-none text-[var(--easa-color-text-primary)]">
                  EASA Console
                </p>
                <p className="mt-1 truncate text-[11px] uppercase tracking-[0.14em] text-[var(--easa-color-text-muted)]">
                  {organizationName || "Your organisation"}
                </p>
              </div>
            </Link>

            <button
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none border-0 bg-transparent p-0 text-[var(--easa-color-text-secondary)] transition-colors hover:text-[var(--easa-color-brand-primary)]"
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
            </button>
          </div>

          {menuOpen && (
            <div
              className="border-t border-[var(--easa-color-border)] bg-[rgba(255,253,248,0.96)] px-4 py-4 sm:px-5 lg:hidden"
              style={{ backdropFilter: "blur(16px)" }}
            >
              <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 px-3 text-[11px] uppercase tracking-[0.14em] text-[var(--easa-color-text-muted)]">
                      Main menu
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {NAV.map((item) => renderNavLink(item, () => setMenuOpen(false)))}
                    </div>
                  </div>

                  <div className="border-t border-[var(--easa-color-border)] pt-4">
                    <p className="mb-2 px-3 text-[11px] uppercase tracking-[0.14em] text-[var(--easa-color-text-muted)]">
                      Dashboard sections
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {DASHBOARD_SECTIONS.map((item) => renderNavLink(item, () => setMenuOpen(false)))}
                    </div>
                  </div>
                </div>
                <div className="rounded-[24px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--easa-color-text-muted)]">Organisation</p>
                  <p className="mt-0.5 text-sm font-semibold text-[var(--easa-color-text-primary)]">{organizationName}</p>
                  <p className="mt-0.5 text-[11px] capitalize text-[var(--easa-color-text-muted)]">
                    Role · {role}
                  </p>
                  {websiteUrl ? (
                    <a
                      className="mt-3 block truncate text-xs text-[var(--easa-color-brand-primary)] hover:underline"
                      href={websiteUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {websiteUrl}
                    </a>
                  ) : null}
                  {contactEmail ? (
                    <a
                      className="mt-2 block truncate text-xs text-[var(--easa-color-text-secondary)] hover:text-[var(--easa-color-brand-primary)]"
                      href={`mailto:${contactEmail}`}
                    >
                      {contactEmail}
                    </a>
                  ) : null}
                  {contactPhone ? (
                    <a
                      className="mt-1 block text-xs text-[var(--easa-color-text-secondary)] hover:text-[var(--easa-color-brand-primary)]"
                      href={`tel:${contactPhone}`}
                    >
                      {contactPhone}
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="min-w-0 px-4 pb-8 pt-4 lg:ml-[72px] lg:px-8 lg:py-12 xl:ml-[560px]">
        <div className="easa-page-enter min-w-0">{children}</div>
      </main>

      <nav
        aria-label="Mobile app navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--easa-color-border)] bg-white px-2 pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-1.5 shadow-[0_-10px_28px_rgba(15,23,42,0.12)] lg:hidden"
      >
        <div className="flex w-full items-center gap-1">
          {MOBILE_NAV.map((item) => {
            if (item.adminOnly && role !== "admin") return null;
            const active = navItemActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                aria-label={item.label}
                title={item.label}
                className={`flex h-11 min-w-0 flex-1 items-center justify-center rounded-2xl transition ${
                  active
                    ? "bg-[var(--easa-color-brand-light)] text-[var(--easa-color-brand-primary)]"
                    : "text-[var(--easa-color-text-muted)]"
                }`}
                href={item.href}
              >
                <Icon size={21} strokeWidth={active ? 2.3 : 1.9} />
              </Link>
            );
          })}
          <button
            aria-label="Logout"
            className="flex h-11 min-w-0 flex-1 items-center justify-center rounded-2xl text-[var(--easa-color-text-muted)] transition hover:text-[var(--easa-color-brand-primary)]"
            title="Logout"
            type="button"
            onClick={signOut}
          >
            <LogOut size={21} strokeWidth={1.9} />
          </button>
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
