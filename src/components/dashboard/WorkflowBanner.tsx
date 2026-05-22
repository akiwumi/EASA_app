import Link from "next/link";
import { CheckCircle2, AlertCircle, XCircle, ChevronRight } from "lucide-react";

type StepState = "done" | "action" | "warn" | "idle";

type Step = {
  number: number;
  label: string;
  sublabel: string;
  href: string;
  state: StepState;
};

function StateIcon({ state }: { state: StepState }) {
  if (state === "done")
    return <CheckCircle2 size={18} strokeWidth={2} className="shrink-0 text-[var(--easa-color-accent-green)]" />;
  if (state === "action")
    return <AlertCircle size={18} strokeWidth={2} className="shrink-0 text-[var(--easa-color-accent-orange)]" />;
  if (state === "warn")
    return <XCircle size={18} strokeWidth={2} className="shrink-0 text-[var(--easa-color-accent-pink)]" />;
  return (
    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 border-[var(--easa-color-border)]" />
  );
}

function stepBg(state: StepState) {
  if (state === "done") return "bg-[color-mix(in_srgb,var(--easa-color-accent-green)_8%,white)]";
  if (state === "action") return "bg-[color-mix(in_srgb,var(--easa-color-accent-orange)_8%,white)]";
  if (state === "warn") return "bg-[color-mix(in_srgb,var(--easa-color-accent-pink)_8%,white)]";
  return "bg-[var(--easa-color-surface-2)]";
}

function stepBorder(state: StepState) {
  if (state === "done") return "border-[color-mix(in_srgb,var(--easa-color-accent-green)_30%,transparent)]";
  if (state === "action") return "border-[color-mix(in_srgb,var(--easa-color-accent-orange)_30%,transparent)]";
  if (state === "warn") return "border-[color-mix(in_srgb,var(--easa-color-accent-pink)_30%,transparent)]";
  return "border-[var(--easa-color-border)]";
}

export type WorkflowBannerProps = {
  activeFeeds: number;
  totalFeeds: number;
  pendingReview: number;
  flightbookCount: number;
  newAlertsThisWeek: number;
};

export default function WorkflowBanner({
  activeFeeds,
  totalFeeds,
  pendingReview,
  flightbookCount,
  newAlertsThisWeek,
}: WorkflowBannerProps) {
  const feedState: StepState =
    activeFeeds > 0 ? "done" : totalFeeds > 0 ? "warn" : "warn";

  const alertState: StepState =
    newAlertsThisWeek > 0 ? "action" : activeFeeds > 0 ? "done" : "idle";

  const reviewState: StepState =
    pendingReview > 0 ? "action" : flightbookCount > 0 ? "done" : "idle";

  const booksState: StepState =
    flightbookCount > 0 && pendingReview === 0
      ? "done"
      : flightbookCount > 0
      ? "action"
      : "warn";

  const steps: Step[] = [
    {
      number: 1,
      label: "Feeds",
      sublabel:
        activeFeeds > 0
          ? `${activeFeeds} active feed${activeFeeds !== 1 ? "s" : ""}`
          : "No feeds connected",
      href: "/settings?tab=sources",
      state: feedState,
    },
    {
      number: 2,
      label: "Alerts",
      sublabel:
        newAlertsThisWeek > 0
          ? `${newAlertsThisWeek} new this week`
          : activeFeeds > 0
          ? "No new alerts"
          : "Run pipeline to detect",
      href: "/results",
      state: alertState,
    },
    {
      number: 3,
      label: "Review queue",
      sublabel:
        pendingReview > 0
          ? `${pendingReview} pending`
          : "All reviewed",
      href: "/updates",
      state: reviewState,
    },
    {
      number: 4,
      label: "Flight books",
      sublabel:
        flightbookCount > 0
          ? pendingReview === 0
            ? `${flightbookCount} book${flightbookCount !== 1 ? "s" : ""} up to date`
            : `${flightbookCount} book${flightbookCount !== 1 ? "s" : ""} · updates pending`
          : "No books uploaded",
      href: "/flightbooks",
      state: booksState,
    },
  ];

  return (
    <div className="easa-card overflow-hidden p-0">
      <div className="border-b border-[var(--easa-color-border)] px-5 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--easa-color-text-muted)]">
          Compliance pipeline
        </p>
      </div>

      <div className="grid grid-cols-2 divide-x divide-y divide-[var(--easa-color-border)] lg:grid-cols-4 lg:divide-y-0">
        {steps.map((step, index) => (
          <Link
            key={step.number}
            href={step.href}
            className={`group relative flex flex-col gap-2 p-5 transition-all hover:brightness-[0.97] ${stepBg(step.state)} border-[var(--easa-color-border)] ${
              index < steps.length - 1 ? "" : ""
            }`}
          >
            {/* Step number */}
            <div className="flex items-center justify-between">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-bold ${stepBorder(step.state)} ${
                  step.state === "done"
                    ? "text-[var(--easa-color-accent-green)]"
                    : step.state === "action"
                    ? "text-[var(--easa-color-accent-orange)]"
                    : step.state === "warn"
                    ? "text-[var(--easa-color-accent-pink)]"
                    : "text-[var(--easa-color-text-muted)]"
                }`}
              >
                {step.number}
              </span>
              <StateIcon state={step.state} />
            </div>

            {/* Label */}
            <div>
              <p className="text-sm font-semibold text-[var(--easa-color-text-primary)]">
                {step.label}
              </p>
              <p className="mt-0.5 text-xs text-[var(--easa-color-text-muted)]">
                {step.sublabel}
              </p>
            </div>

            {/* Hover arrow */}
            <ChevronRight
              size={14}
              strokeWidth={2}
              className="absolute bottom-4 right-4 opacity-0 transition-opacity group-hover:opacity-40"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
