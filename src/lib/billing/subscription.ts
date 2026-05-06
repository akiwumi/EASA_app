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
  return envSeatLimitForPriceId(stripePriceId, subscription?.subscription_status ?? null);
}
