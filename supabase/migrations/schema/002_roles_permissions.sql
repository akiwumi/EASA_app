do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum ('admin', 'editor', 'viewer');
  end if;
end $$;

alter table org_users
  alter column role type app_role
  using role::app_role;

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

create policy "permissions read all" on permissions
  for select
  using (true);

create policy "role_permissions read all" on role_permissions
  for select
  using (true);

create policy "schedules read own" on schedules
  for select
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = schedules.organization_id
        and org_users.user_id = auth.uid()
    )
  );

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
