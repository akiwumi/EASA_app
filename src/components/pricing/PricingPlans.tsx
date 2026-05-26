"use client";

import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

type PricingPlansProps = {
  signedIn: boolean;
  schoolName?: string;
};

type BillingCycle = "monthly" | "annual";
type PlanKey = "monthly" | "annual";

const features = [
  "30-day free trial. Card held, not charged until day 31",
  "50 student accounts included (add 10 more anytime)",
  "EASA change monitoring across 40+ regulatory families",
  "AI impact assessment and plain-language draft updates",
  "Controlled manuals with full revision history and rollback",
  "Read-and-acknowledge workflows for instructors and students",
  "Lesson-linked reading assignments by programme and phase",
  "Audit-ready export pack for authority oversight visits",
  "Admin workspace with user roles and onboarding checklist",
  "Mobile-friendly student access",
  "Email digest of weekly EASA changes",
];

function BillingButton({
  signedIn,
  planKey,
}: {
  signedIn: boolean;
  planKey: PlanKey;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    if (!signedIn) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Unable to start Stripe checkout.");
      }

      window.location.assign(payload.url);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Unable to start Stripe checkout.",
      );
      setLoading(false);
    }
  }

  if (!signedIn) {
    return (
      <div className="space-y-2">
        <Link className="pricing-action" href={`/register?plan=${planKey}`}>
          Start 30-day free trial
        </Link>
        <p className="pricing-action-note">Card required. You won&apos;t be charged until day 31.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        className="pricing-action"
        disabled={loading}
        type="button"
        onClick={startCheckout}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : null}
        Pay with Stripe
      </button>
      {error ? <p className="pricing-error">{error}</p> : null}
    </div>
  );
}

export default function PricingPlans({
  signedIn,
  schoolName,
}: PricingPlansProps) {
  const [billing, setBilling] = useState<BillingCycle>("annual");

  const registeredCopy = useMemo(() => {
    if (!schoolName) return null;
    return `${schoolName} is ready. Choose a plan to continue with Stripe billing.`;
  }, [schoolName]);

  const planKey: PlanKey = billing === "annual" ? "annual" : "monthly";
  const price = billing === "annual" ? "€63" : "€75";
  const cadence = billing === "annual" ? "/mo, billed annually" : "/month";
  const annualTotal = billing === "annual" ? "€750 billed once per year" : null;

  return (
    <div className="pricing-board">
      {registeredCopy ? (
        <section className="pricing-notice">
          <strong>{schoolName}</strong> is ready. Choose a plan to continue with Stripe billing.
        </section>
      ) : null}

      <section className="pricing-heading-row">
        <div>
          <p className="pricing-kicker">Subscription</p>
          <h2>One plan. Everything included.</h2>
        </div>
        <div className="pricing-trial-pill">30-day free trial</div>
      </section>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3 py-2">
        <button
          type="button"
          onClick={() => setBilling("monthly")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            billing === "monthly"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setBilling("annual")}
          className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            billing === "annual"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Annual
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
            2 months free
          </span>
        </button>
      </div>

      <section className="pricing-grid" style={{ gridTemplateColumns: "1fr" }}>
        <article className="pricing-card is-featured" style={{ maxWidth: 520, margin: "0 auto", width: "100%" }}>
          <div className="pricing-card-top">
            <div>
              <div className="pricing-plan-row">
                <h3>Flight Lyceum ATO</h3>
                <span>All features</span>
              </div>
              <p>Full compliance and training platform for EASA Approved Training Organisations.</p>
            </div>
            <div className="pricing-price">
              <strong>{price}</strong>
              <span>{cadence}</span>
            </div>
          </div>

          {annualTotal && (
            <p className="px-1 pb-1 text-xs text-muted-foreground">{annualTotal}</p>
          )}

          <div className="pricing-divider" />

          <div className="pricing-feature-block">
            <p>Everything included</p>
            <ul>
              {features.map((feature) => (
                <li key={feature}>
                  <Check size={16} strokeWidth={2.5} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <BillingButton signedIn={signedIn} planKey={planKey} />
        </article>
      </section>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Need multi-base access, custom integrations, or migration support?{" "}
        <Link href="/contact" className="font-medium underline underline-offset-4 hover:text-foreground">
          Contact us
        </Link>{" "}
        for an enterprise quote.
      </p>
    </div>
  );
}
