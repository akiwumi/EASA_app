-- Ensure schedules table exists with all required columns.
-- Safe to run multiple times (all statements are idempotent).

create table if not exists schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  cadence text not null default 'daily',
  run_time_utc time not null default '06:00',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

alter table schedules add column if not exists cadence text not null default 'daily';
alter table schedules add column if not exists run_time_utc time not null default '06:00';
alter table schedules add column if not exists enabled boolean not null default true;
alter table schedules add column if not exists updated_at timestamptz not null default now();
alter table schedules add column if not exists runs_per_day int not null default 1;
alter table schedules add column if not exists run_times_utc time[] not null default array['06:00'::time];
alter table schedules add column if not exists auto_approve_low boolean not null default false;
alter table schedules add column if not exists auto_approve_delay_hours int not null default 24;
alter table schedules add column if not exists notify_on_detect boolean not null default true;
alter table schedules add column if not exists default_export_fmt text not null default 'pdf';

alter table schedules enable row level security;

-- Drop and recreate policies to avoid duplicate errors
drop policy if exists "schedules read own" on schedules;
drop policy if exists "schedules manage by admin" on schedules;

create policy "schedules read own" on schedules
  for select
  using (
    organization_id is null
    or exists (
      select 1 from org_users
      where org_users.organization_id = schedules.organization_id
        and org_users.user_id = auth.uid()
    )
  );

-- Allow service role to bypass (used by the API routes)
create policy "schedules manage by admin" on schedules
  for all
  using (
    organization_id is null
    or exists (
      select 1 from org_users
      where org_users.organization_id = schedules.organization_id
        and org_users.user_id = auth.uid()
    )
  )
  with check (
    organization_id is null
    or exists (
      select 1 from org_users
      where org_users.organization_id = schedules.organization_id
        and org_users.user_id = auth.uid()
    )
  );
