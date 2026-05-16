"use client";

import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

type PricingPlansProps = {
  signedIn: boolean;
  schoolName?: string;
};

type PlanKey = "monthly" | "quarterly" | "annual";

const plans: Array<{
  key: PlanKey;
  name: string;
  price: string;
  cadence: string;
  note: string;
  badge?: string;
  features: string[];
}> = [
  {
    key: "monthly",
    name: "Monthly",
    price: "$220",
    cadence: "/mo",
    note: "Flexible access for active ATO operations.",
    features: [
      "7 day free trial",
      "EASA change monitoring",
      "Manual impact review",
      "Training acknowledgements",
      "Admin workspace setup",
    ],
  },
  {
    key: "quarterly",
    name: "Quarterly",
    price: "$200",
    cadence: "/quarter",
    note: "Billed quarterly for schools that want steadier planning.",
    badge: "Balanced",
    features: [
      "7 day free trial",
      "Everything in Monthly",
      "Quarterly billing cycle",
      "Priority setup support",
      "Team onboarding guidance",
    ],
  },
  {
    key: "annual",
    name: "Annual",
    price: "$2,000",
    cadence: "/yr",
    note: "Best value for year-round compliance control.",
    badge: "Best value",
    features: [
      "7 day free trial",
      "Everything in Quarterly",
      "Annual billing cycle",
      "Lowest yearly rate",
      "Renewal-ready billing record",
    ],
  },
];

function formatPlanLabel(planKey: PlanKey) {
  return planKey.charAt(0).toUpperCase() + planKey.slice(1);
}

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
          Start free trial
        </Link>
        <p className="pricing-action-note">Create your school account before Stripe checkout.</p>
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
  const registeredCopy = useMemo(() => {
    if (!schoolName) return null;
    return `${schoolName} is ready. Choose a plan to continue with Stripe billing.`;
  }, [schoolName]);

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
          <h2>Individual Plans</h2>
        </div>
        <div className="pricing-trial-pill">7 day free trial</div>
      </section>

      <section className="pricing-grid">
        {plans.map((plan) => (
          <article
            key={plan.key}
            className={`pricing-card ${plan.key === "quarterly" ? "is-featured" : ""}`}
          >
            <div className="pricing-card-top">
              <div>
                <div className="pricing-plan-row">
                  <h3>{plan.name}</h3>
                  {plan.badge ? <span>{plan.badge}</span> : null}
                </div>
                <p>{plan.note}</p>
              </div>
              <div className="pricing-price">
                <strong>{plan.price}</strong>
                <span>{plan.cadence}</span>
              </div>
            </div>

            <div className="pricing-divider" />

            <div className="pricing-feature-block">
              <p>{formatPlanLabel(plan.key)} includes</p>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check size={16} strokeWidth={2.5} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <BillingButton signedIn={signedIn} planKey={plan.key} />
          </article>
        ))}
      </section>
    </div>
  );
}
