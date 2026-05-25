create table if not exists org_ui_state (
  organization_id uuid not null,
  user_id         uuid not null,
  pipeline_summary_seen_run_id text,
  updated_at      timestamptz not null default now(),
  primary key (organization_id, user_id)
);

alter table org_ui_state enable row level security;
