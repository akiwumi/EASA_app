-- AI provider configuration per organisation (MASTER_BUILD §11 Migration 010)
create table if not exists ai_provider_config (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  provider          text not null default 'openai',
  model             text not null default 'gpt-4o',
  api_key           text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint ai_provider_config_org_unique unique (organization_id)
);

alter table ai_provider_config enable row level security;

-- Only admins of the org can read or write their config
create policy "ai_provider_config admin only" on ai_provider_config
  for all
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = ai_provider_config.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role = 'admin'
    )
  );
