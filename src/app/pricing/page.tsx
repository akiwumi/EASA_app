import Link from "next/link";
import MarketingShell from "@/components/landing/MarketingShell";
import { addOns, pricingTiers } from "@/components/landing/site-content";

export default function PricingPage() {
  return (
    <MarketingShell>
      <div className="space-y-8">
        <section className="rounded-[32px] bg-[linear-gradient(135deg,#122726_0%,#1f3434_55%,#355b58_100%)] p-8 text-white shadow-[var(--easa-shadow-2)] lg:p-10">
          <p className="text-xs uppercase tracking-[0.2em] text-white/70">Pricing</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight lg:text-5xl">
            Simple pricing for schools that need control without an enterprise buying cycle.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/78">
            Start with controlled manuals and acknowledgements, then expand into training workflows, branded portals, and audit depth as your operation grows.
          </p>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          {pricingTiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-[30px] border p-6 shadow-[var(--easa-shadow-1)] ${
                tier.featured
                  ? "border-[var(--easa-color-brand-primary)] bg-[color-mix(in_srgb,var(--easa-color-brand-primary)_8%,white)]"
                  : "border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{tier.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--easa-color-text-muted)]">
                    {tier.summary}
                  </p>
                </div>
                {tier.featured && <span className="easa-badge is-blue">Most popular</span>}
              </div>
              <div className="mt-6">
                <p className="text-4xl font-semibold tracking-tight">
                  {tier.price}
                  <span className="ml-1 text-base font-medium text-[var(--easa-color-text-muted)]">
                    {tier.cadence}
                  </span>
                </p>
              </div>
              <div className="mt-6 space-y-3">
                {tier.features.map((feature) => (
                  <div key={feature} className="rounded-2xl bg-[var(--easa-color-surface-2)] px-4 py-3 text-sm text-[var(--easa-color-text-secondary)]">
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[30px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] p-8 shadow-[var(--easa-shadow-1)]">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--easa-color-text-muted)]">
              Packaging logic
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Starter buys control. Growth buys operational depth. Multi-base buys governance and scale.
            </h2>
            <p className="mt-4 text-sm leading-6 text-[var(--easa-color-text-muted)]">
              The base value is controlled manuals and acknowledgements. The upgrade path comes from training usefulness, compliance mapping, and the ability to onboard more roles without adding friction.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="easa-chip is-active">Monthly billing available</span>
              <span className="easa-chip">Annual discount available</span>
              <span className="easa-chip">60-day pilot offer</span>
            </div>
          </div>

          <div className="rounded-[30px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] p-8 shadow-[var(--easa-shadow-1)]">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--easa-color-text-muted)]">
              Add-ons
            </p>
            <div className="mt-4 space-y-4">
              {addOns.map((item) => (
                <div key={item.title} className="rounded-2xl bg-[var(--easa-color-surface-2)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-[var(--easa-color-text-muted)]">
                        {item.body}
                      </p>
                    </div>
                    <span className="easa-badge is-purple whitespace-nowrap">{item.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[32px] bg-[linear-gradient(135deg,#f4efe6_0%,#fbf8f2_50%,#ffffff_100%)] p-8 shadow-[var(--easa-shadow-1)]">
          <h2 className="text-3xl font-semibold tracking-tight text-[var(--easa-color-brand-primary)]">
            Ready to price around how your school actually works?
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--easa-color-text-secondary)]">
            Start with a walkthrough of the product and we can map the right package to your school size, document complexity, and training structure.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link className="easa-btn primary" href="/book-demo">
              Book a demo
            </Link>
            <Link className="easa-btn secondary" href="/how-it-works">
              See the workflow
            </Link>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
