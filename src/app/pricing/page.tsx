import Link from "next/link";
import MarketingShell from "@/components/landing/MarketingShell";
import { addOns, pricingTiers } from "@/components/landing/site-content";

export default function PricingPage() {
  return (
    <MarketingShell>
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[40px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] shadow-[var(--easa-shadow-1)]">
          <div className="easa-gradient-bar" />
          <div className="grid gap-8 px-6 py-10 lg:grid-cols-[1.2fr_0.8fr] lg:px-10 lg:py-12">
            <div>
              <span className="easa-eyebrow">Pricing</span>
              <h1 className="easa-display mt-4 max-w-4xl text-5xl leading-tight md:text-6xl">
                Simple pricing for schools that need control without an enterprise buying cycle.
              </h1>
            </div>
            <p className="max-w-xl text-base leading-8 text-[var(--easa-color-text-muted)]">
              Start with controlled manuals and acknowledgements, then expand into
              training workflows, branded portals, and audit depth as your operation grows.
            </p>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          {pricingTiers.map((tier) => (
            <article
              key={tier.name}
              className={`rounded-[32px] border p-6 shadow-[var(--easa-shadow-1)] ${
                tier.featured
                  ? "border-[var(--easa-color-brand-primary)] bg-[color-mix(in_srgb,var(--easa-color-brand-light)_62%,white)]"
                  : "border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold text-[var(--easa-color-text-primary)]">{tier.name}</h2>
                  <p className="mt-2 text-sm leading-7 text-[var(--easa-color-text-muted)]">{tier.summary}</p>
                </div>
                {tier.featured ? <span className="easa-badge is-blue">Most popular</span> : null}
              </div>
              <p className="mt-8 text-4xl font-semibold tracking-tight text-[var(--easa-color-text-primary)]">
                {tier.price}
                <span className="ml-1 text-base font-medium text-[var(--easa-color-text-muted)]">
                  {tier.cadence}
                </span>
              </p>
              <div className="mt-6 space-y-3">
                {tier.features.map((feature) => (
                  <div
                    key={feature}
                    className="rounded-[20px] bg-[var(--easa-color-surface-2)] px-4 py-3 text-sm leading-7 text-[var(--easa-color-text-secondary)]"
                  >
                    {feature}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="easa-panel p-8">
            <span className="easa-eyebrow">Packaging logic</span>
            <h2 className="easa-display mt-4 text-4xl leading-tight md:text-5xl">
              Starter buys control. Growth buys operational depth. Multi-base buys governance and scale.
            </h2>
            <p className="mt-5 text-base leading-8 text-[var(--easa-color-text-muted)]">
              The base value is controlled manuals and acknowledgements. The upgrade path
              comes from training usefulness, compliance mapping, and the ability to onboard
              more roles without adding friction.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="easa-chip is-active">Monthly billing available</span>
              <span className="easa-chip">Annual discount available</span>
              <span className="easa-chip">60-day pilot offer</span>
            </div>
          </article>

          <article className="easa-panel p-8">
            <span className="easa-eyebrow">Add-ons</span>
            <div className="mt-5 space-y-4">
              {addOns.map((item) => (
                <div key={item.title} className="rounded-[22px] bg-[var(--easa-color-surface-2)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-[var(--easa-color-text-primary)]">{item.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-[var(--easa-color-text-muted)]">{item.body}</p>
                    </div>
                    <span className="easa-badge is-purple whitespace-nowrap">{item.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="rounded-[40px] bg-[var(--easa-color-brand-primary)] px-6 py-10 text-[#f7f2e8] shadow-[var(--easa-shadow-brand)] md:px-10">
          <h2 className="easa-display text-4xl leading-tight md:text-5xl">
            Ready to price around how your school actually works?
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-white/72">
            Start with a walkthrough of the product and we can map the right package to
            your school size, document complexity, and training structure.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="easa-btn bg-[#f7f2e8] text-[var(--easa-color-brand-primary)]" href="/book-demo">
              Book a demo
            </Link>
            <Link className="easa-btn border border-white/16 bg-white/8 text-white" href="/how-it-works">
              See the workflow
            </Link>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
