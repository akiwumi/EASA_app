"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import type { AuditSnapshotPreview, QueuePreviewItem } from "@/services/dashboard";

// ─── Types ───────────────────────────────────────────────────────────────────

type Props = {
  userName: string;
  userInitials: string;
  userRole: string;
  pendingReviews: number;
  newChanges7d: number;
  approvedThisWeek: number;
  pendingApprovals: number;
  flightbookCount: number;
  sourcesTotal: number;
  sourcesActive: number;
  dateDay: number;
  dateLabel: string;
  queuePreview: QueuePreviewItem[];
  latestAuditSnapshot: AuditSnapshotPreview | null;
};

// ─── Icons ───────────────────────────────────────────────────────────────────

function Icon({
  name,
  size = 18,
  color = "currentColor",
  stroke = 1.7,
}: {
  name: string;
  size?: number;
  color?: string;
  stroke?: number;
}) {
  const sunBurstLines = [
    ["35", "24", "42", "24"],
    ["33.526", "29.5", "39.588", "33"],
    ["29.5", "33.526", "33", "39.588"],
    ["24", "35", "24", "42"],
    ["18.5", "33.526", "15", "39.588"],
    ["14.474", "29.5", "8.412", "33"],
    ["13", "24", "6", "24"],
    ["14.474", "18.5", "8.412", "15"],
    ["18.5", "14.474", "15", "8.412"],
    ["24", "13", "24", "6"],
    ["29.5", "14.474", "33", "8.412"],
    ["33.526", "18.5", "39.588", "15"],
  ];
  const p = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "menu":
      return (
        <svg {...p}>
          <line x1="4" y1="9" x2="20" y2="9" />
          <line x1="4" y1="15" x2="14" y2="15" />
        </svg>
      );
    case "plus":
      return (
        <svg {...p}>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      );
    case "search":
      return (
        <svg {...p}>
          <circle cx="11" cy="11" r="7" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" />
        </svg>
      );
    case "mic":
      return (
        <svg {...p}>
          <rect x="9" y="3" width="6" height="12" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0" />
          <line x1="12" y1="18" x2="12" y2="22" />
        </svg>
      );
    case "arrow-right":
      return (
        <svg {...p}>
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="13 6 19 12 13 18" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...p}>
          <rect x="4" y="6" width="16" height="14" rx="3" />
          <line x1="4" y1="11" x2="20" y2="11" />
          <line x1="9" y1="4" x2="9" y2="8" />
          <line x1="15" y1="4" x2="15" y2="8" />
        </svg>
      );
    case "chevron-down":
      return (
        <svg {...p}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      );
    case "lock":
      return (
        <svg {...p}>
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      );
    case "unlock":
      return (
        <svg {...p}>
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 7-2.7" />
        </svg>
      );
    case "bars":
      return (
        <svg {...p}>
          <line x1="5" y1="20" x2="5" y2="14" />
          <line x1="10" y1="20" x2="10" y2="10" />
          <line x1="15" y1="20" x2="15" y2="6" />
          <line x1="20" y1="20" x2="20" y2="13" />
        </svg>
      );
    case "filter":
      return (
        <svg {...p}>
          <polygon points="4 5 20 5 14 13 14 19 10 21 10 13 4 5" />
        </svg>
      );
    case "more":
      return (
        <svg {...p}>
          <circle cx="6" cy="12" r="1.2" fill={color} stroke="none" />
          <circle cx="12" cy="12" r="1.2" fill={color} stroke="none" />
          <circle cx="18" cy="12" r="1.2" fill={color} stroke="none" />
        </svg>
      );
    case "expand":
      return (
        <svg {...p}>
          <polyline points="4 9 4 4 9 4" />
          <polyline points="20 9 20 4 15 4" />
          <polyline points="4 15 4 20 9 20" />
          <polyline points="20 15 20 20 15 20" />
        </svg>
      );
    case "chart-line":
      return (
        <svg {...p}>
          <polyline points="4 17 9 11 13 14 20 6" />
        </svg>
      );
    case "share":
      return (
        <svg {...p}>
          <circle cx="6" cy="12" r="2.5" />
          <circle cx="18" cy="6" r="2.5" />
          <circle cx="18" cy="18" r="2.5" />
          <line x1="8" y1="11" x2="16" y2="7" />
          <line x1="8" y1="13" x2="16" y2="17" />
        </svg>
      );
    case "edit":
      return (
        <svg {...p}>
          <path d="M4 20h4l10-10-4-4L4 16v4z" />
          <line x1="14" y1="6" x2="18" y2="10" />
        </svg>
      );
    case "close":
      return (
        <svg {...p}>
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="6" y1="18" x2="18" y2="6" />
        </svg>
      );
    case "check":
      return (
        <svg {...p}>
          <polyline points="5 12 10 17 19 7" />
        </svg>
      );
    case "plane":
      return (
        <svg {...p}>
          <path d="M3 14l8-2 2-9 2 9 8 2-8 2-2 5-2-5-8-2z" />
        </svg>
      );
    case "book":
      return (
        <svg {...p}>
          <path d="M4 5a2 2 0 0 1 2-2h11v15H6a2 2 0 0 0-2 2V5z" />
          <line x1="4" y1="20" x2="17" y2="20" />
        </svg>
      );
    case "shield-check":
      return (
        <svg {...p}>
          <path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3z" />
          <polyline points="9 12 11.5 14.5 16 10" />
        </svg>
      );
    case "file-text":
      return (
        <svg {...p}>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" />
          <polyline points="14 3 14 8 19 8" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="13" y2="17" />
        </svg>
      );
    case "list-check":
      return (
        <svg {...p}>
          <line x1="11" y1="6" x2="20" y2="6" />
          <line x1="11" y1="12" x2="20" y2="12" />
          <line x1="11" y1="18" x2="20" y2="18" />
          <polyline points="4 6 5 7 7 5" />
          <polyline points="4 12 5 13 7 11" />
          <polyline points="4 18 5 19 7 17" />
        </svg>
      );
    case "gavel":
      return (
        <svg {...p}>
          <line x1="14" y1="3" x2="21" y2="10" />
          <line x1="11" y1="6" x2="18" y2="13" />
          <path d="M12 7l-9 9 3 3 9-9" />
          <line x1="3" y1="21" x2="13" y2="21" />
        </svg>
      );
    case "sun-burst":
      return (
        <svg
          viewBox="0 0 48 48"
          width={size}
          height={size}
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <circle cx="24" cy="24" r="6" fill="#c66747" />
          {sunBurstLines.map(([x1, y1, x2, y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#c66747" />
          ))}
        </svg>
      );
    default:
      return null;
  }
}

// ─── Charts ──────────────────────────────────────────────────────────────────

function GrowthDial({ pct = 92 }: { pct?: number }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <svg className="fl-growth-svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="flGrowthArc" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#c66747" />
          <stop offset="100%" stopColor="#e2967d" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
      <circle
        cx="50" cy="50" r={r}
        fill="none"
        stroke="url(#flGrowthArc)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={off}
        style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)" }}
      />
    </svg>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PeriodDropdown({ value, setValue }: { value: string; setValue: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const opts = ["Daily", "Weekly", "Monthly", "Yearly"];
  return (
    <div style={{ position: "relative" }}>
      <button className="fl-dropdown fl-compact" onClick={() => setOpen(!open)}>
        {value} <Icon name="chevron-down" size={12} />
      </button>
      {open && (
        <div className="fl-period-dropdown-menu">
          {opts.map((o) => (
            <button
              key={o}
              onClick={() => { setValue(o); setOpen(false); }}
              style={{
                background: o === value ? "var(--fl-accent-soft)" : "transparent",
                color: o === value ? "var(--fl-accent)" : "inherit",
              }}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ManualCard({
  flightbookCount,
  pendingReviews,
  approvedThisWeek,
}: {
  flightbookCount: number;
  pendingReviews: number;
  approvedThisWeek: number;
}) {
  const [mode, setMode] = useState<"live" | "draft">("live");
  return (
    <div className="fl-card fl-visa">
      <div className="fl-visa-top">
        <div className="fl-visa-logo">
          <span style={{ width: 36, height: 36, borderRadius: 10, background: "var(--fl-black)", color: "#fff", display: "grid", placeItems: "center" }}>
            <Icon name="book" size={18} stroke={1.8} />
          </span>
          Flight books
        </div>
        <Link href="/flightbooks" className="fl-dropdown">Open library <Icon name="arrow-right" size={14} /></Link>
      </div>
      <div className="fl-visa-label">Active manuals in this organisation</div>
      <div className="fl-visa-number">
        {flightbookCount}{" "}
        <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: "var(--fl-teal-soft)", color: "var(--fl-black)", marginLeft: 8, letterSpacing: 0 }}>
          LIVE
        </span>
      </div>
      <div className="fl-send-receive">
        <button className={`fl-toggle-btn ${mode === "live" ? "fl-active" : ""}`} onClick={() => setMode("live")}>{pendingReviews} pending</button>
        <button className={`fl-toggle-btn ${mode === "draft" ? "fl-active" : ""}`} onClick={() => setMode("draft")}>{approvedThisWeek} approved</button>
      </div>
      <div className="fl-visa-foot">
        <div>
          <div className="fl-foot-label">Review queue status</div>
          <div className="fl-foot-value" style={{ fontSize: 20 }}>{pendingReviews === 0 ? "Clear" : `${pendingReviews} open`}</div>
        </div>
        <Link href="/flightbooks" className="fl-edit-pill">
          <div className="fl-dot-ico"><Icon name="edit" size={14} stroke={2} /></div>
          <span>Open<br />revision history</span>
        </Link>
      </div>
    </div>
  );
}

function ChangesCard({ value, period, setPeriod }: { value: string; period: string; setPeriod: (v: string) => void }) {
  return (
    <div className="fl-card fl-card-sm fl-flow-card">
      <div className="fl-flow-row">
        <div className="fl-flow-icon"><Icon name="gavel" size={18} color="#8c8c87" /></div>
        <div className="fl-flow-mid">
          <div className="fl-flow-label">EASA changes detected</div>
          <div className="fl-flow-value">
            {value}
            <span style={{ fontSize: 13, color: "var(--fl-muted)", marginLeft: 6, fontWeight: 600 }}>regulations</span>
          </div>
        </div>
        <PeriodDropdown value={period} setValue={setPeriod} />
      </div>
    </div>
  );
}

function AckCard({ value, total, period, setPeriod }: { value: string; total: string; period: string; setPeriod: (v: string) => void }) {
  return (
    <div className="fl-card fl-card-sm fl-flow-card">
      <div className="fl-flow-row">
        <div className="fl-flow-icon"><Icon name="shield-check" size={18} color="#8c8c87" /></div>
        <div className="fl-flow-mid">
          <div className="fl-flow-label">Acknowledgements logged</div>
          <div className="fl-flow-value">
            {value}
            <span style={{ fontSize: 13, color: "var(--fl-muted)", marginLeft: 6, fontWeight: 600 }}>/ {total}</span>
          </div>
        </div>
        <PeriodDropdown value={period} setValue={setPeriod} />
      </div>
      <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
        <Link href="/updates" className="fl-flow-action">
          <span className="fl-chart-ico"><Icon name="chart-line" size={14} stroke={2} /></span>
          <span>View<br />by status</span>
        </Link>
      </div>
    </div>
  );
}

function LockCard({ locked, onToggle }: { locked: boolean; onToggle: () => void }) {
  return (
    <div
      className={`fl-card fl-lock-card ${locked ? "fl-locked" : ""}`}
      onClick={onToggle}
      title="Freeze current manual versions for audit"
    >
      <div className="fl-lock-inner">
        <Icon name={locked ? "lock" : "unlock"} size={26} color="#1f3434" stroke={1.8} />
        <div className="fl-lock-label">{locked ? "Audit Lock" : "Unlocked"}</div>
      </div>
    </div>
  );
}

function AckRateCard({ pct }: { pct: number }) {
  return (
    <div className="fl-card fl-growth-card">
      <GrowthDial pct={pct} />
      <div style={{ textAlign: "center", position: "relative", zIndex: 2 }}>
        <div className="fl-pct">{pct}%</div>
        <div className="fl-lbl">Ack. rate</div>
      </div>
    </div>
  );
}

function SourceHealthCard({ active, total }: { active: number; total: number }) {
  return (
    <div className="fl-card fl-days-card fl-days">
      <div className="fl-days-head">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="fl-flow-icon" style={{ width: 36, height: 36 }}>
            <Icon name="shield-check" size={16} color="#8c8c87" />
          </div>
          <div style={{ fontSize: 12, color: "var(--fl-muted)", fontWeight: 600 }}>RSS source health</div>
        </div>
      </div>
      <div>
        <div className="fl-days-num">{active} / {total}</div>
        <div className="fl-days-sub">active sources</div>
      </div>
      <div className="fl-days-dots">
        {Array.from({ length: Math.max(total, 1) }).slice(0, 26).map((_, i) => (
          <div key={i} className={`fl-d ${i < active ? "fl-on" : ""}`} />
        ))}
      </div>
    </div>
  );
}

function QueueStatusCard({ pendingReviews, approvedThisWeek }: { pendingReviews: number; approvedThisWeek: number }) {
  return (
    <div className="fl-card fl-year-card fl-year">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Icon name="bars" size={18} color="#8c8c87" />
        <div style={{ fontSize: 11, color: "var(--fl-muted)", fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase" }}>
          Queue
        </div>
      </div>
      <div className="fl-queue-stat">
        <strong>{pendingReviews}</strong>
        <span>pending</span>
      </div>
      <div className="fl-queue-stat fl-muted-stat">
        <strong>{approvedThisWeek}</strong>
        <span>approved this week</span>
      </div>
    </div>
  );
}

function LiveMixCard({
  pendingReviews,
  newChanges7d,
  approvedThisWeek,
  flightbookCount,
}: {
  pendingReviews: number;
  newChanges7d: number;
  approvedThisWeek: number;
  flightbookCount: number;
}) {
  const rows = [
    { label: "Pending reviews", value: pendingReviews, accent: true },
    { label: "Changes (last 7 days)", value: newChanges7d, accent: false },
    { label: "Approved this week", value: approvedThisWeek, accent: false },
    { label: "Active flight books", value: flightbookCount, accent: false },
  ];
  return (
    <div className="fl-card fl-profits">
      <div className="fl-profits-head">
        <div>
          <div className="fl-profits-title">Live dashboard mix</div>
          <div style={{ fontSize: 12, color: "var(--fl-muted)", marginTop: 2 }}>From current organisation data</div>
        </div>
      </div>
      <div className="fl-mix-list">
        {rows.map((row, i) => (
          <div key={i} className="fl-mix-row">
            <span className="fl-mix-label">{row.label}</span>
            <span className={`fl-mix-value${row.accent ? " fl-mix-accent" : ""}`}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatSnapshotTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  return `${day} ${month} ${year}, ${hours}:${minutes} UTC`;
}

function ReviewQueueCard({
  pendingCount,
  latestAuditSnapshot,
  onOpenPendingReviews,
  onRunAi,
  aiRunStatus,
}: {
  pendingCount: number;
  latestAuditSnapshot: AuditSnapshotPreview | null;
  onOpenPendingReviews: () => void;
  onRunAi: () => void;
  aiRunStatus: "idle" | "running" | "done" | "error";
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [reviewActive, setReviewActive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<AuditSnapshotPreview | null>(latestAuditSnapshot);
  const [snapshotStatus, setSnapshotStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [snapshotMessage, setSnapshotMessage] = useState<string | null>(null);

  useEffect(() => {
    setSnapshot(latestAuditSnapshot);
  }, [latestAuditSnapshot]);

  const activateReview = () => {
    setReviewActive(true);
    onOpenPendingReviews();
  };

  const takeSnapshot = async () => {
    setSnapshotStatus("saving");
    setSnapshotMessage(null);
    try {
      const response = await fetch("/api/audit-snapshots", { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.error) {
        throw new Error(String(payload?.error ?? "Unable to create audit snapshot."));
      }
      const created = payload?.snapshot;
      if (created?.id) {
        setSnapshot({
          id: String(created.id),
          label: String(created.label ?? "Audit baseline"),
          createdAt: String(created.created_at ?? new Date().toISOString()),
          flightbookCount: Number(created.flightbook_count ?? 0),
          pendingReviewCount: Number(created.pending_review_count ?? 0),
          activeSourceCount: Number(created.active_source_count ?? 0),
          totalSourceCount: Number(created.total_source_count ?? 0),
        });
      }
      setSnapshotStatus("saved");
      setSnapshotMessage(`Snapshot saved with ${payload?.exports?.length ?? 0} flight book export${payload?.exports?.length === 1 ? "" : "s"}.`);
      router.refresh();
    } catch (error) {
      setSnapshotStatus("error");
      setSnapshotMessage(error instanceof Error ? error.message : "Unable to create audit snapshot.");
    }
  };

  return (
    <div className="fl-card fl-activity">
      <div style={{ marginBottom: 16 }}>
        <div className="fl-activity-title">Review queue</div>
        <div style={{ fontSize: 12, color: "var(--fl-muted)", marginTop: 2 }}>
          {aiRunStatus === "running" ? "RSS retrieval and AI analysis running" : "Pending compliance approvals"}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <div className="fl-act-search">
          <Icon name="search" size={14} color="#8c8c87" />
          <input
            placeholder="Search regulations..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="fl-activity-filter-row" style={{ marginBottom: 0 }}>
          <span className="fl-chip"><span className="fl-chip-dot" />Live queue</span>
          <span className="fl-chip">{pendingCount} pending</span>
        </div>
      </div>
      {(aiRunStatus === "running" || aiRunStatus === "done" || reviewActive) && (
        <div className="fl-ai-status">
          <span className={aiRunStatus === "running" || aiRunStatus === "done" ? "fl-on" : ""}>
            AI {aiRunStatus === "running" ? "running" : aiRunStatus === "done" ? "complete" : "idle"}
          </span>
          <span className={reviewActive ? "fl-on" : ""}>Review {reviewActive ? "active" : "idle"}</span>
        </div>
      )}

      <div className="fl-activity-cards">
        <div className="fl-card fl-wave-card" style={{ background: "#fff", border: "1px solid var(--fl-line)" }}>
          <div className="fl-wave-amount" style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span className="fl-wa-accent">{pendingCount}</span>
            <span style={{ fontSize: 13, color: "var(--fl-muted)", fontWeight: 600 }}>pending reviews</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--fl-muted)", marginTop: 4 }}>Live from proposed updates</div>
          <button className="fl-open-queue-btn" onClick={activateReview}>Open pending reviews</button>
        </div>

        <div className="fl-card fl-plan-card">
          <div className="fl-plan-head">
            <div className="fl-plan-title">Review controls</div>
          </div>
          <div className="fl-plan-list">
            <div className="fl-plan-item">
              <div className="fl-pi-icon"><Icon name="gavel" size={14} /></div>
              <button className="fl-plan-pill" onClick={activateReview}>View details <Icon name="arrow-right" size={12} /></button>
            </div>
            <div className="fl-plan-item">
              <div className={`fl-pi-icon ${aiRunStatus === "running" || aiRunStatus === "done" ? "" : "fl-muted"}`}>
                <Icon name="shield-check" size={14} />
              </div>
              <button className="fl-plan-pill fl-text" onClick={onRunAi} disabled={aiRunStatus === "running"}>
                {aiRunStatus === "running" ? "AI running…" : aiRunStatus === "done" ? "AI complete" : "Run RSS + AI"}
              </button>
            </div>
            <div className="fl-plan-item">
              <div className={`fl-pi-icon ${reviewActive ? "" : "fl-muted"}`}><Icon name="bars" size={14} /></div>
              <button className="fl-plan-pill fl-text" onClick={activateReview}>
                {reviewActive ? "Review active" : "Start review"}
              </button>
            </div>
            <div className="fl-plan-item">
              <div className="fl-pi-icon"><Icon name="file-text" size={14} /></div>
              <Link className="fl-plan-pill fl-text" href="/updates">Full queue</Link>
            </div>
          </div>
        </div>

      </div>

      {/* Audit Snapshot — below queue cards, inside the same section */}
      <div className="fl-snapshot-strip">
        <div className="fl-snapshot-strip-left">
          <Icon name="sun-burst" size={32} />
        </div>
        <div className="fl-snapshot-strip-body">
          <div className="fl-verify-title">Audit Snapshot</div>
          {snapshot ? (
            <div className="fl-verify-desc">
              <span style={{ fontWeight: 600, color: "var(--fl-ink)" }}>{snapshot.label}</span>
              <span style={{ margin: "0 6px", opacity: 0.3 }}>·</span>
              <span>{formatSnapshotTimestamp(snapshot.createdAt)}</span>
              {snapshotMessage && <span style={{ marginLeft: 8, color: "var(--fl-accent)" }}>{snapshotMessage}</span>}
            </div>
          ) : (
            <div className="fl-verify-desc">
              Store a baseline of flight book exports, queue counts, and source status.
              {snapshotMessage && <span style={{ marginLeft: 8, color: "var(--fl-accent)" }}>{snapshotMessage}</span>}
            </div>
          )}
        </div>
        <button
          className={`fl-snapshot-btn ${snapshotStatus === "saved" ? "fl-enabled" : ""}`}
          onClick={takeSnapshot}
          disabled={snapshotStatus === "saving"}
        >
          {snapshotStatus === "saving" ? "Saving…" : snapshot ? "New snapshot" : "Take snapshot"}
        </button>
      </div>
    </div>
  );
}

function AckLogCard({ total }: { total: number }) {
  const formatted = total >= 1000 ? `${(total / 1000).toFixed(1)}k` : String(total);
  return (
    <div className="fl-card fl-stocks-card fl-stocks">
      <div className="fl-stocks-top">
        <div className="fl-stocks-icon"><Icon name="list-check" size={16} color="#c66747" /></div>
        <div className="fl-stocks-amount">
          {formatted}{" "}
          <span style={{ fontSize: 12, color: "var(--fl-muted)", marginLeft: 4, fontWeight: 600 }}>approved</span>
        </div>
      </div>
      <div className="fl-live-count-note">Live count from approval records.</div>
      <div className="fl-stocks-foot">
        <div>
          <div className="fl-stocks-label">Approved this week</div>
          <div className="fl-stocks-sub">From approval records</div>
        </div>
        <div className="fl-stocks-pct">{total === 0 ? "0" : `+ ${total}`}</div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FLDesignDashboard({
  userName,
  pendingReviews,
  newChanges7d,
  approvedThisWeek,
  pendingApprovals,
  flightbookCount,
  sourcesTotal,
  sourcesActive,
  dateDay,
  dateLabel,
  queuePreview,
  latestAuditSnapshot,
}: Props) {
  const router = useRouter();
  const [locked, setLocked] = useState(true);
  const [changePeriod, setChangePeriod] = useState("Weekly");
  const [ackPeriod, setAckPeriod] = useState("Weekly");
  const [tasksOpen, setTasksOpen] = useState(false);
  const [reviews, setReviews] = useState<QueuePreviewItem[]>(queuePreview);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(queuePreview[0]?.id ?? null);
  const [reviewAction, setReviewAction] = useState<"idle" | "approving" | "deleting">("idle");
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const [aiRunStatus, setAiRunStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [aiRunMessage, setAiRunMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const changeValue =
    changePeriod === "Weekly" ? String(newChanges7d) :
    changePeriod === "Daily" ? String(Math.ceil(newChanges7d / 7)) :
    changePeriod === "Monthly" ? String(newChanges7d * 4) :
    String(newChanges7d * 52);

  const ack =
    ackPeriod === "Weekly" ? { v: String(approvedThisWeek), t: String(pendingApprovals + approvedThisWeek) } :
    ackPeriod === "Daily" ? { v: String(Math.ceil(approvedThisWeek / 7)), t: String(Math.ceil((pendingApprovals + approvedThisWeek) / 7)) } :
    ackPeriod === "Monthly" ? { v: String(approvedThisWeek * 4), t: String((pendingApprovals + approvedThisWeek) * 4) } :
    { v: String(approvedThisWeek * 52), t: String((pendingApprovals + approvedThisWeek) * 52) };

  useEffect(() => {
    setReviews(queuePreview);
    setSelectedReviewId((current) => current && queuePreview.some((item) => item.id === current) ? current : queuePreview[0]?.id ?? null);
  }, [queuePreview]);

  const pending = pendingReviews;

  const selectedReview = reviews.find((item) => item.id === selectedReviewId) ?? reviews[0] ?? null;
  const totalAcks = approvedThisWeek;
  const ackRate = pendingApprovals + approvedThisWeek > 0
    ? Math.round((approvedThisWeek / (pendingApprovals + approvedThisWeek)) * 100)
    : 0;

  const removeReview = useCallback((id: string) => {
    setReviews((prev) => {
      const next = prev.filter((item) => item.id !== id);
      setSelectedReviewId(next[0]?.id ?? null);
      return next;
    });
  }, []);

  const actOnReview = useCallback(async (id: string, action: "approved" | "delete") => {
    setReviewAction(action === "approved" ? "approving" : "deleting");
    setReviewMessage(null);
    try {
      const response = await fetch("/api/updates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id], action }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.error) {
        throw new Error(String(payload?.error ?? `Unable to ${action === "approved" ? "approve" : "delete"} review.`));
      }
      removeReview(id);
      setReviewMessage(action === "approved" ? "Review approved and applied where mapped." : "Review deleted.");
      router.refresh();
    } catch (error) {
      setReviewMessage(error instanceof Error ? error.message : "Review action failed.");
    } finally {
      setReviewAction("idle");
    }
  }, [removeReview, router]);

  const runAiPipeline = useCallback(async () => {
    setAiRunStatus("running");
    setAiRunMessage(null);
    try {
      const response = await fetch("/api/run-scrape", { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        throw new Error(String(payload?.error ?? "Unable to run AI pipeline."));
      }
      const analyzed = payload?.analyze?.analyzed;
      const created = payload?.aggregate?.created;
      setAiRunStatus("done");
      setAiRunMessage(
        `AI run complete${typeof analyzed === "number" ? ` · ${analyzed} analysed` : ""}${typeof created === "number" ? ` · ${created} changes queued` : ""}.`,
      );
      router.refresh();
    } catch (error) {
      setAiRunStatus("error");
      setAiRunMessage(error instanceof Error ? error.message : "Unable to run AI pipeline.");
    }
  }, [router]);

  const tasksDrawer = (
    <div className={`fl-tasks-drawer ${tasksOpen ? "fl-open" : ""}`}>
      <button className="fl-task-close" onClick={() => setTasksOpen(false)}>
        <Icon name="close" size={14} />
      </button>
      <h3>Pending reviews</h3>
      <div className="fl-drawer-sub">
        {dateLabel} · {pending} open
      </div>
      {reviews.length === 0 ? (
        <div className="fl-empty-reviews">
          No pending reviews in the live queue.
        </div>
      ) : (
        reviews.map((review) => (
          <div key={review.id} className={`fl-task ${selectedReview?.id === review.id ? "fl-selected" : ""}`}>
            <button className="fl-check" onClick={() => setSelectedReviewId(review.id)} aria-label={`View ${review.title}`}>
              {selectedReview?.id === review.id && <Icon name="check" size={12} stroke={3} />}
            </button>
            <div>
              <button className="fl-ttext" onClick={() => setSelectedReviewId(review.id)}>{review.title}</button>
              <div className="fl-tsub">{review.risk} · {review.confidence} confidence · {review.status}</div>
            </div>
          </div>
        ))
      )}
      {selectedReview && (
        <div className="fl-review-detail">
          <div className="fl-review-detail-kicker">{selectedReview.classification} · {selectedReview.risk}</div>
          <h4>{selectedReview.title}</h4>
          <p>{selectedReview.summary}</p>
          <div className="fl-review-detail-meta">
            <span>Status: {selectedReview.status}</span>
            <span>Confidence: {selectedReview.confidence}</span>
          </div>
          <div className="fl-review-detail-actions">
            <button
              className="fl-review-approve"
              disabled={reviewAction !== "idle"}
              onClick={() => actOnReview(selectedReview.id, "approved")}
            >
              {reviewAction === "approving" ? "Approving..." : "Approve"}
            </button>
            <button
              className="fl-review-delete"
              disabled={reviewAction !== "idle"}
              onClick={() => actOnReview(selectedReview.id, "delete")}
            >
              {reviewAction === "deleting" ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      )}
      {reviewMessage && <div className="fl-drawer-message">{reviewMessage}</div>}
    </div>
  );

  return (
    <>
      <div className="fl-dash">
        {/* HERO */}
        <div className="fl-hero">
          <div className="fl-date-task">
            <div className="fl-date-pill">
              <div className="fl-date-num">{dateDay}</div>
              <div className="fl-date-text">{dateLabel}</div>
            </div>
            <div className="fl-date-divider" />
            <button className="fl-tasks-btn" onClick={() => setTasksOpen(true)}>
              {pending} pending reviews
              <span className="fl-arrow"><Icon name="arrow-right" size={16} stroke={2} /></span>
            </button>
            <Link href="/dashboard" className="fl-cal-btn" title="Audit calendar">
              <Icon name="calendar" size={20} />
            </Link>
          </div>

          <div className="fl-ai-hero-action">
            <button
              className={`fl-run-ai-btn fl-run-ai-btn-primary ${aiRunStatus === "running" ? "fl-running" : ""}`}
              onClick={runAiPipeline}
              disabled={aiRunStatus === "running"}
              aria-label="Run RSS retrieval and AI analysis"
            >
              <span className="fl-run-ai-icon"><Icon name="sun-burst" size={16} /></span>
              <span className="fl-run-ai-copy">
                <span>{aiRunStatus === "running" ? "Running AI" : "Run AI"}</span>
                <small>Retrieve RSS updates and analyse changes</small>
              </span>
              <span className="fl-run-ai-arrow"><Icon name="arrow-right" size={12} stroke={2.2} /></span>
            </button>
          </div>
          {aiRunMessage && (
            <div className={`fl-ai-run-message ${aiRunStatus === "error" ? "fl-error" : ""}`}>
              {aiRunMessage}
            </div>
          )}
        </div>

        {/* MAIN GRID */}
        <div className="fl-grid">
          {/* Sidebar mini */}
          <div className="fl-side-col">
            <div className="fl-side-pill">
              <span className="fl-dot" />
              <span className="fl-dot" />
              <span className="fl-dot" />
            </div>
            <button className="fl-side-icon-btn" title="New manual"><Icon name="plus" size={18} /></button>
            <button className="fl-side-icon-btn" title="Share to instructors"><Icon name="share" size={16} /></button>
          </div>

          <ManualCard
            flightbookCount={flightbookCount}
            pendingReviews={pendingReviews}
            approvedThisWeek={approvedThisWeek}
          />

          <div className="fl-flows">
            <ChangesCard value={changeValue} period={changePeriod} setPeriod={setChangePeriod} />
            <AckCard value={ack.v} total={ack.t} period={ackPeriod} setPeriod={setAckPeriod} />
          </div>

          <div className="fl-dials">
            <LockCard locked={locked} onToggle={() => setLocked((l) => !l)} />
            <AckRateCard pct={ackRate} />
          </div>

          <SourceHealthCard active={sourcesActive} total={sourcesTotal} />

          {/* Unified compliance section */}
          <div className="fl-unified-section">
            <QueueStatusCard pendingReviews={pendingReviews} approvedThisWeek={approvedThisWeek} />
            <LiveMixCard
              pendingReviews={pendingReviews}
              newChanges7d={newChanges7d}
              approvedThisWeek={approvedThisWeek}
              flightbookCount={flightbookCount}
            />
            <ReviewQueueCard
              pendingCount={pendingReviews}
              latestAuditSnapshot={latestAuditSnapshot}
              onOpenPendingReviews={() => setTasksOpen(true)}
              onRunAi={runAiPipeline}
              aiRunStatus={aiRunStatus}
            />
          </div>

          <AckLogCard total={totalAcks} />
        </div>
      </div>

      {mounted && typeof document !== "undefined" ? createPortal(tasksDrawer, document.body) : null}
    </>
  );
}
