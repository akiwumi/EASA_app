import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { insertBillingNotifications, upsertOrganizationSubscriptionFromStripe } from "@/lib/billing/subscription";
import { getStripeServerClient } from "@/lib/stripe/server";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function getOrgIdFromObject(object: Stripe.Event.Data.Object) {
  const maybeMetadata = (
    object as Stripe.Subscription | Stripe.Checkout.Session | { metadata?: Record<string, string> | null }
  ).metadata;
  return maybeMetadata?.organization_id ?? null;
}

function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice) {
  const subscription = (invoice as { subscription?: string | null }).subscription;
  return typeof subscription === "string" ? subscription : null;
}

async function findOrgIdBySubscription(admin: ReturnType<typeof getAdminClient>, subscriptionId: string) {
  const { data } = await admin
    .from("organization_subscriptions")
    .select("organization_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  return data?.organization_id ?? null;
}

export async function POST(request: Request) {
  const stripe = getStripeServerClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 400 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid webhook signature." },
      { status: 400 },
    );
  }

  const admin = getAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const organizationId = getOrgIdFromObject(session);
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;

        if (organizationId && subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await upsertOrganizationSubscriptionFromStripe(admin, organizationId, subscription);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const organizationId =
          getOrgIdFromObject(subscription) ??
          (await findOrgIdBySubscription(admin, subscription.id));

        if (organizationId) {
          await upsertOrganizationSubscriptionFromStripe(admin, organizationId, subscription, {
            locked_at:
              subscription.status === "canceled" || subscription.status === "incomplete_expired"
                ? new Date().toISOString()
                : null,
            suspension_reason:
              subscription.status === "canceled" || subscription.status === "incomplete_expired"
                ? "subscription_ended"
                : null,
          });

          if (subscription.cancel_at_period_end) {
            await insertBillingNotifications(admin, organizationId, {
              adminsOnly: true,
              title: "Subscription will end at period close",
              body: "Cancellation is scheduled at the end of the current paid period. Access remains active until that period ends.",
              relatedEntityId: subscription.id,
            });
          }
        }
        break;
      }

      case "invoice.upcoming": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = getSubscriptionIdFromInvoice(invoice);
        if (subscriptionId) {
          const organizationId = await findOrgIdBySubscription(admin, subscriptionId);
          if (organizationId) {
            await admin
              .from("organization_subscriptions")
              .update({
                upcoming_invoice_at: invoice.next_payment_attempt
                  ? new Date(invoice.next_payment_attempt * 1000).toISOString()
                  : new Date().toISOString(),
                reminder_sent_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("organization_id", organizationId);

            await insertBillingNotifications(admin, organizationId, {
              adminsOnly: true,
              title: "Billing reminder: renewal in 7 days",
              body: "Your Stripe subscription renewal is coming up in about one week. Review billing details and payment method now.",
              relatedEntityId: subscriptionId,
            });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = getSubscriptionIdFromInvoice(invoice);
        if (subscriptionId) {
          const organizationId = await findOrgIdBySubscription(admin, subscriptionId);
          if (organizationId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            await upsertOrganizationSubscriptionFromStripe(admin, organizationId, subscription, {
              billing_state: "suspended",
              locked_at: new Date().toISOString(),
              suspension_reason: "payment_failed",
              suspension_notice_sent_at: new Date().toISOString(),
              last_invoice_id: invoice.id,
              last_invoice_status: invoice.status ?? "payment_failed",
            });

            await insertBillingNotifications(admin, organizationId, {
              title: "Subscription suspended",
              body: "The latest Stripe payment failed. The app is locked until an admin resumes payment or updates the billing method.",
              relatedEntityId: subscriptionId,
            });
          }
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = getSubscriptionIdFromInvoice(invoice);
        if (subscriptionId) {
          const organizationId = await findOrgIdBySubscription(admin, subscriptionId);
          if (organizationId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            await upsertOrganizationSubscriptionFromStripe(admin, organizationId, subscription, {
              locked_at: null,
              suspension_reason: null,
              last_invoice_id: invoice.id,
              last_invoice_status: invoice.status ?? "paid",
            });

            await insertBillingNotifications(admin, organizationId, {
              adminsOnly: true,
              title: "Subscription payment received",
              body: "Stripe confirmed payment and full access remains active.",
              relatedEntityId: subscriptionId,
            });
          }
        }
        break;
      }

      default:
        break;
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed." },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
