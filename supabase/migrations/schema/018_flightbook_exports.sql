create table if not exists flightbook_exports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  flightbook_id uuid not null references flightbooks(id) on delete cascade,
  version_number int not null,
  change_source text not null,
  proposed_update_id uuid references proposed_updates(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  markdown_storage_path text not null,
  text_storage_path text not null,
  markdown_bytes int,
  text_bytes int,
  note text,
  created_at timestamptz not null default now()
);

create unique index if not exists flightbook_exports_book_version_unique
  on flightbook_exports (flightbook_id, version_number);

create index if not exists flightbook_exports_org_created_idx
  on flightbook_exports (organization_id, created_at desc);

alter table flightbook_exports enable row level security;
