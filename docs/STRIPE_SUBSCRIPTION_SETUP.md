# Stripe Subscription Setup

This app now expects Stripe to manage school subscriptions with:

- a `7` day free trial at signup
- admin-controlled billing only
- cancel-at-period-end support
- app lock when payment fails or the subscription ends
- a billing reminder one week before renewal
- a suspension notification when payment is not made

## 1. SQL to apply

Apply these migrations in order if they are not already in your database:

- `supabase/migrations/schema/025_user_profiles_org_admin_upgrades.sql`
- `supabase/migrations/schema/026_stripe_billing.sql`

If you prefer to paste SQL manually into Supabase SQL Editor, paste the full contents of those files.

## 2. Required environment variables

Add these to `.env.local`, your production host, and any server deployment environment:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_QUARTERLY=price_...
STRIPE_PRICE_ID_ANNUAL=price_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL="Flight Lyceum <verified-domain@example.com>"
```

Keep these existing Supabase values in place:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## 3. Stripe dashboard manual steps

1. Create recurring Stripe products/prices for monthly, quarterly, and annual billing.
2. Copy the recurring price IDs into `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_QUARTERLY`, and `STRIPE_PRICE_ID_ANNUAL`.
3. In Stripe Billing, enable the customer portal.
4. In the customer portal settings, allow:
   - payment method updates
   - invoice history
   - subscription cancellation
   - cancellation at period end
5. In Stripe Billing automations or renewal settings, configure upcoming renewal notifications for `7` days before renewal.
6. Create a webhook endpoint pointing to:
   - local: `http://localhost:3000/api/stripe/webhook`
   - production: `https://your-domain/api/stripe/webhook`
7. Subscribe the webhook to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.upcoming`
   - `invoice.payment_failed`
   - `invoice.paid`
8. Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

## 4. Email verification manual steps

1. In Resend, verify the sending domain used by `RESEND_FROM_EMAIL`.
2. Add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to local and production environments.
3. In Supabase Auth URL Configuration, add these redirect URLs:
   - local: `http://localhost:3000/auth/callback`
   - production: `https://your-domain/auth/callback`
4. Keep Supabase email confirmations enabled. New school admins are created unconfirmed and receive a Flight Lyceum verification email.
5. The verification link lands at `/auth/callback?next=/welcome`, signs the admin in, then redirects to `/welcome`.

## 5. Trial behavior

The checkout flow now creates subscriptions with a `7` day Stripe trial:

- during the trial the subscription state is `trialing`
- when the trial ends, Stripe attempts the first subscription payment
- if that payment succeeds, the workspace remains active
- if it fails, the workspace is suspended until payment is fixed

## 6. Lock behavior

The app uses `organization_subscriptions.billing_state` to control access.

- `trialing`, `active`, and `cancel_scheduled` keep access open
- `inactive`, `suspended`, and `canceled` lock the app until billing is started or recovered
- admins can still reach billing settings to recover payment
- cancellation uses Stripe `cancel_at_period_end=true`, so access continues until the paid period ends

## 7. Manual test checklist

1. Register a school from `/register`.
2. Confirm the admin receives a verification email.
3. Click the verification link and confirm it lands on `/welcome`.
4. Continue to `/pricing` and start checkout as the signed-in school admin.
5. Confirm the Stripe checkout shows a `7` day trial before billing starts.
6. Complete checkout and confirm the `organization_subscriptions` row becomes `trialing` or `active`.
7. Cancel at period end and confirm:
   - `cancel_at_period_end` becomes `true`
   - access still works until `current_period_end`
8. Resume the subscription and confirm the cancel flag is removed.
9. Trigger `invoice.upcoming` from Stripe test mode and confirm an in-app billing reminder notification is created.
10. Trigger `invoice.payment_failed` and confirm:
   - `billing_state` becomes `suspended`
   - users are redirected to `/subscription-locked`
11. Trigger `invoice.paid` and confirm access is restored.

## 8. Notes

- New registration creates an `inactive` subscription row. The admin must verify email and start Stripe checkout before protected app access opens.
- The app stores Stripe subscription state locally so it can enforce locking without calling Stripe on every page load.
- In-app notifications are written to the existing `notifications` table.
- If you want email delivery for reminders and suspensions as well, add Stripe customer emails and/or connect this billing flow to your existing email-notification pipeline.
