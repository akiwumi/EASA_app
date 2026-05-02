import Link from "next/link";
import MarketingShell from "@/components/landing/MarketingShell";

const demoAgenda = [
  "Review how your school handles manual updates today",
  "Show the approval, rollback, and audit workflow",
  "Map reading assignments to students and instructors",
  "Discuss onboarding, migration, and pricing fit",
];

export default function BookDemoPage() {
  return (
    <MarketingShell>
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[32px] bg-[linear-gradient(135deg,#1a2f2f_0%,#223d3d_55%,#315a57_100%)] p-8 text-white shadow-[var(--easa-shadow-2)] lg:p-10">
          <p className="text-xs uppercase tracking-[0.2em] text-white/70">
            Book a demo
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight lg:text-5xl">
            See how EASA_app can run manuals, training reading, and compliance in one workflow.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/78">
            This page is the public CTA surface for now. It does not yet include a live booking integration, but it gives the sales and onboarding path a proper destination while the rest of the product build continues.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="easa-btn bg-white text-[var(--easa-color-brand-primary)]" href="/login">
              Open the product
            </Link>
            <Link className="easa-btn border border-white/15 bg-white/10 text-white" href="/pricing">
              Review pricing
            </Link>
          </div>
        </section>

        <section className="rounded-[32px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] p-8 shadow-[var(--easa-shadow-1)]">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--easa-color-text-muted)]">
            Demo agenda
          </p>
          <div className="mt-5 space-y-3">
            {demoAgenda.map((item, index) => (
              <div key={item} className="rounded-2xl bg-[var(--easa-color-surface-2)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--easa-color-text-muted)]">
                  Step {index + 1}
                </p>
                <p className="mt-2 text-sm text-[var(--easa-color-text-secondary)]">{item}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-[24px] bg-[linear-gradient(135deg,#f5efe6_0%,#fffaf4_100%)] p-5">
            <h2 className="text-lg font-semibold text-[var(--easa-color-brand-primary)]">
              Best for schools moving away from PDF, Word, and email-driven revision control.
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--easa-color-text-secondary)]">
              The early product story is strongest when the school needs controlled manuals, student acknowledgements, and visible compliance impact without a heavyweight enterprise rollout.
            </p>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
