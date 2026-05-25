create table if not exists public.org_ui_state (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  pipeline_summary_seen_run_id uuid references public.pipeline_runs(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

alter table public.org_ui_state enable row level security;

create policy "org_ui_state read own" on public.org_ui_state
  for select using (auth.uid() = user_id);
