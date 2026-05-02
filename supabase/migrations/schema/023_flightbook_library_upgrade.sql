-- Flightbook library metadata and collaboration upgrade (Phase 5)

alter table if exists flightbooks
  add column if not exists aircraft text,
  add column if not exists manual_group text,
  add column if not exists effective_date date,
  add column if not exists import_notes text,
  add column if not exists tags text[] not null default '{}';

create table if not exists flightbook_section_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  flightbook_section_id uuid not null references flightbook_sections(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists flightbooks_manual_group_idx
  on flightbooks (organization_id, manual_group);

create index if not exists flightbooks_effective_date_idx
  on flightbooks (organization_id, effective_date desc);

create index if not exists flightbook_section_comments_section_idx
  on flightbook_section_comments (flightbook_section_id, created_at desc);

alter table flightbook_section_comments enable row level security;
