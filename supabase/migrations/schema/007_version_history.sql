-- Version history, audit log, notifications (MASTER_BUILD §8 Migration 007)

create table if not exists flightbook_section_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  flightbook_section_id uuid not null references flightbook_sections(id) on delete cascade,
  body text not null,
  version_number int not null,
  change_source text not null,
  created_by uuid references auth.users (id) on delete set null,
  approval_id uuid references approvals(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists section_versions_unique
  on flightbook_section_versions (flightbook_section_id, version_number);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_org_created_idx
  on audit_log (organization_id, created_at desc);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  related_entity_type text,
  related_entity_id uuid,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on notifications (user_id, read, created_at desc);

alter table flightbook_section_versions enable row level security;
alter table audit_log enable row level security;
alter table notifications enable row level security;
