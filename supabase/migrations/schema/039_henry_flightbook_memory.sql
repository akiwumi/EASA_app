-- Read-only advisory memory for Henry flight book analysis.

create table if not exists ai_memory_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  flightbook_id uuid references flightbooks(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed')),
  scope text not null default 'manual_reanalysis'
    check (scope in ('flightbook_upload', 'manual_reanalysis', 'section_refresh')),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists ai_memories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  flightbook_id uuid references flightbooks(id) on delete cascade,
  flightbook_section_id uuid references flightbook_sections(id) on delete cascade,
  memory_run_id uuid references ai_memory_runs(id) on delete set null,
  source_chunk_hash text,
  memory_type text not null check (
    memory_type in ('section_summary', 'obligation', 'update_hint', 'risk_note', 'training_link')
  ),
  title text not null,
  content text not null,
  tags text[] not null default '{}',
  confidence numeric not null default 0.5 check (confidence >= 0 and confidence <= 1),
  metadata jsonb not null default '{}'::jsonb,
  stale_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_memory_runs_org_book_created_idx
  on ai_memory_runs (organization_id, flightbook_id, created_at desc);

create index if not exists ai_memory_runs_org_status_idx
  on ai_memory_runs (organization_id, status);

create index if not exists ai_memories_org_book_type_idx
  on ai_memories (organization_id, flightbook_id, memory_type);

create index if not exists ai_memories_active_section_idx
  on ai_memories (organization_id, flightbook_section_id, source_chunk_hash)
  where stale_at is null;

create index if not exists ai_memories_active_book_idx
  on ai_memories (organization_id, flightbook_id, created_at desc)
  where stale_at is null;

create index if not exists ai_memories_tags_gin_idx
  on ai_memories using gin (tags);

create index if not exists ai_memories_metadata_gin_idx
  on ai_memories using gin (metadata);

alter table ai_memory_runs enable row level security;
alter table ai_memories enable row level security;

drop policy if exists "ai_memory_runs select org" on ai_memory_runs;
create policy "ai_memory_runs select org"
  on ai_memory_runs for select
  to authenticated
  using (
    exists (
      select 1 from org_users ou
      where ou.organization_id = ai_memory_runs.organization_id
        and ou.user_id = auth.uid()
    )
  );

drop policy if exists "ai_memories select org" on ai_memories;
create policy "ai_memories select org"
  on ai_memories for select
  to authenticated
  using (
    exists (
      select 1 from org_users ou
      where ou.organization_id = ai_memories.organization_id
        and ou.user_id = auth.uid()
    )
  );

grant select on ai_memory_runs to authenticated;
grant select on ai_memories to authenticated;
revoke insert, update, delete on ai_memory_runs from authenticated;
revoke insert, update, delete on ai_memories from authenticated;
