-- Regulation documents, snapshots, sections, changes (MASTER_BUILD §8 Migration 004)

create table if not exists reg_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  source_id uuid references sources(id) on delete set null,
  title text not null,
  reg_number text,
  part text,
  amendment text,
  url text,
  effective_date date,
  created_at timestamptz not null default now()
);

create table if not exists source_snapshots (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources(id) on delete cascade,
  scraped_at timestamptz not null default now(),
  content_hash text not null,
  raw_storage_path text,
  extracted_text text,
  status text not null default 'pending'
);

create unique index if not exists source_snapshots_hash_unique
  on source_snapshots (source_id, content_hash);

create table if not exists document_sections (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references source_snapshots(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  section_number text,
  title text,
  body text not null,
  sort_order int not null default 0
);

create table if not exists reg_changes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  source_id uuid references sources(id) on delete set null,
  reg_document_id uuid references reg_documents(id) on delete set null,
  old_snapshot_id uuid references source_snapshots(id) on delete set null,
  new_snapshot_id uuid references source_snapshots(id) on delete set null,
  section_ref text,
  change_type text not null,
  diff_text text,
  detected_at timestamptz not null default now()
);

create index if not exists reg_changes_org_detected_idx
  on reg_changes (organization_id, detected_at desc);

alter table reg_documents enable row level security;
alter table source_snapshots enable row level security;
alter table document_sections enable row level security;
alter table reg_changes enable row level security;
