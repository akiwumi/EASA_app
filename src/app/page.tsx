import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import MarketingShell from "@/components/landing/MarketingShell";
import {
  featureProof,
  outcomeCards,
  personaCards,
  workflowSteps,
} from "@/components/landing/site-content";

export default function Home() {
  return (
    <MarketingShell>
      <div className="space-y-8 lg:space-y-10">
        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[32px] bg-[linear-gradient(135deg,#1f3434_0%,#27494a_60%,#356665_100%)] p-8 text-white shadow-[var(--easa-shadow-2)] lg:p-10">
            <div className="max-w-2xl space-y-6">
              <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
                Training operations and compliance
              </span>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight lg:text-6xl">
                  The training and compliance platform for flight schools.
                </h1>
                <p className="max-w-xl text-sm leading-6 text-white/78 lg:text-base">
                  Manage manuals, assign reading, track acknowledgements, and stay aligned with EASA changes in one place. Built for ATOs that need document control, instructor visibility, and student clarity at the same time.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link className="easa-btn bg-white text-[var(--easa-color-brand-primary)]" href="/book-demo">
                  Book a demo
                </Link>
                <Link className="easa-btn border border-white/15 bg-white/10 text-white" href="/how-it-works">
                  See how it works
                </Link>
              </div>
              <div className="grid gap-3 pt-2 md:grid-cols-3">
                {[
                  "Keep instructors and students on the latest approved procedures",
                  "Turn manual updates into training actions",
                  "Stay audit-ready without chasing PDFs and spreadsheets",
                ].map((point) => (
                  <div key={point} className="rounded-2xl border border-white/12 bg-white/8 p-4">
                    <CheckCircle2 size={18} className="text-white/90" />
                    <p className="mt-3 text-sm text-white/80">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[28px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] p-6 shadow-[var(--easa-shadow-1)]">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--easa-color-text-muted)]">
                Why schools switch
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                Most flight schools still manage critical updates across PDFs, Word files, email, and memory.
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--easa-color-text-muted)]">
                That makes training inconsistent, acknowledgements hard to track, and audits more stressful than they need to be. EASA_app brings manuals, revision control, student reading, and compliance workflows into one system.
              </p>
            </div>

            <div className="rounded-[28px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] p-6 shadow-[var(--easa-shadow-1)]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--easa-color-accent-blue)_16%,transparent)] text-[var(--easa-color-accent-blue)]">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold">Compliance stays human-led</p>
                  <p className="text-sm text-[var(--easa-color-text-muted)]">
                    AI helps surface impact, but approvals and rollbacks stay under your control.
                  </p>
                </div>
              </div>
              <div className="mt-5 rounded-2xl bg-[var(--easa-color-surface-2)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--easa-color-text-muted)]">
                  Built for daily operations
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="easa-chip is-active">Controlled manuals</span>
                  <span className="easa-chip">Student acknowledgements</span>
                  <span className="easa-chip">Instructor sign-offs</span>
                  <span className="easa-chip">EASA change monitoring</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          {outcomeCards.map((item) => (
            <div key={item.title} className="easa-card rounded-[28px] p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--easa-color-text-muted)]">
                Outcome
              </p>
              <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--easa-color-text-muted)]">
                {item.body}
              </p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 rounded-[32px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] p-8 shadow-[var(--easa-shadow-1)] lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--easa-color-text-muted)]">
              Role-based value
            </p>
            <h2 className="text-3xl font-semibold tracking-tight">
              One platform for compliance teams, instructors, and students.
            </h2>
            <p className="text-sm leading-6 text-[var(--easa-color-text-muted)]">
              The same approved source of truth can serve different roles without forcing everyone into the same workflow.
            </p>
            <Link className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--easa-color-brand-primary)]" href="/pricing">
              See plan options <ArrowRight size={16} />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {personaCards.map((item) => (
              <div key={item.title} className="rounded-[24px] bg-[var(--easa-color-surface-2)] p-5">
                <h3 className="text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--easa-color-text-muted)]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-4">
          {workflowSteps.map((item) => (
            <div key={item.step} className="rounded-[28px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] p-6 shadow-[var(--easa-shadow-1)]">
              <p className="text-sm font-semibold text-[var(--easa-color-accent-blue)]">
                {item.step}
              </p>
              <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--easa-color-text-muted)]">
                {item.body}
              </p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[32px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] p-8 shadow-[var(--easa-shadow-1)]">
            <div className="max-w-2xl space-y-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--easa-color-text-muted)]">
                Feature proof
              </p>
              <h2 className="text-3xl font-semibold tracking-tight">
                Built for the way ATOs actually work.
              </h2>
              <p className="text-sm leading-6 text-[var(--easa-color-text-muted)]">
                EASA_app combines manual control with day-to-day training delivery, so the platform is useful to compliance teams, instructors, and students at the same time.
              </p>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {featureProof.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl bg-[var(--easa-color-surface-2)] p-4">
                  <Sparkles size={18} className="mt-0.5 text-[var(--easa-color-accent-orange)]" />
                  <p className="text-sm text-[var(--easa-color-text-secondary)]">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] bg-[linear-gradient(160deg,#f4efe6_0%,#f8f5ef_45%,#ffffff_100%)] p-8 shadow-[var(--easa-shadow-1)]">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--easa-color-text-muted)]">
              Competitive wedge
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--easa-color-brand-primary)]">
              Built for flight schools, not adapted from airline manuals software.
            </h2>
            <p className="mt-4 text-sm leading-6 text-[var(--easa-color-text-secondary)]">
              Keep your school aligned, informed, and audit-ready with one workflow for manuals, training reading, and compliance action.
            </p>
            <div className="mt-6 space-y-3">
              {[
                "Lower friction for instructors and students",
                "Readable mobile acknowledgement flow",
                "Training impact visible next to document impact",
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-white/80 p-4 text-sm text-[var(--easa-color-text-secondary)] shadow-[var(--easa-shadow-1)]">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[32px] bg-[linear-gradient(135deg,#1f3434_0%,#223e3d_55%,#2f5a57_100%)] p-8 text-white shadow-[var(--easa-shadow-2)] lg:p-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">
                Closing CTA
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight lg:text-4xl">
                Keep your school aligned, informed, and audit-ready.
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/75">
                See how EASA_app helps your team manage manuals, training reading, and compliance in one workflow.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link className="easa-btn bg-white text-[var(--easa-color-brand-primary)]" href="/book-demo">
                Book a demo
              </Link>
              <Link className="easa-btn border border-white/15 bg-white/10 text-white" href="/pricing">
                Review pricing
              </Link>
            </div>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
