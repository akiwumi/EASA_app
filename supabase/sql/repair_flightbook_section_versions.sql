-- Repair script for flightbook section version history.
-- Run in Supabase SQL Editor if `public.flightbook_section_versions`
-- is missing or if version history is not being recorded for manual edits.

create table if not exists public.flightbook_section_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  flightbook_section_id uuid not null references public.flightbook_sections(id) on delete cascade,
  body text not null,
  version_number int not null,
  change_source text not null,
  created_by uuid references auth.users (id) on delete set null,
  approval_id uuid references public.approvals(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists section_versions_unique
  on public.flightbook_section_versions (flightbook_section_id, version_number);

create index if not exists flightbook_section_versions_org_created_idx
  on public.flightbook_section_versions (organization_id, created_at desc);

alter table public.flightbook_section_versions enable row level security;

drop policy if exists "flightbook_section_versions select org" on public.flightbook_section_versions;
create policy "flightbook_section_versions select org" on public.flightbook_section_versions
  for select using (
    exists (
      select 1
      from public.org_users ou
      where ou.organization_id = flightbook_section_versions.organization_id
        and ou.user_id = auth.uid()
    )
  );

create or replace function public.snapshot_flightbook_section_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_version int;
  latest_version_body text;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if old.body is not distinct from new.body then
    return new;
  end if;

  select fsv.body
    into latest_version_body
  from public.flightbook_section_versions fsv
  where fsv.flightbook_section_id = old.id
  order by fsv.version_number desc
  limit 1;

  -- Avoid duplicate snapshots when the application has already stored
  -- the "before" body as part of an approved-update or rollback flow.
  if latest_version_body is not distinct from old.body then
    return new;
  end if;

  select coalesce(max(fsv.version_number), 0) + 1
    into next_version
  from public.flightbook_section_versions fsv
  where fsv.flightbook_section_id = old.id;

  insert into public.flightbook_section_versions (
    organization_id,
    flightbook_section_id,
    body,
    version_number,
    change_source,
    created_by
  )
  values (
    old.organization_id,
    old.id,
    old.body,
    next_version,
    'manual_edit',
    auth.uid()
  );

  return new;
end;
$$;

drop trigger if exists trg_snapshot_flightbook_section_version on public.flightbook_sections;
create trigger trg_snapshot_flightbook_section_version
  before update of body on public.flightbook_sections
  for each row
  execute procedure public.snapshot_flightbook_section_version();

-- Give every existing section at least one baseline snapshot so the
-- dashboard/history UI has data immediately after this repair runs.
insert into public.flightbook_section_versions (
  organization_id,
  flightbook_section_id,
  body,
  version_number,
  change_source,
  created_at
)
select
  fs.organization_id,
  fs.id,
  fs.body,
  1,
  'baseline',
  coalesce(fs.updated_at, fs.created_at, now())
from public.flightbook_sections fs
where not exists (
  select 1
  from public.flightbook_section_versions fsv
  where fsv.flightbook_section_id = fs.id
);
