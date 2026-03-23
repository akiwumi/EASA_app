-- User profiles and update notes (MASTER_BUILD §8 Migration 006)

create table if not exists user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  notification_email boolean not null default true,
  notification_inapp boolean not null default true,
  notification_digest text not null default 'immediate',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists update_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  proposed_update_id uuid not null references proposed_updates(id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists update_notes_proposed_idx
  on update_notes (proposed_update_id, created_at desc);

alter table user_profiles enable row level security;
alter table update_notes enable row level security;
