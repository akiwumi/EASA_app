"use client";

import Link from "next/link";
import { useState } from "react";

type PricingPlansProps = {
  signedIn: boolean;
  schoolName?: string;
  preselectedPlan?: string;
};

const PLANS = [
  {
    key: "trial",
    name: "Trial",
    price: "3 days free",
    cadence: "",
    summary: "Launch the workspace, upload a manual, and see the product with no upfront charge.",
    badge: "Try first",
    features: [
      "3-day full platform access",
      "Create the school workspace",
      "Upload manuals and test the workflow",
      "Move into paid billing when ready",
    ],
  },
  {
    key: "monthly",
    name: "Monthly",
    price: "Billed monthly",
    cadence: "",
    summary: "Flexible monthly subscription for schools that want to start fast and keep options open.",
    badge: "Flexible",
    features: [
      "Month-to-month billing",
      "Best for new or seasonal schools",
      "No annual commitment",
      "Upgrade to annual later",
    ],
  },
  {
    key: "annual",
    name: "Annual",
    price: "12 months for the price of 10",
    cadence: "",
    summary: "Best long-term value with a 2-month discount built into annual billing.",
    badge: "Best value",
    features: [
      "Two months free versus monthly",
      "Lower annual operating cost",
      "Best fit for established schools",
      "Simple yearly renewal cycle",
    ],
  },
] as const;

function ctaLabel(key: string, signedIn: boolean) {
  if (!signedIn) return "Register school";
  if (key === "trial") return "Start 3-day trial";
  if (key === "monthly") return "Choose monthly";
  return "Choose annual";
}

export default function PricingPlans({
  signedIn,
  schoolName,
  preselectedPlan,
}: PricingPlansProps) {
  const [workingPlan, setWorkingPlan] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function startCheckout(plan: string) {
    setWorkingPlan(plan);
    setMessage(null);

    const response = await fetch("/api/admin/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: plan === "trial" ? "trial" : "checkout",
        plan,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.error ?? "Unable to start billing.");
      setWorkingPlan(null);
      return;
    }

    if (payload.url) {
      window.location.assign(payload.url);
      return;
    }

    setWorkingPlan(null);
  }

  return (
    <>
      {schoolName ? (
        <section className="rounded-[28px] border border-[var(--easa-color-border)] bg-[color-mix(in_srgb,var(--easa-color-brand-light)_52%,white)] px-6 py-5 text-sm text-[var(--easa-color-text-secondary)] shadow-[var(--easa-shadow-1)]">
          <strong className="text-[var(--easa-color-text-primary)]">{schoolName}</strong> is ready.
          Choose how you want to start billing for the new workspace.
        </section>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const selected = preselectedPlan === plan.key;
          const buttonText =
            workingPlan === plan.key ? "Opening..." : ctaLabel(plan.key, signedIn);

          return (
            <article
              key={plan.key}
              className={`rounded-[32px] border p-6 shadow-[var(--easa-shadow-1)] ${
                selected || plan.key === "annual"
                  ? "border-[var(--easa-color-brand-primary)] bg-[color-mix(in_srgb,var(--easa-color-brand-light)_62%,white)]"
                  : "border-[var(--easa-color-border)] bg-[var(--easa-color-surface-1)]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold text-[var(--easa-color-text-primary)]">{plan.name}</h2>
                  <p className="mt-2 text-sm leading-7 text-[var(--easa-color-text-muted)]">{plan.summary}</p>
                </div>
                <span className="easa-badge is-blue">{plan.badge}</span>
              </div>

              <p className="mt-8 text-3xl font-semibold tracking-tight text-[var(--easa-color-text-primary)]">
                {plan.price}
                {plan.cadence ? (
                  <span className="ml-1 text-base font-medium text-[var(--easa-color-text-muted)]">
                    {plan.cadence}
                  </span>
                ) : null}
              </p>

              <div className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <div
                    key={feature}
                    className="rounded-[20px] bg-[var(--easa-color-surface-2)] px-4 py-3 text-sm leading-7 text-[var(--easa-color-text-secondary)]"
                  >
                    {feature}
                  </div>
                ))}
              </div>

              <div className="mt-6">
                {signedIn ? (
                  <button
                    className="easa-btn primary w-full justify-center"
                    disabled={workingPlan !== null}
                    onClick={() => startCheckout(plan.key)}
                    type="button"
                  >
                    {buttonText}
                  </button>
                ) : (
                  <Link className="easa-btn primary w-full justify-center" href={`/register?plan=${plan.key}`}>
                    {buttonText}
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </section>

      {message ? (
        <p className="text-sm text-[var(--easa-color-accent-orange)]">{message}</p>
      ) : null}
    </>
  );
}
