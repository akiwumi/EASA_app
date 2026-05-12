create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists org_users (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'viewer',
  created_at timestamptz not null default now()
);

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  url text not null,
  type text not null default 'rss',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists sources_url_unique on sources (url);

create table if not exists rss_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  source_id uuid references sources(id) on delete set null,
  external_id text not null,
  title text not null,
  summary text,
  link text,
  category text,
  published_at timestamptz,
  raw_xml text,
  created_at timestamptz not null default now()
);

create unique index if not exists rss_items_source_external_org_unique
  on rss_items (source_id, external_id, organization_id)
  nulls not distinct;

create table if not exists ai_findings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  rss_item_id uuid references rss_items(id) on delete cascade,
  impact text not null,
  confidence text not null,
  mapped_section text not null,
  status text not null,
  category text,
  summary text,
  created_at timestamptz not null default now()
);

create unique index if not exists ai_findings_item_org_unique
  on ai_findings (rss_item_id, organization_id)
  nulls not distinct;

alter table organizations enable row level security;
alter table org_users enable row level security;
alter table sources enable row level security;
alter table rss_items enable row level security;
alter table ai_findings enable row level security;

create policy "organizations read own" on organizations
  for select
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = organizations.id
        and org_users.user_id = auth.uid()
    )
  );

create policy "org_users read own" on org_users
  for select
  using (org_users.user_id = auth.uid());

create policy "sources read own" on sources
  for select
  using (
    organization_id is null
    or exists (
      select 1 from org_users
      where org_users.organization_id = sources.organization_id
        and org_users.user_id = auth.uid()
    )
  );

create policy "rss_items read own" on rss_items
  for select
  using (
    organization_id is null
    or exists (
      select 1 from org_users
      where org_users.organization_id = rss_items.organization_id
        and org_users.user_id = auth.uid()
    )
  );

create policy "ai_findings read own" on ai_findings
  for select
  using (
    organization_id is null
    or exists (
      select 1 from org_users
      where org_users.organization_id = ai_findings.organization_id
        and org_users.user_id = auth.uid()
    )
  );
