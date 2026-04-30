"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle,
  XCircle,
  RotateCcw,
  Clock,
  AlertCircle,
  CheckCheck,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  read: boolean;
  created_at: string;
}

function NotificationIcon({ type }: { type: string }) {
  const cls = "shrink-0";
  if (type === "approved")
    return <CheckCircle size={18} strokeWidth={1.75} className={`${cls} text-[var(--easa-color-accent-green)]`} />;
  if (type === "rejected")
    return <XCircle size={18} strokeWidth={1.75} className={`${cls} text-[var(--easa-color-accent-pink)]`} />;
  if (type === "rollback")
    return <RotateCcw size={18} strokeWidth={1.75} className={`${cls} text-[var(--easa-color-accent-orange)]`} />;
  if (type === "revision_requested")
    return <AlertCircle size={18} strokeWidth={1.75} className={`${cls} text-[var(--easa-color-accent-yellow)]`} />;
  if (type === "pending" || type === "new_change" || type === "approval_needed")
    return <Clock size={18} strokeWidth={1.75} className={`${cls} text-[var(--easa-color-accent-blue)]`} />;
  return <Bell size={18} strokeWidth={1.75} className={`${cls} text-[var(--easa-color-text-muted)]`} />;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days !== 1 ? "s" : ""} ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function NotificationsList() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const realtimeRef = useRef<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/notifications");
    if (!res.ok) {
      setError("Failed to load notifications");
      setLoading(false);
      return;
    }
    const json = await res.json();
    setNotifications(json.notifications ?? []);
    setUnreadCount(json.unreadCount ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Supabase Realtime — prepend new notifications and update read status live
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let cancelled = false;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled || !user) return;

      const channel = supabase
        .channel(`notiflist:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const n = payload.new as Notification;
            setNotifications((prev) => [n, ...prev]);
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
          (payload) => {
            const updated = payload.new as Notification;
            setNotifications((prev) =>
              prev.map((n) => (n.id === updated.id ? updated : n)),
            );
            setUnreadCount((prev) =>
              prev === 0 ? 0 : (!updated.read ? prev : Math.max(0, prev - 1)),
            );
          },
        )
        .subscribe();

      realtimeRef.current = channel;
    });

    return () => {
      cancelled = true;
      if (realtimeRef.current) {
        const sb = getSupabaseBrowserClient();
        sb?.removeChannel(realtimeRef.current);
        realtimeRef.current = null;
      }
    };
  }, []);

  async function markRead(ids: string[]) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - ids.length));
  }

  async function markAllRead() {
    setMarkingAll(true);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    setMarkingAll(false);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--easa-color-accent-pink)] px-1.5 text-xs font-semibold text-white">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="mt-0.5 text-sm text-[var(--easa-color-text-muted)]">
            {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            className="easa-btn secondary flex items-center gap-2 text-sm"
            disabled={markingAll}
            onClick={markAllRead}
          >
            <CheckCheck size={15} strokeWidth={1.75} />
            {markingAll ? "Marking…" : "Mark all as read"}
          </button>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <div className="easa-card p-6">
          <p className="text-sm text-[var(--easa-color-text-muted)]">Loading…</p>
        </div>
      ) : error ? (
        <div className="easa-card p-6">
          <p className="text-sm text-[var(--easa-color-accent-pink)]">{error}</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="easa-card p-10 text-center">
          <Bell
            size={32}
            strokeWidth={1.5}
            className="mx-auto mb-3 text-[var(--easa-color-text-muted)]"
          />
          <p className="text-sm font-medium">No notifications yet</p>
          <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
            You will be notified when updates are approved, rejected, or require action.
          </p>
        </div>
      ) : (
        <div className="easa-card divide-y divide-[var(--easa-color-border)] p-0">
          {notifications.map((n) => {
            const isLink =
              n.related_entity_type === "proposed_update" && n.related_entity_id;
            const href = isLink ? `/updates/${n.related_entity_id}` : null;

            const inner = (
              <div
                className={`flex items-start gap-3 px-5 py-4 transition ${
                  n.read
                    ? ""
                    : "bg-[color-mix(in_srgb,var(--easa-color-accent-blue)_5%,transparent)]"
                }`}
              >
                <NotificationIcon type={n.type} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm leading-snug ${n.read ? "" : "font-semibold"}`}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="mt-0.5 text-xs text-[var(--easa-color-text-secondary)]">
                      {n.body}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-[var(--easa-color-text-muted)]">
                    {relativeTime(n.created_at)}
                  </p>
                </div>
                {!n.read && (
                  <button
                    type="button"
                    className="easa-btn secondary shrink-0 px-2 py-1 text-xs"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      markRead([n.id]);
                    }}
                  >
                    Mark read
                  </button>
                )}
              </div>
            );

            return href ? (
              <Link key={n.id} href={href} className="block hover:bg-[var(--easa-color-surface-2)] transition">
                {inner}
              </Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
