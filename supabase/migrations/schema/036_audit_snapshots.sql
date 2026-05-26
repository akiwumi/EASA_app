create table if not exists audit_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  label text not null,
  flightbook_count int not null default 0,
  pending_review_count int not null default 0,
  approved_this_week_count int not null default 0,
  active_source_count int not null default 0,
  total_source_count int not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists audit_snapshot_exports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  audit_snapshot_id uuid not null references audit_snapshots(id) on delete cascade,
  flightbook_id uuid not null references flightbooks(id) on delete cascade,
  flightbook_export_id uuid not null references flightbook_exports(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists audit_snapshots_org_created_idx
  on audit_snapshots (organization_id, created_at desc);

create index if not exists audit_snapshot_exports_snapshot_idx
  on audit_snapshot_exports (audit_snapshot_id, created_at desc);

create unique index if not exists audit_snapshot_exports_unique
  on audit_snapshot_exports (audit_snapshot_id, flightbook_id);

alter table audit_snapshots enable row level security;
alter table audit_snapshot_exports enable row level security;

drop policy if exists "audit_snapshots select org" on audit_snapshots;
create policy "audit_snapshots select org" on audit_snapshots
  for select using (
    exists (
      select 1 from org_users ou
      where ou.organization_id = audit_snapshots.organization_id
        and ou.user_id = auth.uid()
    )
  );

drop policy if exists "audit_snapshots insert admin" on audit_snapshots;
create policy "audit_snapshots insert admin" on audit_snapshots
  for insert with check (
    public.user_is_org_admin(organization_id)
  );

drop policy if exists "audit_snapshot_exports select org" on audit_snapshot_exports;
create policy "audit_snapshot_exports select org" on audit_snapshot_exports
  for select using (
    exists (
      select 1 from org_users ou
      where ou.organization_id = audit_snapshot_exports.organization_id
        and ou.user_id = auth.uid()
    )
  );

drop policy if exists "audit_snapshot_exports insert admin" on audit_snapshot_exports;
create policy "audit_snapshot_exports insert admin" on audit_snapshot_exports
  for insert with check (
    public.user_is_org_admin(organization_id)
  );
