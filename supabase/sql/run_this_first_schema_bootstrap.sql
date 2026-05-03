-- EASA App bootstrap schema
-- Purpose:
-- 1. Create the core org/source tables
-- 2. Create permissions + schedules
-- 3. Create flightbook tables
-- 4. Extend schedules for automation
-- 5. Refresh PostgREST schema cache so Supabase sees the new tables
--
-- Safe to run in Supabase SQL Editor.

begin;

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists org_users (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'viewer',
  created_at timestamptz not null default now()
);

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  url text not null,
  type text not null default 'rss',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists sources_url_unique on sources (url);

create table if not exists rss_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  source_id uuid references sources(id) on delete set null,
  external_id text not null,
  title text not null,
  summary text,
  link text,
  category text,
  published_at timestamptz,
  raw_xml text,
  created_at timestamptz not null default now()
);

create unique index if not exists rss_items_external_id_unique on rss_items (external_id);

create table if not exists ai_findings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  rss_item_id uuid references rss_items(id) on delete cascade,
  impact text not null,
  confidence text not null,
  mapped_section text not null,
  status text not null,
  category text,
  summary text,
  created_at timestamptz not null default now()
);

create unique index if not exists ai_findings_item_unique on ai_findings (rss_item_id);

alter table organizations enable row level security;
alter table org_users enable row level security;
alter table sources enable row level security;
alter table rss_items enable row level security;
alter table ai_findings enable row level security;

drop policy if exists "organizations read own" on organizations;
create policy "organizations read own" on organizations
  for select
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = organizations.id
        and org_users.user_id = auth.uid()
    )
  );

drop policy if exists "org_users read own" on org_users;
create policy "org_users read own" on org_users
  for select
  using (org_users.user_id = auth.uid());

drop policy if exists "sources read own" on sources;
create policy "sources read own" on sources
  for select
  using (
    organization_id is null
    or exists (
      select 1 from org_users
      where org_users.organization_id = sources.organization_id
        and org_users.user_id = auth.uid()
    )
  );

drop policy if exists "rss_items read own" on rss_items;
create policy "rss_items read own" on rss_items
  for select
  using (
    organization_id is null
    or exists (
      select 1 from org_users
      where org_users.organization_id = rss_items.organization_id
        and org_users.user_id = auth.uid()
    )
  );

drop policy if exists "ai_findings read own" on ai_findings;
create policy "ai_findings read own" on ai_findings
  for select
  using (
    organization_id is null
    or exists (
      select 1 from org_users
      where org_users.organization_id = ai_findings.organization_id
        and org_users.user_id = auth.uid()
    )
  );

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum ('admin', 'editor', 'viewer');
  end if;
end $$;

alter table org_users
  alter column role drop default;

update org_users
set role = 'viewer'
where role is null
   or role not in ('admin', 'editor', 'viewer');

alter table org_users
  alter column role type app_role
  using role::app_role;

alter table org_users
  alter column role set default 'viewer'::app_role;

create table if not exists permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists role_permissions (
  id uuid primary key default gen_random_uuid(),
  role app_role not null,
  permission_code text not null references permissions(code) on delete cascade,
  created_at timestamptz not null default now(),
  unique (role, permission_code)
);

insert into permissions (code, description)
values
  ('manage_sources', 'Manage RSS/HTML sources'),
  ('run_pipeline', 'Run ingestion and AI analysis'),
  ('approve_updates', 'Approve or reject changes'),
  ('view_results', 'View AI findings and diffs'),
  ('manage_users', 'Invite and manage users')
on conflict (code) do nothing;

insert into role_permissions (role, permission_code)
values
  ('admin', 'manage_sources'),
  ('admin', 'run_pipeline'),
  ('admin', 'approve_updates'),
  ('admin', 'view_results'),
  ('admin', 'manage_users'),
  ('editor', 'run_pipeline'),
  ('editor', 'approve_updates'),
  ('editor', 'view_results'),
  ('viewer', 'view_results')
on conflict (role, permission_code) do nothing;

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

alter table permissions enable row level security;
alter table role_permissions enable row level security;
alter table schedules enable row level security;

drop policy if exists "permissions read all" on permissions;
create policy "permissions read all" on permissions
  for select
  using (true);

drop policy if exists "role_permissions read all" on role_permissions;
create policy "role_permissions read all" on role_permissions
  for select
  using (true);

drop policy if exists "schedules read own" on schedules;
create policy "schedules read own" on schedules
  for select
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = schedules.organization_id
        and org_users.user_id = auth.uid()
    )
  );

drop policy if exists "schedules manage by admin" on schedules;
create policy "schedules manage by admin" on schedules
  for all
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = schedules.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from org_users
      where org_users.organization_id = schedules.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role = 'admin'
    )
  );

drop policy if exists "org_users manage by admin" on org_users;
create policy "org_users manage by admin" on org_users
  for all
  using (
    exists (
      select 1 from org_users as ou
      where ou.organization_id = org_users.organization_id
        and ou.user_id = auth.uid()
        and ou.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from org_users as ou
      where ou.organization_id = org_users.organization_id
        and ou.user_id = auth.uid()
        and ou.role = 'admin'
    )
  );

create extension if not exists vector;

create table if not exists flightbooks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  doc_type text not null,
  file_ref text,
  version_label text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists flightbook_sections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  flightbook_id uuid not null references flightbooks(id) on delete cascade,
  parent_id uuid references flightbook_sections(id) on delete set null,
  section_number text,
  title text,
  body text not null,
  embedding vector(1536),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists flightbook_sections_book_sort_idx
  on flightbook_sections (flightbook_id, sort_order);

create table if not exists flightbook_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  flightbook_section_id uuid not null references flightbook_sections(id) on delete cascade,
  easa_section_ref text not null,
  confidence text not null default 'medium',
  match_type text not null default 'manual',
  created_at timestamptz not null default now()
);

create index if not exists flightbook_mappings_section_idx
  on flightbook_mappings (flightbook_section_id);

alter table flightbooks enable row level security;
alter table flightbook_sections enable row level security;
alter table flightbook_mappings enable row level security;

create table if not exists pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  steps jsonb,
  items_processed int default 0,
  changes_found int default 0,
  error_message text
);

create index if not exists pipeline_runs_org_started_idx
  on pipeline_runs (organization_id, started_at desc);

alter table pipeline_runs enable row level security;

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

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'schedules_organization_id_key'
      and conrelid = 'schedules'::regclass
  ) then
    alter table schedules add constraint schedules_organization_id_key unique (organization_id);
  end if;
end $$;

update schedules
set run_times_utc = array[run_time_utc]
where run_time_utc is not null
  and (
    run_times_utc is null
    or cardinality(run_times_utc) = 0
  );

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

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;

commit;

notify pgrst, 'reload schema';
