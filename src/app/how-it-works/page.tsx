import Link from "next/link";
import MarketingShell from "@/components/landing/MarketingShell";
import LandingWorkflow from "@/components/landing/LandingWorkflow";
import { featureProof } from "@/components/landing/site-content";

export default function HowItWorksPage() {
  return (
    <MarketingShell>
      <div className="space-y-6">
        <section className="easa-panel overflow-hidden">
          <div className="easa-gradient-bar" />
          <div className="px-6 py-10 lg:px-10 lg:py-12">
            <span className="easa-eyebrow">How it works</span>
            <h1 className="easa-display mt-4 max-w-4xl text-5xl leading-tight md:text-6xl">
              From regulation change to lesson action in one controlled workflow.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--easa-color-text-muted)]">
              Flight Lyceum ties together update monitoring, manual control, reading assignments,
              and completion evidence so approved information actually reaches the people who need it.
            </p>
          </div>
        </section>

        <LandingWorkflow />

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-[36px] bg-[var(--easa-color-brand-primary)] p-8 text-[#f7f2e8] shadow-[var(--easa-shadow-brand)]">
            <span className="easa-eyebrow text-white/62">Why it works</span>
            <h2 className="easa-display mt-4 text-4xl leading-tight md:text-5xl">
              Compliance review stays deliberate while distribution becomes operationally easy.
            </h2>
            <p className="mt-5 text-base leading-8 text-white/72">
              The platform is designed to keep approvals, notes, and rollback history in
              one lane while training assignments and role-specific visibility happen in another.
            </p>
          </article>

          <article className="easa-panel p-8">
            <span className="easa-eyebrow">What the workflow supports</span>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {featureProof.map((item) => (
                <div
                  key={item}
                  className="rounded-[20px] bg-[var(--easa-color-surface-2)] p-4 text-sm leading-7 text-[var(--easa-color-text-secondary)]"
                >
                  {item}
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="easa-panel p-8 md:p-10">
          <h2 className="easa-display text-4xl leading-tight md:text-5xl">
            Want to see the workflow applied to your current manuals?
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--easa-color-text-muted)]">
            We can walk through how your school handles revisions today and show what the flow
            looks like once updates, reading assignments, and acknowledgements are in one system.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="easa-btn primary" href="/register">
              Register
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
