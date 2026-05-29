-- Lifetime access for registered demo admins; Stripe must not lock these schools.
update organization_subscriptions
set
  subscription_status = 'active',
  billing_state = 'active',
  cancel_at_period_end = false,
  suspended_at = null,
  suspension_reason = null,
  updated_at = now()
where organization_id in (
  select org_users.organization_id
  from org_users
  join auth.users on auth.users.id = org_users.user_id
  where lower(auth.users.email) in ('admin2@easa.local', 'admin3@easa.local')
    and org_users.role = 'admin'
);
