import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/home/Footer";
import Nav from "@/components/home/Nav";
import PricingPlans from "@/components/pricing/PricingPlans";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Pricing — Flight Lyceum",
  description:
    "Simple subscription pricing for EASA Approved Training Organisations. Start with a 7 day free trial, then pay by month, quarter, or year through Stripe.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Pricing — Flight Lyceum",
    description:
      "Start with a 7 day free trial, then choose monthly, quarterly, or annual Stripe billing for Flight Lyceum.",
    url: "/pricing",
  },
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams?: Promise<{ registered?: string; school?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return (
    <div className="easa-quicken-app min-h-screen bg-[var(--easa-color-bg)]">
      <Nav />
      <main>
        <div className="pricing-page mx-auto max-w-7xl px-6">
          <section className="pricing-hero">
            <div>
              <p className="pricing-kicker">Pricing</p>
              <h1>Choose the plan that works for your flight school</h1>
            </div>
            <p>
              Start with a 7 day free trial. After trial, pay securely through Stripe
              on a monthly, quarterly, or annual subscription.
            </p>
          </section>

          <PricingPlans
            signedIn={Boolean(user)}
            schoolName={resolvedSearchParams.registered === "1" ? resolvedSearchParams.school : undefined}
          />

          <section className="pricing-support">
            <article>
              <p className="pricing-kicker">Included</p>
              <h2>One workspace for compliance, manuals, and training records.</h2>
              <p>
                Every paid plan opens the same operational platform: EASA source monitoring,
                proposed manual updates, acknowledgement tracking, flightbook workflows,
                user management, and school branding controls.
              </p>
            </article>
            <article>
              <p className="pricing-kicker">Checkout</p>
              <h2>Stripe handles payment and subscription billing.</h2>
              <p>
                Signed-in school admins can start checkout directly from this page. New
                schools register first, then choose the plan from the same pricing screen.
              </p>
              <div className="pricing-support-actions">
                <Link href="/register">Register school</Link>
                <Link href="/login">Login to pay</Link>
              </div>
            </article>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
