"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  CheckCircle,
  XCircle,
  RotateCcw,
  Clock,
  AlertCircle,
  CheckCheck,
  X,
} from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { parseNotificationRecord, type NotificationRecord as Notification } from "@/components/notifications/notification-record";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called whenever the unread count changes so AppShell can sync its badge */
  onUnreadChange: (count: number) => void;
}

function NotificationIcon({ type }: { type: string }) {
  const base = "shrink-0";
  if (type === "approved")
    return <CheckCircle size={17} strokeWidth={1.75} className={`${base} text-[var(--easa-color-accent-green)]`} />;
  if (type === "rejected")
    return <XCircle size={17} strokeWidth={1.75} className={`${base} text-[var(--easa-color-accent-pink)]`} />;
  if (type === "rollback")
    return <RotateCcw size={17} strokeWidth={1.75} className={`${base} text-[var(--easa-color-accent-orange)]`} />;
  if (type === "revision_requested")
    return <AlertCircle size={17} strokeWidth={1.75} className={`${base} text-[var(--easa-color-accent-yellow)]`} />;
  if (type === "new_change" || type === "approval_needed")
    return <Clock size={17} strokeWidth={1.75} className={`${base} text-[var(--easa-color-accent-blue)]`} />;
  return <Bell size={17} strokeWidth={1.75} className={`${base} text-[var(--easa-color-text-muted)]`} />;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function NotificationDrawer({ open, onClose, onUnreadChange }: Props) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const realtimeRef = useRef<RealtimeChannel | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const json = await res.json();
      const notifs: Notification[] = json.notifications ?? [];
      setNotifications(notifs);
      onUnreadChange(notifs.filter((n) => !n.read).length);
    }
    setLoading(false);
  }, [onUnreadChange]);

  // Initial load when drawer first opens
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, load]);

  // Supabase Realtime subscription — live inserts on the notifications table
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let cancelled = false;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled || !user) return;

      const channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotif = parseNotificationRecord(payload.new);
            if (!newNotif) return;
            setNotifications((prev) => {
              const updated = [newNotif, ...prev];
              onUnreadChange(updated.filter((n) => !n.read).length);
              return updated;
            });
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
          (payload) => {
            const updated = parseNotificationRecord(payload.new);
            if (!updated) return;
            setNotifications((prev) => {
              const next = prev.map((n) => (n.id === updated.id ? updated : n));
              onUnreadChange(next.filter((n) => !n.read).length);
              return next;
            });
          },
        )
        .subscribe();

      realtimeRef.current = channel;
    });

    return () => {
      cancelled = true;
      if (realtimeRef.current) {
        supabase.removeChannel(realtimeRef.current);
        realtimeRef.current = null;
      }
    };
  }, [onUnreadChange]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function markRead(ids: string[]) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    setNotifications((prev) => {
      const next = prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n));
      onUnreadChange(next.filter((n) => !n.read).length);
      return next;
    });
  }

  async function markAllRead() {
    setMarkingAll(true);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    onUnreadChange(0);
    setMarkingAll(false);
  }

  function handleNotifClick(n: Notification) {
    if (!n.read) markRead([n.id]);
    if (n.related_entity_type === "proposed_update" && n.related_entity_id) {
      router.push(`/updates/${n.related_entity_id}`);
    } else if (n.related_entity_type === "flightbook_section" && n.related_entity_id) {
      router.push(`/history`);
    }
    onClose();
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-label="Notifications"
        aria-modal="true"
        className={`fixed top-0 right-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] shadow-[var(--easa-shadow-2)] transition-transform duration-[250ms] ease-[cubic-bezier(0,0,0.2,1)] ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--easa-color-border)] px-5 py-4">
          <div className="flex items-center gap-2">
            <Bell size={18} strokeWidth={1.75} />
            <h2 className="text-base font-semibold">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--easa-color-accent-pink)] px-1.5 text-xs font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                className="easa-btn secondary flex items-center gap-1.5 px-2 py-1 text-xs"
                disabled={markingAll}
                onClick={markAllRead}
              >
                <CheckCheck size={13} strokeWidth={1.75} />
                {markingAll ? "Marking…" : "Mark all read"}
              </button>
            )}
            <button
              type="button"
              className="easa-btn secondary p-1.5"
              onClick={onClose}
              aria-label="Close notifications"
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && notifications.length === 0 ? (
            <div className="p-6 text-sm text-[var(--easa-color-text-muted)]">Loading…</div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
              <Bell size={32} strokeWidth={1.5} className="text-[var(--easa-color-text-muted)]" />
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="text-xs text-[var(--easa-color-text-muted)]">
                You will be notified when updates are approved, rejected, or need review.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--easa-color-border)]">
              {notifications.map((n) => {
                const clickable =
                  (n.related_entity_type === "proposed_update" && n.related_entity_id) ||
                  n.related_entity_type === "flightbook_section";
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={`flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-[var(--easa-color-surface-2)] ${
                        !n.read
                          ? "bg-[color-mix(in_srgb,var(--easa-color-accent-blue)_5%,transparent)]"
                          : ""
                      } ${clickable ? "cursor-pointer" : "cursor-default"}`}
                      onClick={() => handleNotifClick(n)}
                    >
                      <NotificationIcon type={n.type} />
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm leading-snug ${!n.read ? "font-semibold" : ""}`}>
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-[var(--easa-color-text-secondary)]">
                            {n.body}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
                          {relativeTime(n.created_at)}
                        </p>
                      </div>
                      {!n.read && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--easa-color-accent-blue)]" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-[var(--easa-color-border)] px-5 py-3">
          <Link
            href="/notifications"
            className="block w-full rounded-full border border-[var(--easa-color-border)] py-2 text-center text-sm font-medium text-[var(--easa-color-text-secondary)] transition hover:bg-[var(--easa-color-surface-2)]"
            onClick={onClose}
          >
            View all notifications
          </Link>
        </div>
      </div>
    </>
  );
}
