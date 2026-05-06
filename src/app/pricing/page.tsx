import Link from "next/link";
import PricingPlans from "@/components/pricing/PricingPlans";
import MarketingShell from "@/components/landing/MarketingShell";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function PricingPage({
  searchParams,
}: {
  searchParams?: Promise<{ registered?: string; school?: string; plan?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return (
    <MarketingShell>
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[40px] border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)] shadow-[var(--easa-shadow-1)]">
          <div className="easa-gradient-bar" />
          <div className="grid gap-8 px-6 py-10 lg:grid-cols-[1.2fr_0.8fr] lg:px-10 lg:py-12">
            <div>
              <span className="easa-eyebrow">Pricing</span>
              <h1 className="easa-display mt-4 max-w-4xl text-5xl leading-tight md:text-6xl">
                Start with a 3-day trial, stay flexible monthly, or save two months with annual billing.
              </h1>
            </div>
            <p className="max-w-xl text-base leading-8 text-[var(--easa-color-text-muted)]">
              Register the school, choose how you want to pay, and move straight into setup,
              manuals, training workflows, and EASA monitoring.
            </p>
          </div>
        </section>

        <PricingPlans
          signedIn={Boolean(user)}
          schoolName={resolvedSearchParams.registered === "1" ? resolvedSearchParams.school : undefined}
          preselectedPlan={resolvedSearchParams.plan}
        />

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="easa-panel p-8">
            <span className="easa-eyebrow">How it works</span>
            <h2 className="easa-display mt-4 text-4xl leading-tight md:text-5xl">
              Registration first. Pricing second. School setup right after checkout or trial start.
            </h2>
            <p className="mt-5 text-base leading-8 text-[var(--easa-color-text-muted)]">
              The new school flow is simple: create the admin account, choose trial, monthly,
              or annual, then move into branding, manuals, users, and onboarding inside the app.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="easa-chip is-active">3-day trial</span>
              <span className="easa-chip">Monthly billing</span>
              <span className="easa-chip">Annual = 2 months free</span>
            </div>
          </article>

          <article className="easa-panel p-8">
            <span className="easa-eyebrow">Plan guidance</span>
            <div className="mt-5 space-y-4">
              {[
                {
                  title: "Trial",
                  body: "Best when you want to validate the workflow with real manuals before making a billing commitment.",
                },
                {
                  title: "Monthly",
                  body: "Best when your school wants flexibility while documents, users, and training structure are still changing.",
                },
                {
                  title: "Annual",
                  body: "Best when the school already knows this will become part of its core operating workflow and wants the discount.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-[22px] bg-[var(--easa-color-surface-2)] p-4">
                  <h3 className="text-base font-semibold text-[var(--easa-color-text-primary)]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--easa-color-text-muted)]">{item.body}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="rounded-[40px] bg-[var(--easa-color-brand-primary)] px-6 py-10 text-[#f7f2e8] shadow-[var(--easa-shadow-brand)] md:px-10">
          <h2 className="easa-display text-4xl leading-tight md:text-5xl">
            Ready to open the workspace for your school?
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-white/72">
            Register now to move straight into setup, pricing selection, and the school onboarding flow.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="easa-btn bg-[#f7f2e8] text-[var(--easa-color-brand-primary)]" href="/register">
              Register school
            </Link>
            <Link className="easa-btn border border-white/16 bg-white/8 text-white" href="/register">
              Register
            </Link>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
