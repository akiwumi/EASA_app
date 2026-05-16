import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/access";

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey);
}

function toIso(value: unknown) {
  if (typeof value !== "number") return null;
  return new Date(value * 1000).toISOString();
}

function billingStateForSubscription(subscription: Stripe.Subscription) {
  if (subscription.cancel_at_period_end && subscription.status === "active") {
    return "cancel_scheduled";
  }

  if (subscription.status === "trialing") return "trialing";
  if (subscription.status === "active") return "active";
  if (subscription.status === "canceled") return "canceled";

  return "suspended";
}

async function upsertSubscription(subscription: Stripe.Subscription, fallbackOrgId?: string | null) {
  const organizationId = subscription.metadata.organizationId ?? fallbackOrgId;
  if (!organizationId) return;

  const firstItem = subscription.items.data[0];
  const admin = getSupabaseAdminClient();
  const billingState = billingStateForSubscription(subscription);

  await admin.from("organization_subscriptions").upsert(
    {
      organization_id: organizationId,
      stripe_customer_id:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id,
      stripe_subscription_id: subscription.id,
      stripe_price_id: firstItem?.price?.id ?? null,
      subscription_status: subscription.status,
      billing_state: billingState,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_start: toIso((subscription as unknown as { current_period_start?: number }).current_period_start),
      current_period_end: toIso((subscription as unknown as { current_period_end?: number }).current_period_end),
      trial_start: toIso(subscription.trial_start),
      trial_end: toIso(subscription.trial_end),
      access_expires_at:
        billingState === "suspended" || billingState === "canceled"
          ? new Date().toISOString()
          : null,
      locked_at:
        billingState === "suspended" || billingState === "canceled"
          ? new Date().toISOString()
          : null,
      suspension_reason:
        billingState === "suspended"
          ? `Stripe subscription status: ${subscription.status}`
          : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" },
  );
}

async function handleCheckoutCompleted(stripe: Stripe, session: Stripe.Checkout.Session) {
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await upsertSubscription(subscription, session.metadata?.organizationId ?? session.client_reference_id);
}

async function handleInvoice(eventType: string, invoice: Stripe.Invoice) {
  const subscriptionId =
    typeof (invoice as unknown as { subscription?: string | { id: string } }).subscription === "string"
      ? (invoice as unknown as { subscription: string }).subscription
      : (invoice as unknown as { subscription?: { id: string } }).subscription?.id;

  if (!subscriptionId) return;

  const admin = getSupabaseAdminClient();
  const patch =
    eventType === "invoice.payment_failed"
      ? {
          billing_state: "suspended",
          locked_at: new Date().toISOString(),
          access_expires_at: new Date().toISOString(),
          suspension_reason: "Stripe invoice payment failed",
          last_invoice_id: invoice.id,
          last_invoice_status: invoice.status,
          suspension_notice_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      : eventType === "invoice.upcoming"
        ? {
            upcoming_invoice_at: toIso(invoice.created),
            last_invoice_id: invoice.id,
            last_invoice_status: invoice.status,
            reminder_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        : {
            billing_state: "active",
            locked_at: null,
            access_expires_at: null,
            suspension_reason: null,
            last_invoice_id: invoice.id,
            last_invoice_status: invoice.status,
            updated_at: new Date().toISOString(),
          };

  await admin
    .from("organization_subscriptions")
    .update(patch)
    .eq("stripe_subscription_id", subscriptionId);
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured." },
      { status: 400 },
    );
  }

  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid Stripe webhook." },
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    await handleCheckoutCompleted(stripe, event.data.object as Stripe.Checkout.Session);
  }

  if (event.type === "customer.subscription.updated") {
    await upsertSubscription(event.data.object as Stripe.Subscription);
  }

  if (event.type === "customer.subscription.deleted") {
    await upsertSubscription(event.data.object as Stripe.Subscription);
  }

  if (
    event.type === "invoice.payment_failed" ||
    event.type === "invoice.paid" ||
    event.type === "invoice.upcoming"
  ) {
    await handleInvoice(event.type, event.data.object as Stripe.Invoice);
  }

  return NextResponse.json({ received: true });
}
