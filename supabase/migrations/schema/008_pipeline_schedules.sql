-- Pipeline runs and schedule extensions (MASTER_BUILD §8 Migration 008)

create table if not exists pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  steps jsonb,
  items_processed int default 0,
  changes_found int default 0,
  error_message text
);

create index if not exists pipeline_runs_org_started_idx
  on pipeline_runs (organization_id, started_at desc);

alter table pipeline_runs enable row level security;

alter table schedules
  add column if not exists runs_per_day int not null default 1;

alter table schedules
  add column if not exists run_times_utc time[] not null default array['06:00'::time];

alter table schedules
  add column if not exists auto_approve_low boolean not null default false;

alter table schedules
  add column if not exists auto_approve_delay_hours int not null default 24;

alter table schedules
  add column if not exists notify_on_detect boolean not null default true;

alter table schedules
  add column if not exists default_export_fmt text not null default 'pdf';

-- Sync array column from legacy run_time_utc (one-time per environment)
update schedules
set run_times_utc = array[run_time_utc]
where run_time_utc is not null;
