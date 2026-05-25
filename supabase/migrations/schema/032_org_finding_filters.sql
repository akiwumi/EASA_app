create table if not exists public.org_finding_filters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  filter_type text not null default 'category', -- 'category' | 'reg_part' | 'source_id'
  filter_value text not null,                   -- e.g. 'Part-CAT', 'commercial_ops'
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists org_finding_filters_org_type_value_unique
  on public.org_finding_filters (organization_id, filter_type, filter_value);

alter table public.org_finding_filters enable row level security;

create policy "org_finding_filters read own" on public.org_finding_filters
  for select using (
    exists (
      select 1 from public.org_users
      where org_users.organization_id = org_finding_filters.organization_id
        and org_users.user_id = auth.uid()
    )
  );
