import Link from "next/link";
import MarketingShell from "@/components/landing/MarketingShell";
import { demoAgenda } from "@/components/landing/site-content";

export default function BookDemoPage() {
  return (
    <MarketingShell>
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="overflow-hidden rounded-[40px] bg-[var(--easa-color-brand-primary)] text-[#f7f2e8] shadow-[var(--easa-shadow-brand)]">
          <div className="easa-gradient-bar opacity-70" />
          <div className="p-8 lg:p-10">
            <span className="easa-eyebrow text-white/62">Book a demo</span>
            <h1 className="easa-display mt-4 text-5xl leading-tight md:text-6xl">
              See how EASA_app can run manuals, training reading, and compliance in one workflow.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/72">
              This page is the public CTA surface for now. It does not yet include a live
              booking integration, but it gives the sales and onboarding path a proper
              destination while the rest of the product build continues.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="easa-btn bg-[#f7f2e8] text-[var(--easa-color-brand-primary)]" href="/login">
                Open the product
              </Link>
              <Link className="easa-btn border border-white/16 bg-white/8 text-white" href="/pricing">
                Review pricing
              </Link>
            </div>
          </div>
        </section>

        <section className="easa-panel p-8">
          <span className="easa-eyebrow">Demo agenda</span>
          <div className="mt-5 space-y-3">
            {demoAgenda.map((item, index) => (
              <div key={item} className="rounded-[22px] bg-[var(--easa-color-surface-2)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--easa-color-text-muted)]">
                  Step {index + 1}
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--easa-color-text-secondary)]">{item}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-[26px] bg-[linear-gradient(135deg,#ece8dd_0%,#f8f5ee_100%)] p-5">
            <h2 className="text-lg font-semibold text-[var(--easa-color-brand-primary)]">
              Best for schools moving away from PDF, Word, and email-driven revision control.
            </h2>
            <p className="mt-2 text-sm leading-7 text-[var(--easa-color-text-secondary)]">
              The early product story is strongest when the school needs controlled manuals,
              student acknowledgements, and visible compliance impact without a heavyweight enterprise rollout.
            </p>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
