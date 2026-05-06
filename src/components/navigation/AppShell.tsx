"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Bell,
  GraduationCap,
  History,
  LayoutDashboard,
  LineChart,
  ListChecks,
  LogOut,
  Menu,
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
  brandPrimaryColor,
  brandSecondaryColor,
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
    if (!menuOpen) return;
    const timer = window.setTimeout(() => setMenuOpen(false), 0);
    return () => window.clearTimeout(timer);
  }, [menuOpen, pathname]);

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

  return (
    <div
      className="relative min-h-screen overflow-x-clip pb-8"
      style={
        brandPrimaryColor || brandSecondaryColor
          ? ({
              ...(brandPrimaryColor ? { "--easa-color-brand-primary": brandPrimaryColor } : {}),
              ...(brandSecondaryColor ? { "--easa-color-brand-secondary": brandSecondaryColor } : {}),
            } as React.CSSProperties)
          : undefined
      }
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top,rgba(31,52,52,0.12),transparent_58%)]" />
      <div className="pointer-events-none absolute left-[-140px] top-[180px] h-[300px] w-[300px] rounded-full bg-[rgba(242,155,63,0.08)] blur-3xl" />
      <div className="pointer-events-none absolute right-[-120px] top-[100px] h-[260px] w-[260px] rounded-full bg-[rgba(47,115,240,0.08)] blur-3xl" />

      <header className="z-40 w-full px-0 py-0">
        <div className="w-full overflow-hidden border-b border-[var(--easa-color-border)] bg-[rgba(255,253,248,0.88)] shadow-[var(--easa-shadow-2)] backdrop-blur-xl">
          <div className="easa-gradient-bar" />

          <div className="flex min-h-[72px] w-full items-center gap-3 px-4 py-3 sm:px-5 lg:px-6">
            <Link
              href="/"
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
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-[14px] text-sm font-bold text-white"
                  style={{
                    background: "linear-gradient(135deg, var(--easa-color-brand-primary) 0%, var(--easa-color-brand-secondary) 100%)",
                    boxShadow: "0 10px 24px rgba(35,56,52,0.22)",
                  }}
                >
                  EA
                </div>
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

            <nav className="hidden min-w-0 flex-1 flex-wrap items-center justify-center gap-1.5 lg:flex">
              {NAV.map((item) => renderNavLink(item))}
            </nav>

            <div className="hidden rounded-full border border-[var(--easa-color-border)] bg-white/60 px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-[var(--easa-color-text-muted)] lg:block">
              Role · {role}
            </div>

                <button
                  aria-expanded={menuOpen}
                  aria-label={menuOpen ? "Close menu" : "Open menu"}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none border-0 bg-transparent p-0 text-[var(--easa-color-text-secondary)] transition-colors hover:text-[var(--easa-color-brand-primary)] lg:hidden"
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
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {NAV.map((item) => renderNavLink(item, () => setMenuOpen(false)))}
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
                  <button
                    className="easa-btn secondary mt-4 w-full justify-center"
                    type="button"
                    onClick={signOut}
                  >
                    <LogOut size={15} strokeWidth={2} /> Sign out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="easa-shell min-w-0 px-4 pb-8 pt-4 lg:px-6">
        <div className="easa-page-enter min-w-0">{children}</div>
      </main>

      <NotificationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onUnreadChange={handleUnreadChange}
      />
    </div>
  );
}
