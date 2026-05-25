import type { Metadata } from "next";
import Footer from "@/components/home/Footer";
import Nav from "@/components/home/Nav";
import PricingPlans from "@/components/pricing/PricingPlans";
import { isUserSignedIn } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Pricing | Flight Lyceum",
  description:
    "Simple subscription pricing for EASA Approved Training Organisations. Start with a 3 day free trial, then pay by month, quarter, or year through Stripe.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Pricing | Flight Lyceum",
    description:
      "Start with a 3 day free trial, then choose monthly, quarterly, or annual Stripe billing for Flight Lyceum.",
    url: "/pricing",
  },
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams?: Promise<{ registered?: string; school?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const signedIn = await isUserSignedIn();

  return (
    <div className="easa-quicken-app min-h-screen bg-[var(--easa-color-bg)]">
      <Nav signedIn={signedIn} />
      <main>
        <div className="pricing-page mx-auto max-w-7xl px-6">
          <section className="pricing-hero">
            <div>
              <p className="pricing-kicker">Pricing</p>
              <h1>Choose the plan that works for your flight school</h1>
            </div>
            <p>
              Start with a 30-day free trial. A card is required but you won&apos;t be charged
              until day 31. Pay securely through Stripe on a monthly or annual subscription.
            </p>
          </section>

          <PricingPlans
            signedIn={signedIn}
            schoolName={resolvedSearchParams.registered === "1" ? resolvedSearchParams.school : undefined}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
