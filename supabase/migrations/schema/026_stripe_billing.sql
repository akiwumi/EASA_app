-- Stripe subscription state, billing lock, and trial support

create table if not exists organization_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references organizations(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  subscription_status text not null default 'inactive',
  billing_state text not null default 'inactive',
  cancel_at_period_end boolean not null default false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  access_expires_at timestamptz,
  locked_at timestamptz,
  suspension_reason text,
  last_invoice_id text,
  last_invoice_status text,
  upcoming_invoice_at timestamptz,
  reminder_sent_at timestamptz,
  suspension_notice_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_subscriptions_billing_state_check check (
    billing_state in ('inactive', 'trialing', 'active', 'cancel_scheduled', 'suspended', 'canceled')
  )
);

create index if not exists organization_subscriptions_org_state_idx
  on organization_subscriptions (organization_id, billing_state);

alter table organization_subscriptions enable row level security;

drop policy if exists "organization_subscriptions read own" on organization_subscriptions;
create policy "organization_subscriptions read own" on organization_subscriptions
  for select
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = organization_subscriptions.organization_id
        and org_users.user_id = auth.uid()
    )
  );

drop policy if exists "organization_subscriptions manage by admin" on organization_subscriptions;
create policy "organization_subscriptions manage by admin" on organization_subscriptions
  for all
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = organization_subscriptions.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from org_users
      where org_users.organization_id = organization_subscriptions.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role = 'admin'
    )
  );
