import Link from "next/link";

type PricingPlansProps = {
  signedIn: boolean;
  schoolName?: string;
};

export default function PricingPlans({
  signedIn,
  schoolName,
}: PricingPlansProps) {
  return (
    <>
      {schoolName ? (
        <section className="rounded-[28px] border border-[var(--easa-color-border)] bg-[color-mix(in_srgb,var(--easa-color-brand-light)_52%,white)] px-6 py-5 text-sm text-[var(--easa-color-text-secondary)] shadow-[var(--easa-shadow-1)]">
          <strong className="text-[var(--easa-color-text-primary)]">{schoolName}</strong> is ready.
          Lifetime workspace access is active.
        </section>
      ) : null}

      <section className="grid gap-5">
        <article className="rounded-[32px] border border-[var(--easa-color-brand-primary)] bg-[color-mix(in_srgb,var(--easa-color-brand-light)_62%,white)] p-6 shadow-[var(--easa-shadow-1)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-[var(--easa-color-text-primary)]">Lifetime workspace</h2>
              <p className="mt-2 text-sm leading-7 text-[var(--easa-color-text-muted)]">
                Register once, open the workspace immediately, and keep school access active without Stripe or renewal flow.
              </p>
            </div>
            <span className="easa-badge is-blue">Active access</span>
          </div>

          <p className="mt-8 text-3xl font-semibold tracking-tight text-[var(--easa-color-text-primary)]">
            No expiry
          </p>

          <div className="mt-6 space-y-3">
            {[
              "School workspace created during registration",
              "Admin user linked automatically",
              "Access stays active with no billing portal",
              "Move straight into branding, manuals, users, and onboarding",
            ].map((feature) => (
              <div
                key={feature}
                className="rounded-[20px] bg-[var(--easa-color-surface-2)] px-4 py-3 text-sm leading-7 text-[var(--easa-color-text-secondary)]"
              >
                {feature}
              </div>
            ))}
          </div>

          <div className="mt-6">
            <Link
              className="easa-btn primary w-full justify-center"
              href={signedIn ? "/settings?tab=branding" : "/register"}
            >
              {signedIn ? "Open school workspace" : "Register school"}
            </Link>
          </div>
        </article>
      </section>
    </>
  );
}
