import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { getStripeServerClient } from "@/lib/stripe/server";

export type BillingState =
  | "inactive"
  | "trialing"
  | "active"
  | "cancel_scheduled"
  | "suspended"
  | "canceled";

export function isoOrNull(value?: number | null) {
  return value ? new Date(value * 1000).toISOString() : null;
}

function subscriptionTimestamp(
  subscription: Stripe.Subscription,
  key: "current_period_start" | "current_period_end" | "trial_start" | "trial_end",
) {
  const value = (subscription as unknown as Record<string, unknown>)[key];
  return typeof value === "number" ? value : null;
}

export function deriveBillingState(subscription: Stripe.Subscription): BillingState {
  if (subscription.status === "trialing") return "trialing";
  if (subscription.status === "active") {
    return subscription.cancel_at_period_end ? "cancel_scheduled" : "active";
  }
  if (subscription.status === "canceled" || subscription.status === "incomplete_expired") {
    return "canceled";
  }
  if (subscription.status === "past_due" || subscription.status === "unpaid" || subscription.status === "paused") {
    return "suspended";
  }
  return "inactive";
}

export async function upsertOrganizationSubscriptionFromStripe(
  admin: SupabaseClient,
  organizationId: string,
  subscription: Stripe.Subscription,
  overrides?: Partial<{
    billing_state: BillingState;
    locked_at: string | null;
    suspension_reason: string | null;
    reminder_sent_at: string | null;
    suspension_notice_sent_at: string | null;
    last_invoice_id: string | null;
    last_invoice_status: string | null;
    upcoming_invoice_at: string | null;
  }>,
) {
  const payload = {
    organization_id: organizationId,
    stripe_customer_id:
      typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? null,
    stripe_subscription_id: subscription.id,
    stripe_price_id: subscription.items.data[0]?.price.id ?? null,
    subscription_status: subscription.status,
    billing_state: overrides?.billing_state ?? deriveBillingState(subscription),
    cancel_at_period_end: subscription.cancel_at_period_end,
    current_period_start: isoOrNull(subscriptionTimestamp(subscription, "current_period_start")),
    current_period_end: isoOrNull(subscriptionTimestamp(subscription, "current_period_end")),
    trial_start: isoOrNull(subscriptionTimestamp(subscription, "trial_start")),
    trial_end: isoOrNull(subscriptionTimestamp(subscription, "trial_end")),
    access_expires_at: isoOrNull(subscriptionTimestamp(subscription, "current_period_end")),
    locked_at: overrides?.locked_at ?? null,
    suspension_reason: overrides?.suspension_reason ?? null,
    reminder_sent_at: overrides?.reminder_sent_at,
    suspension_notice_sent_at: overrides?.suspension_notice_sent_at,
    last_invoice_id: overrides?.last_invoice_id ?? null,
    last_invoice_status: overrides?.last_invoice_status ?? null,
    upcoming_invoice_at: overrides?.upcoming_invoice_at ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin
    .from("organization_subscriptions")
    .upsert(payload, { onConflict: "organization_id" });

  if (error) {
    throw error;
  }
}

export async function insertBillingNotifications(
  admin: SupabaseClient,
  organizationId: string,
  {
    adminsOnly = false,
    title,
    body,
    relatedEntityId = null,
  }: {
    adminsOnly?: boolean;
    title: string;
    body: string;
    relatedEntityId?: string | null;
  },
) {
  let query = admin
    .from("org_users")
    .select("user_id, role")
    .eq("organization_id", organizationId);

  if (adminsOnly) {
    query = query.eq("role", "admin");
  }

  const { data: orgUsers, error } = await query;
  if (error || !orgUsers?.length) return;

  const rows = orgUsers.map((user) => ({
    organization_id: organizationId,
    user_id: user.user_id,
    type: "billing",
    title,
    body,
    related_entity_type: "organization_subscription",
    related_entity_id: relatedEntityId,
  }));

  await admin.from("notifications").insert(rows);
}

type SubscriptionSeatContext = {
  billing_state?: string | null;
  stripe_price_id?: string | null;
  subscription_status?: string | null;
};

function parsePositiveInteger(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return null;
}

function metadataSeatLimit(metadata?: Record<string, string>) {
  if (!metadata) return null;

  const keys = [
    "included_extra_users",
    "included_user_accounts",
    "extra_user_limit",
    "student_seat_limit",
  ];

  for (const key of keys) {
    const value = parsePositiveInteger(metadata[key]);
    if (value !== null) return value;
  }

  return null;
}

function subscriptionHasProvisioningAccess(billingState?: string | null) {
  return (
    billingState === "trialing" ||
    billingState === "active" ||
    billingState === "cancel_scheduled"
  );
}

function envSeatLimitForPriceId(priceId?: string | null, subscriptionStatus?: string | null) {
  const genericLimit =
    parsePositiveInteger(process.env.SUBSCRIPTION_INCLUDED_EXTRA_USERS) ??
    parsePositiveInteger(process.env.BILLING_INCLUDED_EXTRA_USERS);

  if (subscriptionStatus === "trialing") {
    return (
      parsePositiveInteger(process.env.SUBSCRIPTION_INCLUDED_EXTRA_USERS_TRIAL) ??
      genericLimit ??
      0
    );
  }

  const monthlyPriceId = process.env.STRIPE_PRICE_ID_MONTHLY ?? process.env.STRIPE_PRICE_ID;
  const annualPriceId = process.env.STRIPE_PRICE_ID_ANNUAL;

  if (priceId && annualPriceId && priceId === annualPriceId) {
    return (
      parsePositiveInteger(process.env.SUBSCRIPTION_INCLUDED_EXTRA_USERS_ANNUAL) ??
      genericLimit ??
      0
    );
  }

  if (priceId && monthlyPriceId && priceId === monthlyPriceId) {
    return (
      parsePositiveInteger(process.env.SUBSCRIPTION_INCLUDED_EXTRA_USERS_MONTHLY) ??
      genericLimit ??
      0
    );
  }

  return genericLimit ?? 0;
}

export async function resolveIncludedExtraUserLimit(subscription: SubscriptionSeatContext | null) {
  if (!subscriptionHasProvisioningAccess(subscription?.billing_state)) {
    return 0;
  }

  const stripePriceId = subscription?.stripe_price_id ?? null;
  if (stripePriceId) {
    try {
      const stripe = getStripeServerClient();
      if (stripe) {
        const price = await stripe.prices.retrieve(stripePriceId);
        const limit = metadataSeatLimit(price.metadata);
        if (limit !== null) {
          return limit;
        }
      }
    } catch {
      // Fall back to env-based mapping if Stripe metadata lookup fails.
    }
  }

  return envSeatLimitForPriceId(stripePriceId, subscription?.subscription_status ?? null);
}
