import type { Metadata } from "next";
import Footer from "@/components/home/Footer";
import Nav from "@/components/home/Nav";
import PricingPlans from "@/components/pricing/PricingPlans";
import MarketingAnimations from "@/components/marketing/MarketingAnimations";
import { isUserSignedIn } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Pricing | Flight Lyceum",
  description:
    "Simple subscription pricing for EASA Approved Training Organisations. Start with a 30-day free trial, then pay by month, quarter, or year through Stripe.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Pricing | Flight Lyceum",
    description:
      "Start with a 30-day free trial, then choose monthly, quarterly, or annual Stripe billing for Flight Lyceum.",
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
    <div className="min-h-screen" style={{ background: "var(--mkt-cream)" }}>
      <MarketingAnimations />
      <Nav signedIn={signedIn} />

      {/* ── Dark hero ── */}
      <section className="mkt-hero mkt-page-enter">
        <p className="mkt-eyebrow mkt-mono mb-5">Pricing</p>
        <h1 className="mkt-h1" style={{ color: "var(--mkt-cream)" }}>
          One plan.<br />Everything included.
        </h1>
        <p className="mkt-lead mt-6">
          Start with a 30-day free trial. A card is required but you won&rsquo;t be charged
          until day 31. Pay securely through Stripe on a monthly or annual subscription.
        </p>
      </section>

      {/* ── Plans ── */}
      <main
        id="main-content"
        className="mkt-section mkt-reveal"
        style={{ "--mkt-d": "80ms" } as React.CSSProperties}
      >
        <div className="mx-auto max-w-2xl">
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
