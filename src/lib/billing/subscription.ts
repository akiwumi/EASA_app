import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

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
