-- Flight books, sections, and EASA mapping (MASTER_BUILD §8 Migration 003)
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
