import Link from "next/link";
import MarketingShell from "@/components/landing/MarketingShell";
import { featureProof, workflowSteps } from "@/components/landing/site-content";

export default function HowItWorksPage() {
  return (
    <MarketingShell>
      <div className="space-y-8">
        <section className="rounded-[32px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] p-8 shadow-[var(--easa-shadow-1)] lg:p-10">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--easa-color-text-muted)]">
            How it works
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight lg:text-5xl">
            From regulation change to lesson action in one controlled workflow.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--easa-color-text-muted)]">
            EASA_app ties together update monitoring, manual control, reading assignments, and completion evidence so approved information actually reaches the people who need it.
          </p>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          {workflowSteps.map((step) => (
            <div key={step.step} className="rounded-[30px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] p-6 shadow-[var(--easa-shadow-1)]">
              <span className="inline-flex rounded-full bg-[color-mix(in_srgb,var(--easa-color-accent-blue)_16%,transparent)] px-3 py-1 text-sm font-semibold text-[var(--easa-color-accent-blue)]">
                Step {step.step}
              </span>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">{step.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--easa-color-text-muted)]">
                {step.body}
              </p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[30px] bg-[linear-gradient(140deg,#1f3434_0%,#274748_60%,#345c5a_100%)] p-8 text-white shadow-[var(--easa-shadow-2)]">
            <p className="text-xs uppercase tracking-[0.18em] text-white/70">
              Why it works
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Compliance review stays deliberate while distribution becomes operationally easy.
            </h2>
            <p className="mt-4 text-sm leading-6 text-white/75">
              The platform is designed to keep approvals, notes, and rollback history in one lane while training assignments and role-specific visibility happen in another.
            </p>
          </div>

          <div className="rounded-[30px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] p-8 shadow-[var(--easa-shadow-1)]">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--easa-color-text-muted)]">
              What the workflow supports
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {featureProof.map((item) => (
                <div key={item} className="rounded-2xl bg-[var(--easa-color-surface-2)] p-4 text-sm text-[var(--easa-color-text-secondary)]">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] p-8 shadow-[var(--easa-shadow-1)]">
          <h2 className="text-3xl font-semibold tracking-tight">
            Want to see the workflow applied to your current manuals?
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--easa-color-text-muted)]">
            We can walk through how your school handles revisions today and show what the flow looks like once updates, reading assignments, and acknowledgements are in one system.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link className="easa-btn primary" href="/book-demo">
              Book a demo
            </Link>
            <Link className="easa-btn secondary" href="/pricing">
              View pricing
            </Link>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
