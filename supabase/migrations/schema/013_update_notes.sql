-- Notes on proposed updates (MASTER_BUILD §5.6)
create table if not exists update_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  proposed_update_id uuid not null references proposed_updates(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_email text,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists update_notes_update_idx
  on update_notes (proposed_update_id, created_at asc);

alter table update_notes enable row level security;
