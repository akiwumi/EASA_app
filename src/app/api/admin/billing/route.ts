import { NextResponse } from "next/server";
import Stripe from "stripe";
import { applyLifetimeBillingState, hasLifetimeAccessEmail } from "@/lib/billing/lifetime-access";
import { getOrgAdminContext, getSupabaseAdminClient } from "@/lib/supabase/access";

type PlanKey = "monthly" | "quarterly" | "annual" | "student_pack";

const TRIAL_DAYS = 30;

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey);
}

function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function getPriceId(plan: PlanKey) {
  if (plan === "quarterly") {
    return process.env.STRIPE_PRICE_ID_QUARTERLY;
  }

  if (plan === "annual") {
    return process.env.STRIPE_PRICE_ID_ANNUAL;
  }

  if (plan === "student_pack") {
    return process.env.STRIPE_PRICE_ID_STUDENT_PACK;
  }

  return process.env.STRIPE_PRICE_ID_MONTHLY ?? process.env.STRIPE_PRICE_ID;
}

function normalizePlan(value: unknown): PlanKey {
  if (value === "quarterly" || value === "annual" || value === "monthly" || value === "student_pack") {
    return value;
  }

  return "monthly";
}

export async function GET() {
  const ctx = await getOrgAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = getSupabaseAdminClient();
  const [{ data, error }, userResult] = await Promise.all([
    admin
      .from("organization_subscriptions")
      .select("*")
      .eq("organization_id", ctx.orgId)
      .maybeSingle(),
    admin.auth.admin.getUserById(ctx.userId),
  ]);

  if (error && error.code !== "PGRST116" && error.code !== "PGRST205" && error.code !== "42P01") {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const userEmail = userResult.data.user?.email ?? null;

  return NextResponse.json({
    stripeConfigured: Boolean(getStripe()),
    trialDays: TRIAL_DAYS,
    subscription: applyLifetimeBillingState(data ?? null, userEmail),
    lifetimeAccess: hasLifetimeAccessEmail(userEmail),
  });
}

export async function POST(request: Request) {
  const ctx = await getOrgAdminContext();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const stripe = getStripe();
  const admin = getSupabaseAdminClient();
  const userResult = await admin.auth.admin.getUserById(ctx.userId);

  if (hasLifetimeAccessEmail(userResult.data.user?.email)) {
    return NextResponse.json(
      { error: "This account already has lifetime access. Stripe checkout is not required." },
      { status: 400 },
    );
  }

  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured. Set STRIPE_SECRET_KEY first." },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const plan = normalizePlan(body?.plan);
  const priceId = getPriceId(plan);

  if (!priceId) {
    return NextResponse.json(
      { error: `Stripe price ID missing for ${plan} plan.` },
      { status: 400 },
    );
  }

  const [{ data: subscription }, { data: organization }] = await Promise.all([
    admin
      .from("organization_subscriptions")
      .select("stripe_customer_id")
      .eq("organization_id", ctx.orgId)
      .maybeSingle(),
    admin
      .from("organizations")
      .select("name")
      .eq("id", ctx.orgId)
      .maybeSingle(),
  ]);

  const appUrl = getAppUrl();
  const userEmail = userResult.data.user?.email ?? undefined;
  const customerId = subscription?.stripe_customer_id ?? undefined;

  const isStudentPack = plan === "student_pack";

  const session = await stripe.checkout.sessions.create({
    mode: isStudentPack ? "payment" : "subscription",
    customer: customerId,
    customer_email: customerId ? undefined : userEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: isStudentPack
      ? `${appUrl}/settings?tab=users&checkout=student_pack_success`
      : `${appUrl}/pricing?checkout=success`,
    cancel_url: isStudentPack
      ? `${appUrl}/settings?tab=users`
      : `${appUrl}/pricing?checkout=cancelled`,
    client_reference_id: ctx.orgId,
    metadata: {
      organizationId: ctx.orgId,
      userId: ctx.userId,
      plan,
    },
    ...(!isStudentPack && {
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: {
          organizationId: ctx.orgId,
          userId: ctx.userId,
          plan,
        },
      },
      custom_text: {
        submit: {
          message: `Your ${organization?.name ?? "Flight Lyceum"} workspace starts with a ${TRIAL_DAYS} day free trial.`,
        },
      },
    }),
  });

  return NextResponse.json({ url: session.url });
}
