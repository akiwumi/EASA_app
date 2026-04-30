"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Bell,
  History,
  LayoutDashboard,
  LineChart,
  ListChecks,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  Upload,
  User,
  X,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import NotificationDrawer from "@/components/notifications/NotificationDrawer";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/updates", label: "Update queue", icon: ListChecks },
  { href: "/changes", label: "Change list", icon: ScrollText },
  { href: "/flightbooks", label: "Flight books", icon: BookOpen },
  { href: "/flightbooks/upload", label: "Upload", icon: Upload },
  { href: "/history", label: "Time machine", icon: History },
  { href: "/results", label: "AI results", icon: LineChart },
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
  role,
  children,
}: {
  organizationName: string;
  role: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // Initial unread count fetch
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

  // Supabase Realtime — keep bell badge live even when drawer is closed
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
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            // Increment badge; drawer will reconcile its own list
            setUnreadCount((c) => c + 1);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            // Re-fetch true count after a mark-read update
            fetch("/api/notifications")
              .then((r) => r.ok ? r.json() : null)
              .then((json) => {
                if (json && typeof json.unreadCount === "number") {
                  setUnreadCount(json.unreadCount);
                }
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

  const BellButton = ({ onNavigate }: { onNavigate?: () => void }) => (
    <button
      type="button"
      aria-label="Open notifications"
      className={`relative flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition md:px-4 ${
        pathname === "/notifications" || drawerOpen
          ? "bg-[var(--easa-color-brand-primary)] text-white"
          : "text-[var(--easa-color-text-secondary)] hover:bg-[var(--easa-color-surface-2)]"
      }`}
      onClick={() => {
        onNavigate?.();
        setDrawerOpen((o) => !o);
      }}
    >
      <span className="relative shrink-0">
        <Bell size={18} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--easa-color-accent-pink)] px-1 text-[10px] font-bold text-white leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </span>
      <span>Notifications</span>
    </button>
  );

  const renderNavLink = (item: (typeof NAV)[number], onNavigate?: () => void) => {
    const active = navItemActive(pathname, item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        className={`relative flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition md:px-4 ${
          active
            ? "bg-[var(--easa-color-brand-primary)] text-white"
            : "text-[var(--easa-color-text-secondary)] hover:bg-[var(--easa-color-surface-2)]"
        }`}
        href={item.href}
        onClick={onNavigate}
      >
        <Icon size={18} strokeWidth={1.75} className="shrink-0" />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)]/95 shadow-[var(--easa-shadow-1)] backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-4 py-3 lg:px-8">
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-3 rounded-2xl pr-2 transition hover:opacity-90"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--easa-color-brand-primary)] text-sm font-semibold text-white">
              EA
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="text-sm font-semibold text-[var(--easa-color-text-primary)]">
                EASA Console
              </p>
              <p className="text-xs text-[var(--easa-color-text-muted)]">
                South Sweden Aviation
              </p>
            </div>
          </Link>

          <nav className="order-last hidden w-full min-w-0 md:order-none md:flex md:flex-1 md:flex-wrap md:items-center md:justify-center md:gap-1 lg:gap-2">
            {NAV.map((item) => renderNavLink(item))}
            <BellButton />
            {role === "admin" && (
              <Link
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                  pathname.startsWith("/settings")
                    ? "bg-[var(--easa-color-brand-primary)] text-white"
                    : "text-[var(--easa-color-text-secondary)] hover:bg-[var(--easa-color-surface-2)]"
                }`}
                href="/settings"
              >
                <Settings size={18} strokeWidth={1.75} />
                <span>Settings</span>
              </Link>
            )}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div className="hidden max-w-[200px] text-right lg:block">
              <p className="truncate text-xs text-[var(--easa-color-text-muted)]">Organisation</p>
              <p className="truncate text-sm font-semibold">{organizationName}</p>
            </div>
            <button
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="easa-btn secondary flex h-10 w-10 items-center justify-center p-0 md:hidden"
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? <X size={20} strokeWidth={1.75} /> : <Menu size={20} strokeWidth={1.75} />}
            </button>
            <button
              className="easa-btn secondary hidden text-sm sm:inline-flex"
              type="button"
              onClick={signOut}
            >
              <LogOut size={16} strokeWidth={1.75} className="inline" /> Sign out
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] px-4 py-4 md:hidden">
            <div className="mx-auto flex max-w-[1400px] flex-col gap-1">
              {NAV.map((item) => renderNavLink(item, () => setMenuOpen(false)))}
              <BellButton onNavigate={() => setMenuOpen(false)} />
              {role === "admin" && (
                <Link
                  className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition ${
                    pathname.startsWith("/settings")
                      ? "bg-[var(--easa-color-brand-primary)] text-white"
                      : "text-[var(--easa-color-text-secondary)] hover:bg-[var(--easa-color-surface-2)]"
                  }`}
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                >
                  <Settings size={18} strokeWidth={1.75} />
                  <span>Settings</span>
                </Link>
              )}
              <div className="mt-3 rounded-[16px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-3">
                <p className="text-xs text-[var(--easa-color-text-muted)]">Organisation</p>
                <p className="mt-1 text-sm font-semibold">{organizationName}</p>
                <p className="mt-1 text-xs capitalize text-[var(--easa-color-text-muted)]">
                  Role · {role}
                </p>
              </div>
              <button
                className="easa-btn secondary mt-2 w-full justify-center sm:hidden"
                type="button"
                onClick={signOut}
              >
                <LogOut size={16} strokeWidth={1.75} className="inline" /> Sign out
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-[1400px] p-4 lg:p-8">{children}</main>

      {/* Notification drawer — rendered outside main so it overlays correctly */}
      <NotificationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onUnreadChange={handleUnreadChange}
      />
    </div>
  );
}
