import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CreditCard, PlaneTakeoff } from "lucide-react";
import Footer from "@/components/home/Footer";
import Nav from "@/components/home/Nav";
import { getSupabaseAdminClient } from "@/lib/supabase/access";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const welcomeSteps = [
  {
    title: "Verified admin",
    text: "Your email is confirmed and tied to the school account.",
    Icon: BadgeCheck,
  },
  {
    title: "Subscription",
    text: "Pick monthly, quarterly, or annual billing on the pricing page.",
    Icon: CreditCard,
  },
  {
    title: "Workspace",
    text: "After checkout, continue into setup, branding, users, manuals, and training.",
    Icon: PlaneTakeoff,
  },
];

export const metadata: Metadata = {
  title: "Welcome | Flight Lyceum",
  description:
    "Welcome to Flight Lyceum. Verify your account, then choose a Stripe subscription to open your school workspace.",
  alternates: {
    canonical: "/welcome",
  },
};

async function getWelcomeContext() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { signedIn: false, schoolName: null };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { signedIn: false, schoolName: null };

  try {
    const admin = getSupabaseAdminClient();
    const { data: membership } = await admin
      .from("org_users")
      .select("organization_id, organizations(name)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const organization = membership?.organizations as { name?: string | null } | null;
    return {
      signedIn: true,
      schoolName: organization?.name ?? null,
    };
  } catch {
    return { signedIn: true, schoolName: null };
  }
}

export default async function WelcomePage() {
  const { signedIn, schoolName } = await getWelcomeContext();
  const pricingHref = schoolName
    ? `/pricing?registered=1&school=${encodeURIComponent(schoolName)}`
    : "/pricing";

  return (
    <div className="easa-quicken-app min-h-screen bg-[var(--easa-color-bg)]">
      <Nav signedIn={signedIn} />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-12 md:py-16">
        <section className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <p className="easa-eyebrow">Account verified</p>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight text-[var(--easa-color-text-primary)] md:text-6xl">
              Welcome{schoolName ? `, ${schoolName}` : ""}. Your school workspace is ready for billing.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--easa-color-text-muted)]">
              Choose a subscription plan next. Stripe handles the free trial, payment method, invoices, and renewal billing.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="easa-btn primary" href={pricingHref}>
                Continue to subscription <ArrowRight size={17} />
              </Link>
            </div>
          </div>

          <div className="easa-card-glass p-6">
            <div className="grid gap-4">
              {welcomeSteps.map(({ title, text, Icon }) => (
                <div key={title} className="rounded-[8px] bg-white/70 p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="rounded-[8px] bg-[var(--easa-color-brand-primary)]/10 p-2 text-[var(--easa-color-brand-primary)]">
                      <Icon size={19} />
                    </span>
                    <div>
                      <h2 className="text-sm font-semibold text-[var(--easa-color-text-primary)]">{title}</h2>
                      <p className="mt-1 text-sm leading-6 text-[var(--easa-color-text-muted)]">{text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
