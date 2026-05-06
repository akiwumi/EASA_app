import { NextResponse } from "next/server";
import { getOrgAdminContext, getSupabaseAdminClient } from "@/lib/supabase/access";
import { getStripeServerClient } from "@/lib/stripe/server";

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function GET() {
  const ctx = await getOrgAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("organization_subscriptions")
    .select("*")
    .eq("organization_id", ctx.orgId)
    .maybeSingle();

  if (error && error.code !== "PGRST116" && error.code !== "PGRST205" && error.code !== "42P01") {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    stripeConfigured: Boolean(
      process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      (process.env.STRIPE_PRICE_ID_MONTHLY || process.env.STRIPE_PRICE_ID),
    ),
    trialDays: 3,
    subscription: data ?? null,
  });
}

export async function POST(request: Request) {
  const ctx = await getOrgAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const stripe = getStripeServerClient();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 400 });
  }

  const body = (await request.json()) as { action?: string; plan?: string };
  const action = body.action;
  const plan = body.plan;
  const admin = getSupabaseAdminClient();
  const appUrl = getAppUrl();
  const { data: subscriptionRow } = await admin
    .from("organization_subscriptions")
    .select("*")
    .eq("organization_id", ctx.orgId)
    .maybeSingle();

  const monthlyPriceId = process.env.STRIPE_PRICE_ID_MONTHLY ?? process.env.STRIPE_PRICE_ID;
  const annualPriceId = process.env.STRIPE_PRICE_ID_ANNUAL;

  if (action === "checkout" || action === "trial") {
    const isAnnual = plan === "annual";
    const priceId = isAnnual ? annualPriceId : monthlyPriceId;
    if (!priceId) {
      return NextResponse.json(
        { error: isAnnual ? "STRIPE_PRICE_ID_ANNUAL is missing." : "Monthly Stripe price is missing." },
        { status: 400 },
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      success_url: `${appUrl}/settings?tab=branding&billing=success&plan=${plan ?? "monthly"}`,
      cancel_url: `${appUrl}/pricing?billing=cancelled&plan=${plan ?? "monthly"}`,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        ...(action === "trial" ? { trial_period_days: 3 } : {}),
        metadata: {
          organization_id: ctx.orgId,
          plan: plan ?? "monthly",
        },
      },
      customer: subscriptionRow?.stripe_customer_id ?? undefined,
      customer_email: undefined,
      metadata: {
        organization_id: ctx.orgId,
        plan: plan ?? "monthly",
      },
    });

    return NextResponse.json({ url: session.url });
  }

  if (action === "portal") {
    if (!subscriptionRow?.stripe_customer_id) {
      return NextResponse.json({ error: "No Stripe customer exists for this organization yet." }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscriptionRow.stripe_customer_id,
      return_url: `${appUrl}/settings?tab=branding`,
    });

    return NextResponse.json({ url: session.url });
  }

  if (action === "cancel") {
    if (!subscriptionRow?.stripe_subscription_id) {
      return NextResponse.json({ error: "No active Stripe subscription found." }, { status: 400 });
    }
    await stripe.subscriptions.update(subscriptionRow.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "resume") {
    if (!subscriptionRow?.stripe_subscription_id) {
      return NextResponse.json({ error: "No Stripe subscription found." }, { status: 400 });
    }
    await stripe.subscriptions.update(subscriptionRow.stripe_subscription_id, {
      cancel_at_period_end: false,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
