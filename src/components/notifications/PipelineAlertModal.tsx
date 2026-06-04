"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, X, ArrowRight, GripHorizontal, Newspaper, BookOpen } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { RealtimeChannel } from "@supabase/supabase-js";

type AlertData = {
  notificationId: string;
  totalPending: number;
  complianceCritical: number; // mandatory + high/medium risk
  newsAndAwareness: number;   // watchlist / informational
};

// Check for unread pipeline_summary notifications from the last 2 hours
async function loadLatestPipelineAlert(): Promise<AlertData | null> {
  const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const res = await fetch(`/api/notifications?type=pipeline_summary&since=${since}&limit=1`);
  if (!res.ok) return null;
  const json = await res.json();
  const notifs: { id: string; read: boolean; body: string | null }[] = json.notifications ?? [];
  const unread = notifs.find((n) => !n.read);
  if (!unread) return null;
  return parsePipelineBody(unread.id, unread.body);
}

function parsePipelineBody(id: string, body: string | null): AlertData {
  // Body format: "N flight book update candidates..."
  // We pull the count from it; compliance/news split comes from a separate call.
  const match = body?.match(/(\d+)\s+flight book/i);
  const total = match ? parseInt(match[1], 10) : 0;
  return {
    notificationId: id,
    totalPending: total,
    complianceCritical: 0,
    newsAndAwareness: 0,
  };
}

async function fetchUpdateBreakdown(): Promise<{ complianceCritical: number; newsAndAwareness: number; totalPending: number }> {
  const res = await fetch("/api/updates?status=pending&hasDraft=1&limit=1&page=1&actionOnly=1");
  if (!res.ok) return { complianceCritical: 0, newsAndAwareness: 0, totalPending: 0 };
  const json = await res.json();
  const total = json.total ?? 0;

  // Fetch high-risk mandatory count
  const critRes = await fetch("/api/updates?status=pending&hasDraft=1&risk=high&classification=mandatory&limit=1&page=1&actionOnly=1");
  const critJson = critRes.ok ? await critRes.json() : { total: 0 };
  const complianceCritical = critJson.total ?? 0;

  return {
    totalPending: total,
    complianceCritical,
    newsAndAwareness: Math.max(0, total - complianceCritical),
  };
}

async function markNotificationRead(id: string) {
  await fetch("/api/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: [id] }),
  });
}

export default function PipelineAlertModal() {
  const router = useRouter();
  const [alert, setAlert] = useState<AlertData | null>(null);
  const [visible, setVisible] = useState(false);
  const realtimeRef = useRef<RealtimeChannel | null>(null);

  // Drag state
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const dismiss = useCallback(async (notifId: string) => {
    setVisible(false);
    await markNotificationRead(notifId);
    setTimeout(() => setAlert(null), 300);
  }, []);

  const openQueue = useCallback(async (notifId: string) => {
    setVisible(false);
    await markNotificationRead(notifId);
    setTimeout(() => {
      setAlert(null);
      router.push("/updates");
    }, 150);
  }, [router]);

  const show = useCallback(async (base: AlertData) => {
    const breakdown = await fetchUpdateBreakdown();
    setAlert({
      ...base,
      totalPending: breakdown.totalPending || base.totalPending,
      complianceCritical: breakdown.complianceCritical,
      newsAndAwareness: breakdown.newsAndAwareness,
    });
    setPos(null); // reset to default position
    setVisible(true);
  }, []);

  // On mount: check for recent unread pipeline alerts
  useEffect(() => {
    let cancelled = false;
    loadLatestPipelineAlert().then((data) => {
      if (!cancelled && data && data.totalPending > 0) show(data);
    });
    return () => { cancelled = true; };
  }, [show]);

  // Supabase Realtime: watch for new pipeline_summary notifications
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    let cancelled = false;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled || !user) return;
      const channel = supabase
        .channel(`pipeline-alert:${user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          (payload) => {
            const row = payload.new as Record<string, unknown>;
            if (row.type !== "pipeline_summary") return;
            const base = parsePipelineBody(String(row.id), (row.body as string | null) ?? null);
            if (base.totalPending > 0) void show(base);
          },
        )
        .subscribe();
      realtimeRef.current = channel;
    });

    return () => {
      cancelled = true;
      const supabase = getSupabaseBrowserClient();
      if (supabase && realtimeRef.current) {
        supabase.removeChannel(realtimeRef.current);
        realtimeRef.current = null;
      }
    };
  }, [show]);

  // Drag handlers
  function onDragStart(e: React.MouseEvent) {
    if (!modalRef.current) return;
    const rect = modalRef.current.getBoundingClientRect();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: rect.left, origY: rect.top };
    e.preventDefault();

    function onMove(ev: MouseEvent) {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      const x = dragRef.current.origX + dx;
      const y = dragRef.current.origY + dy;
      setPos({ x: Math.max(0, x), y: Math.max(0, y) });
    }
    function onUp() {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  if (!alert) return null;

  const posStyle = pos
    ? { position: "fixed" as const, left: pos.x, top: pos.y, bottom: "auto", right: "auto" }
    : { position: "fixed" as const, bottom: "24px", right: "24px" };

  return (
    <div
      ref={modalRef}
      role="alertdialog"
      aria-label="New compliance updates detected"
      style={{ ...posStyle, zIndex: 9999, width: 360 }}
      className={`rounded-2xl border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] shadow-[var(--easa-shadow-2)] transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
    >
      {/* Drag handle / header */}
      <div
        onMouseDown={onDragStart}
        className="flex cursor-grab items-center justify-between rounded-t-2xl border-b border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-4 py-2.5 active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal size={14} strokeWidth={1.75} className="text-[var(--easa-color-text-muted)]" />
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--easa-color-text-muted)]">
            EASA Compliance Update
          </span>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          className="rounded p-1 text-[var(--easa-color-text-muted)] hover:text-[var(--easa-color-text-primary)] transition"
          onClick={() => void dismiss(alert.notificationId)}
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="mb-3 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--easa-color-accent-orange)_15%,transparent)]">
            <AlertTriangle size={18} strokeWidth={1.75} className="text-[var(--easa-color-accent-orange)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--easa-color-text-primary)]">
              {alert.totalPending} pending update{alert.totalPending === 1 ? "" : "s"} need your review
            </p>
            <p className="mt-0.5 text-xs text-[var(--easa-color-text-muted)]">
              The AI scan just completed and found items requiring action.
            </p>
          </div>
        </div>

        {/* Priority breakdown */}
        <div className="mb-4 space-y-2 rounded-xl border border-[var(--easa-color-border)] p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen size={13} strokeWidth={1.75} className="text-[var(--easa-color-accent-pink)]" />
              <span className="text-xs font-medium text-[var(--easa-color-text-primary)]">Book updates required</span>
            </div>
            <span className="rounded-full bg-[color-mix(in_srgb,var(--easa-color-accent-pink)_15%,transparent)] px-2 py-0.5 text-xs font-bold text-[var(--easa-color-accent-pink)]">
              {alert.complianceCritical}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Newspaper size={13} strokeWidth={1.75} className="text-[var(--easa-color-accent-blue)]" />
              <span className="text-xs font-medium text-[var(--easa-color-text-secondary)]">Regulatory news &amp; awareness</span>
            </div>
            <span className="rounded-full bg-[color-mix(in_srgb,var(--easa-color-accent-blue)_15%,transparent)] px-2 py-0.5 text-xs font-bold text-[var(--easa-color-accent-blue)]">
              {alert.newsAndAwareness}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void openQueue(alert.notificationId)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--easa-color-accent-blue)] px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Review updates
            <ArrowRight size={14} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => void dismiss(alert.notificationId)}
            className="rounded-xl border border-[var(--easa-color-border)] px-3 py-2 text-sm font-medium text-[var(--easa-color-text-secondary)] transition hover:bg-[var(--easa-color-surface-2)]"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
