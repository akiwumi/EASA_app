export const LIFETIME_ACCESS_EMAILS = [
  "admin2@easa.local",
  "admin3@easa.local",
] as const;

export function hasLifetimeAccessEmail(email?: string | null) {
  if (!email) return false;
  return LIFETIME_ACCESS_EMAILS.includes(
    email.trim().toLowerCase() as (typeof LIFETIME_ACCESS_EMAILS)[number],
  );
}

export function applyLifetimeBillingState<
  T extends { billing_state?: string | null; subscription_status?: string | null },
>(subscription: T | null, email?: string | null): T | null {
  if (!hasLifetimeAccessEmail(email)) return subscription;

  return {
    ...(subscription ?? ({} as T)),
    billing_state: "active",
    subscription_status: "active",
  };
}
