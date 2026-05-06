# FINAL MANUAL IMPLIMENTATION

This is the beginner version.

Goal:

- show every manual step left
- show every environment variable left
- show every SQL file in the exact order you should run it
- include the actual SQL code so you can copy and paste it

If you are a novice coder, follow this file from top to bottom.

## 1. What is still left

The main app code is mostly already built.

The work still left is mostly:

1. Set environment variables.
2. Create and configure Supabase.
3. Run the SQL in the correct order.
4. Deploy Supabase Edge Functions.
5. Deploy the app to Vercel.
6. Create the first admin user.
7. Seed sources and upload or import manuals.
8. Configure optional systems like Stripe, email digests, and scheduled runs.

Important:

- do not skip steps
- do not run SQL out of order
- do one section at a time
- if a SQL block fails, stop and fix that error before moving on

## 2. Security warning first

Your local `.env` and `.env.local` currently contain live-looking secrets.

Before sharing the repo or deploying widely:

1. Keep secrets out of git commits.
2. Keep secrets out of screenshots and docs.
3. If these values were ever exposed, rotate them:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
   - `RESEND_API_KEY`
   - later: Stripe secrets too

## 3. What accounts/tools you need

You should have:

1. Supabase account
2. Vercel account
3. Stripe account if using billing
4. Resend account if using email digests
5. OpenAI account if using embeddings and AI features
6. Supabase CLI installed if you want to deploy Edge Functions from terminal

## 4. Full environment variable checklist

## 4.1 Local app: `.env.local`

Add or confirm these in `.env.local`.

Required:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Needed for AI and embeddings:

```env
OPENAI_API_KEY=
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

Optional AI alternatives:

```env
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
GEMINI_API_KEY=
```

Needed only if you use scheduled routes:

```env
SCHEDULED_PIPELINE_SECRET=
```

Needed only if you use email digests:

```env
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

Needed only if you use Stripe billing:

```env
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
```

Optional local mock mode:

```env
EASA_ENABLE_MOCK_UPDATES=true
```

## 4.2 Vercel production env vars

Add these in `Vercel -> Project Settings -> Environment Variables`.

Required:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=https://YOUR-PRODUCTION-DOMAIN
```

Recommended:

```env
OPENAI_API_KEY=
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
SCHEDULED_PIPELINE_SECRET=
```

Optional:

```env
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
GEMINI_API_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
```

## 4.3 Supabase Edge Function secrets

Set these in Supabase for Edge Functions:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
```

Minimum current working set:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

## 4.4 One-off script env vars

Only needed if you run helper scripts:

```env
SUPABASE_URL=
ADMIN_EMAIL=
ADMIN_PASSWORD=
ORG_NAME=
IMPORT_ORG_ID=
ORG_ID=
```

What they are for:

- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ORG_NAME` for `scripts/create-admin-user.mjs`
- `IMPORT_ORG_ID` for `scripts/import-flightbooks.mjs`
- `ORG_ID` for `scripts/backfill-embeddings.mjs`

## 5. Exact beginner order

Follow this exact order:

1. Create Supabase project.
2. Copy Supabase keys.
3. Fill `.env.local`.
4. Set Supabase Auth URLs.
5. Run SQL blocks in the order in this file.
6. Check storage buckets.
7. Deploy Supabase Edge Functions.
8. Add Supabase function secrets.
9. Create Vercel project.
10. Add Vercel env vars.
11. Deploy app.
12. Create first admin user.
13. Seed sources if needed.
14. Upload or import manuals.
15. Backfill embeddings if needed.
16. Configure scheduled pipeline runs if needed.
17. Configure email digests if needed.
18. Configure Stripe if needed.
19. Complete in-app setup.
20. Test everything.

## 6. Supabase click-by-click setup

## 6.1 Create project

In Supabase:

1. Click `New project`
2. Choose name
3. Choose database password
4. Wait for project to finish provisioning

## 6.2 Copy keys

In Supabase:

1. Open `Project Settings`
2. Open `API`
3. Copy:
   - project URL
   - anon key
   - service role key

Put those into `.env.local` and later into Vercel.

## 6.3 Set auth URLs

In Supabase:

1. Open `Authentication`
2. Open `URL Configuration`
3. Set:
   - `Site URL` = `http://localhost:3000` for local dev
   - add redirect URL `http://localhost:3000/**`
4. Later, add your production domain too

## 7. SQL overview before you paste anything

You will run these groups:

1. Main schema migrations
2. Trigger migration
3. RLS policy migrations
4. Storage migrations
5. Seed SQL

Best practice for a novice:

1. Open Supabase SQL Editor
2. Copy one SQL block only
3. Paste it
4. Run it
5. Wait for success
6. Move to the next block

## 8. SQL run order

Run in this exact order:

### 8.1 Schema

```text
001_init.sql
002_roles_permissions.sql
003_flightbooks.sql
004_reg_documents.sql
005_proposed_updates.sql
006_user_profiles.sql
007_version_history.sql
008_pipeline_schedules.sql
009_views.sql
010_ai_provider_config.sql
011_fix_schedules.sql
012_reg_changes_finding_link.sql
013_update_notes.sql
014_rag_embeddings.sql
015_rag_provenance.sql
016_rag_match_functions.sql
017_source_snapshot_storage_metadata.sql
018_flightbook_exports.sql
019_rss_item_embeddings.sql
020_flightbook_id_filter.sql
021_training_school_ops.sql
022_training_views.sql
023_flightbook_library_upgrade.sql
024_flightbook_section_version_repair.sql
025_user_profiles_org_admin_upgrades.sql
026_stripe_billing.sql
```

### 8.2 Trigger

```text
001_audit_flightbook.sql
```

### 8.3 RLS

```text
002_extended_rls.sql
003_flightbook_exports.sql
004_training_school_ops.sql
005_flightbook_library_upgrade.sql
```

### 8.4 Storage

```text
001_buckets.sql
002_easa_source_files.sql
```

### 8.5 Seed

Required:

```text
001_easa_sources.sql
002_html_sources.sql
```

Optional:

```text
003_flightbook_mappings.sql
```

Only run `003_flightbook_mappings.sql` after real manual sections exist.

## 8.6 Common SQL error and exact fix

If you see this error:

```text
ERROR: cannot alter type of a column used in a policy definition
DETAIL: policy training_form_submissions manage own org on table training_form_submissions depends on column "role"
```

That means:

- `org_users.role` is still a plain `text` column
- you already created later RLS policies that depend on that column
- Postgres will not let the column type change until those policies are dropped

### Step 1: Check whether you should skip `002_roles_permissions.sql`

Run this in Supabase SQL Editor:

```sql
select
  table_name,
  column_name,
  data_type,
  udt_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'org_users'
  and column_name = 'role';
```

If `udt_name` is already `app_role`:

- do **not** rerun `002_roles_permissions.sql`
- skip it
- continue with the next SQL file that has not been run yet

If `udt_name` is still `text`:

- use the recovery steps below

### Step 2: Drop the policies that block the type change

Run this:

```sql
drop policy if exists "schedules manage by admin" on schedules;
drop policy if exists "org_users manage by admin" on org_users;
drop policy if exists "ai_provider_config admin only" on ai_provider_config;
drop policy if exists "organization_branding manage by admin" on organization_branding;
drop policy if exists "organization_subscriptions manage by admin" on organization_subscriptions;

drop policy if exists "organization_branding manage by admin" on organization_branding;
drop policy if exists "onboarding_checklists manage by admin" on onboarding_checklists;
drop policy if exists "training_programmes manage by staff" on training_programmes;
drop policy if exists "training_phases manage by staff" on training_phases;
drop policy if exists "training_lessons manage by staff" on training_lessons;
drop policy if exists "lesson_documents manage by staff" on lesson_documents;
drop policy if exists "document_assignments read own" on document_assignments;
drop policy if exists "document_assignments manage by staff" on document_assignments;
drop policy if exists "acknowledgements read own" on acknowledgements;
drop policy if exists "acknowledgements insert by staff" on acknowledgements;
drop policy if exists "training_signoffs read own" on training_signoffs;
drop policy if exists "training_signoffs manage by staff" on training_signoffs;
drop policy if exists "training_forms manage by staff" on training_forms;
drop policy if exists "training_form_submissions read own" on training_form_submissions;
drop policy if exists "training_form_submissions manage own org" on training_form_submissions;

drop policy if exists "snapshots write admin" on storage.objects;
drop policy if exists "flightbooks write admin" on storage.objects;
drop policy if exists "exports write service-like admin" on storage.objects;
drop policy if exists "easa source files write admin" on storage.objects;
```

### Step 3: Convert `org_users.role` to the enum type

Run this:

```sql
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum ('admin', 'editor', 'viewer');
  end if;
end $$;

alter table org_users
  alter column role drop default;

update org_users
set role = 'viewer'
where role is null
   or role not in ('admin', 'editor', 'viewer');

alter table org_users
  alter column role type app_role
  using role::app_role;

alter table org_users
  alter column role set default 'viewer'::app_role;
```

### Step 4: Re-create the dropped policies

After the type change succeeds, re-run these files in this order:

```text
supabase/migrations/schema/010_ai_provider_config.sql
supabase/migrations/schema/011_fix_schedules.sql
supabase/migrations/schema/025_user_profiles_org_admin_upgrades.sql
supabase/migrations/schema/026_stripe_billing.sql
supabase/migrations/rls/004_training_school_ops.sql
supabase/migrations/storage/001_buckets.sql
supabase/migrations/storage/002_easa_source_files.sql
```

Important:

- do **not** rerun the full `002_roles_permissions.sql` file after the type has already been changed
- only rerun the specific policy files listed above

## 9. Actual SQL code

Everything below is the real SQL code, already ordered correctly.

## 9.1 `supabase/migrations/schema/001_init.sql`

```sql
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

create unique index if not exists rss_items_external_id_unique on rss_items (external_id);

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

create unique index if not exists ai_findings_item_unique on ai_findings (rss_item_id);

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
```

## 9.2 `supabase/migrations/schema/002_roles_permissions.sql`

```sql
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum ('admin', 'editor', 'viewer');
  end if;
end $$;

alter table org_users
  alter column role drop default;

update org_users
set role = 'viewer'
where role is null
   or role not in ('admin', 'editor', 'viewer');

alter table org_users
  alter column role type app_role
  using role::app_role;

alter table org_users
  alter column role set default 'viewer'::app_role;

create table if not exists permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists role_permissions (
  id uuid primary key default gen_random_uuid(),
  role app_role not null,
  permission_code text not null references permissions(code) on delete cascade,
  created_at timestamptz not null default now(),
  unique (role, permission_code)
);

insert into permissions (code, description)
values
  ('manage_sources', 'Manage RSS/HTML sources'),
  ('run_pipeline', 'Run ingestion and AI analysis'),
  ('approve_updates', 'Approve or reject changes'),
  ('view_results', 'View AI findings and diffs'),
  ('manage_users', 'Invite and manage users')
on conflict (code) do nothing;

insert into role_permissions (role, permission_code)
values
  ('admin', 'manage_sources'),
  ('admin', 'run_pipeline'),
  ('admin', 'approve_updates'),
  ('admin', 'view_results'),
  ('admin', 'manage_users'),
  ('editor', 'run_pipeline'),
  ('editor', 'approve_updates'),
  ('editor', 'view_results'),
  ('viewer', 'view_results')
on conflict (role, permission_code) do nothing;

create table if not exists schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  cadence text not null default 'daily',
  run_time_utc time not null default '06:00',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

alter table permissions enable row level security;
alter table role_permissions enable row level security;
alter table schedules enable row level security;

create policy "permissions read all" on permissions
  for select
  using (true);

create policy "role_permissions read all" on role_permissions
  for select
  using (true);

create policy "schedules read own" on schedules
  for select
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = schedules.organization_id
        and org_users.user_id = auth.uid()
    )
  );

create policy "schedules manage by admin" on schedules
  for all
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = schedules.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from org_users
      where org_users.organization_id = schedules.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role = 'admin'
    )
  );

create policy "org_users manage by admin" on org_users
  for all
  using (
    exists (
      select 1 from org_users as ou
      where ou.organization_id = org_users.organization_id
        and ou.user_id = auth.uid()
        and ou.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from org_users as ou
      where ou.organization_id = org_users.organization_id
        and ou.user_id = auth.uid()
        and ou.role = 'admin'
    )
  );
```

## 9.3 `supabase/migrations/schema/003_flightbooks.sql`

```sql
-- Flight books, sections, and EASA mapping (MASTER_BUILD §8 Migration 003)
create extension if not exists vector;

create table if not exists flightbooks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  doc_type text not null,
  file_ref text,
  version_label text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists flightbook_sections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  flightbook_id uuid not null references flightbooks(id) on delete cascade,
  parent_id uuid references flightbook_sections(id) on delete set null,
  section_number text,
  title text,
  body text not null,
  embedding vector(1536),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists flightbook_sections_book_sort_idx
  on flightbook_sections (flightbook_id, sort_order);

create table if not exists flightbook_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  flightbook_section_id uuid not null references flightbook_sections(id) on delete cascade,
  easa_section_ref text not null,
  confidence text not null default 'medium',
  match_type text not null default 'manual',
  created_at timestamptz not null default now()
);

create index if not exists flightbook_mappings_section_idx
  on flightbook_mappings (flightbook_section_id);

alter table flightbooks enable row level security;
alter table flightbook_sections enable row level security;
alter table flightbook_mappings enable row level security;
```

## 9.4 `supabase/migrations/schema/004_reg_documents.sql`

```sql
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
```

## 9.5 `supabase/migrations/schema/005_proposed_updates.sql`

```sql
-- Proposed updates and approvals (MASTER_BUILD §8 Migration 005)

create table if not exists proposed_updates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  reg_change_id uuid references reg_changes(id) on delete set null,
  flightbook_section_id uuid references flightbook_sections(id) on delete set null,
  classification text not null default 'watchlist',
  risk_level text not null default 'medium',
  ai_rationale text,
  ai_suggested_text text,
  confidence_score numeric(5, 2),
  status text not null default 'pending',
  auto_approve_at timestamptz,
  ai_model text,
  ai_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proposed_updates_org_status_idx
  on proposed_updates (organization_id, status, created_at desc);

create table if not exists approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  proposed_update_id uuid not null references proposed_updates(id) on delete cascade,
  action text not null,
  approver_id uuid references auth.users (id) on delete set null,
  comment text,
  decided_at timestamptz not null default now()
);

create index if not exists approvals_proposed_idx
  on approvals (proposed_update_id, decided_at desc);

alter table proposed_updates enable row level security;
alter table approvals enable row level security;
```

## 9.6 `supabase/migrations/schema/006_user_profiles.sql`

```sql
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
```

## 9.7 `supabase/migrations/schema/007_version_history.sql`

```sql
-- Version history, audit log, notifications (MASTER_BUILD §8 Migration 007)

create table if not exists flightbook_section_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  flightbook_section_id uuid not null references flightbook_sections(id) on delete cascade,
  body text not null,
  version_number int not null,
  change_source text not null,
  created_by uuid references auth.users (id) on delete set null,
  approval_id uuid references approvals(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists section_versions_unique
  on flightbook_section_versions (flightbook_section_id, version_number);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_org_created_idx
  on audit_log (organization_id, created_at desc);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  related_entity_type text,
  related_entity_id uuid,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on notifications (user_id, read, created_at desc);

alter table flightbook_section_versions enable row level security;
alter table audit_log enable row level security;
alter table notifications enable row level security;
```

## 9.8 `supabase/migrations/schema/008_pipeline_schedules.sql`

```sql
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
```

## 9.9 `supabase/migrations/schema/009_views.sql`

```sql
-- Analytics views (MASTER_BUILD §7). Requires prior schema + RLS.

create or replace view v_dashboard_stats with (security_invoker = true) as
select
  ou.organization_id,
  coalesce((
    select count(*)::bigint
    from reg_changes rc
    where rc.organization_id = ou.organization_id
      and rc.detected_at >= (now() - interval '7 days')
  ), 0) as new_changes_7d,
  coalesce((
    select count(*)::bigint
    from proposed_updates pu
    where pu.organization_id = ou.organization_id
      and pu.status = 'pending'
  ), 0) as pending_approvals,
  coalesce((
    select count(*)::bigint
    from approvals a
    join proposed_updates pu on pu.id = a.proposed_update_id
    where pu.organization_id = ou.organization_id
      and a.action in ('approved', 'auto_approved')
      and a.decided_at >= date_trunc('week', (now() at time zone 'utc'))
  ), 0) as approved_this_week,
  coalesce((
    select count(*)::bigint
    from sources s
    where s.organization_id = ou.organization_id
       or s.organization_id is null
  ), 0) as sources_total,
  coalesce((
    select count(*) filter (where s.active)::bigint
    from sources s
    where s.organization_id = ou.organization_id
       or s.organization_id is null
  ), 0) as sources_active
from org_users ou
where ou.user_id = auth.uid();

create or replace view v_update_queue with (security_invoker = true) as
select
  pu.id,
  pu.organization_id,
  pu.classification,
  pu.risk_level,
  pu.confidence_score,
  pu.status,
  pu.ai_rationale,
  pu.created_at,
  pu.updated_at,
  rc.section_ref as reg_section_ref,
  rc.change_type,
  rc.diff_text,
  fs.section_number,
  fs.title as flightbook_section_title,
  rd.reg_number,
  rd.part as regulation_part
from proposed_updates pu
left join reg_changes rc on rc.id = pu.reg_change_id
left join flightbook_sections fs on fs.id = pu.flightbook_section_id
left join reg_documents rd on rd.id = rc.reg_document_id
where exists (
  select 1 from org_users ou
  where ou.organization_id = pu.organization_id
    and ou.user_id = auth.uid()
);
```

## 9.10 `supabase/migrations/schema/010_ai_provider_config.sql`

```sql
-- AI provider configuration per organisation (MASTER_BUILD §11 Migration 010)
create table if not exists ai_provider_config (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  provider          text not null default 'openai',
  model             text not null default 'gpt-4o',
  api_key           text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint ai_provider_config_org_unique unique (organization_id)
);

alter table ai_provider_config enable row level security;

-- Only admins of the org can read or write their config
create policy "ai_provider_config admin only" on ai_provider_config
  for all
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = ai_provider_config.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role = 'admin'
    )
  );
```

## 9.11 `supabase/migrations/schema/011_fix_schedules.sql`

```sql
-- Ensure schedules table exists with all required columns.
-- Safe to run multiple times (all statements are idempotent).

create table if not exists schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  cadence text not null default 'daily',
  run_time_utc time not null default '06:00',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

alter table schedules add column if not exists cadence text not null default 'daily';
alter table schedules add column if not exists run_time_utc time not null default '06:00';
alter table schedules add column if not exists enabled boolean not null default true;
alter table schedules add column if not exists updated_at timestamptz not null default now();
alter table schedules add column if not exists runs_per_day int not null default 1;
alter table schedules add column if not exists run_times_utc time[] not null default array['06:00'::time];
alter table schedules add column if not exists auto_approve_low boolean not null default false;
alter table schedules add column if not exists auto_approve_delay_hours int not null default 24;
alter table schedules add column if not exists notify_on_detect boolean not null default true;
alter table schedules add column if not exists default_export_fmt text not null default 'pdf';

-- Add unique constraint on organization_id if it doesn't already exist
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'schedules_organization_id_key'
      and conrelid = 'schedules'::regclass
  ) then
    alter table schedules add constraint schedules_organization_id_key unique (organization_id);
  end if;
end $$;

alter table schedules enable row level security;

-- Drop and recreate policies to avoid duplicate errors
drop policy if exists "schedules read own" on schedules;
drop policy if exists "schedules manage by admin" on schedules;

create policy "schedules read own" on schedules
  for select
  using (
    organization_id is null
    or exists (
      select 1 from org_users
      where org_users.organization_id = schedules.organization_id
        and org_users.user_id = auth.uid()
    )
  );

-- Allow service role to bypass (used by the API routes)
create policy "schedules manage by admin" on schedules
  for all
  using (
    organization_id is null
    or exists (
      select 1 from org_users
      where org_users.organization_id = schedules.organization_id
        and org_users.user_id = auth.uid()
    )
  )
  with check (
    organization_id is null
    or exists (
      select 1 from org_users
      where org_users.organization_id = schedules.organization_id
        and org_users.user_id = auth.uid()
    )
  );
```

## 9.12 `supabase/migrations/schema/012_reg_changes_finding_link.sql`

```sql
-- Link reg_changes back to ai_findings (MASTER_BUILD §11.5 Phase 2)
alter table reg_changes
  add column if not exists ai_finding_id uuid references ai_findings(id) on delete set null;

create index if not exists reg_changes_finding_idx
  on reg_changes (ai_finding_id);

-- reg_part stores the EASA regulation family (Part-FCL, Part-MED, etc.)
-- We re-use section_ref for the specific section ref and add a dedicated part column
alter table reg_changes
  add column if not exists reg_part text;

create index if not exists reg_changes_org_part_idx
  on reg_changes (organization_id, reg_part, detected_at desc);
```

## 9.13 `supabase/migrations/schema/013_update_notes.sql`

```sql
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
```

## 9.14 `supabase/migrations/schema/014_rag_embeddings.sql`

```sql
-- RAG schema additions: embeddings and retrieval metadata

create extension if not exists vector;

alter table if exists document_sections
  add column if not exists embedding vector(1536),
  add column if not exists token_count int,
  add column if not exists chunk_hash text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table if exists flightbook_sections
  add column if not exists token_count int,
  add column if not exists chunk_hash text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists document_sections_snapshot_sort_idx
  on document_sections (snapshot_id, sort_order);

create index if not exists document_sections_org_sort_idx
  on document_sections (organization_id, sort_order);

create index if not exists document_sections_chunk_hash_idx
  on document_sections (chunk_hash);

create index if not exists flightbook_sections_chunk_hash_idx
  on flightbook_sections (chunk_hash);

create index if not exists document_sections_metadata_gin_idx
  on document_sections using gin (metadata);

create index if not exists flightbook_sections_metadata_gin_idx
  on flightbook_sections using gin (metadata);

create index if not exists document_sections_embedding_cosine_idx
  on document_sections using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists flightbook_sections_embedding_cosine_idx
  on flightbook_sections using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
```

## 9.15 `supabase/migrations/schema/015_rag_provenance.sql`

```sql
-- RAG provenance fields for generated proposals

alter table if exists proposed_updates
  add column if not exists retrieval_context jsonb,
  add column if not exists generation_prompt_version text,
  add column if not exists source_citations jsonb,
  add column if not exists retrieved_at timestamptz;

create index if not exists proposed_updates_retrieved_at_idx
  on proposed_updates (retrieved_at desc);

create index if not exists proposed_updates_source_citations_gin_idx
  on proposed_updates using gin (source_citations);
```

## 9.16 `supabase/migrations/schema/016_rag_match_functions.sql`

```sql
-- Vector search RPC functions for RAG retrieval

create or replace function match_document_sections(
  query_embedding text,
  match_count int default 5,
  min_similarity float default 0.30,
  filter_organization_id uuid default null,
  filter_part text default null,
  filter_source_id uuid default null
)
returns table (
  id uuid,
  snapshot_id uuid,
  organization_id uuid,
  section_number text,
  title text,
  body text,
  sort_order int,
  metadata jsonb,
  similarity float
)
language sql
stable
as $$
  with latest_snapshots as (
    select distinct on (ss.source_id)
      ss.id,
      ss.source_id
    from source_snapshots ss
    where ss.status = 'processed'
    order by ss.source_id, ss.scraped_at desc, ss.id desc
  )
  select
    ds.id,
    ds.snapshot_id,
    ds.organization_id,
    ds.section_number,
    ds.title,
    ds.body,
    ds.sort_order,
    ds.metadata,
    1 - (ds.embedding <=> query_embedding::vector) as similarity
  from document_sections ds
  join source_snapshots ss on ss.id = ds.snapshot_id
  join latest_snapshots ls on ls.id = ds.snapshot_id
  where ds.embedding is not null
    and (filter_organization_id is null or ds.organization_id = filter_organization_id)
    and (
      filter_part is null
      or coalesce(ds.metadata->>'part', '') = filter_part
      or coalesce(ds.metadata->>'reg_part', '') = filter_part
    )
    and (filter_source_id is null or ss.source_id = filter_source_id)
    and 1 - (ds.embedding <=> query_embedding::vector) >= min_similarity
  order by ds.embedding <=> query_embedding::vector
  limit match_count;
$$;

create or replace function match_flightbook_sections(
  query_embedding text,
  match_count int default 5,
  min_similarity float default 0.30,
  filter_organization_id uuid default null,
  filter_part text default null
)
returns table (
  id uuid,
  flightbook_id uuid,
  organization_id uuid,
  section_number text,
  title text,
  body text,
  sort_order int,
  metadata jsonb,
  flightbook_name text,
  similarity float
)
language sql
stable
as $$
  select
    fs.id,
    fs.flightbook_id,
    fs.organization_id,
    fs.section_number,
    fs.title,
    fs.body,
    fs.sort_order,
    fs.metadata,
    fb.name as flightbook_name,
    1 - (fs.embedding <=> query_embedding::vector) as similarity
  from flightbook_sections fs
  join flightbooks fb on fb.id = fs.flightbook_id
  where fs.embedding is not null
    and fb.active = true
    and (filter_organization_id is null or fs.organization_id = filter_organization_id)
    and (
      filter_part is null
      or coalesce(fs.metadata->>'part', '') = filter_part
      or exists (
        select 1
        from flightbook_mappings fm
        where fm.flightbook_section_id = fs.id
          and fm.easa_section_ref ilike '%' || filter_part || '%'
      )
    )
    and 1 - (fs.embedding <=> query_embedding::vector) >= min_similarity
  order by fs.embedding <=> query_embedding::vector
  limit match_count;
$$;
```

## 9.17 `supabase/migrations/schema/017_source_snapshot_storage_metadata.sql`

```sql
-- Track stored source-file artifacts for regulation snapshots.

alter table if exists source_snapshots
  add column if not exists storage_bucket text,
  add column if not exists storage_mime_type text,
  add column if not exists storage_bytes bigint,
  add column if not exists original_url text;

create index if not exists source_snapshots_source_scraped_idx
  on source_snapshots (source_id, scraped_at desc);
```

## 9.18 `supabase/migrations/schema/018_flightbook_exports.sql`

```sql
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
```

## 9.19 `supabase/migrations/schema/019_rss_item_embeddings.sql`

```sql
-- Add vector embedding column to rss_items for semantic similarity search

alter table rss_items add column if not exists embedding vector(1536);

create index if not exists rss_items_embedding_idx
  on rss_items using hnsw (embedding vector_cosine_ops);

-- Similarity search RPC used by ai-analyze to surface related past items
create or replace function match_rss_items(
  query_embedding text,
  match_count int default 5,
  min_similarity float default 0.30,
  filter_organization_id uuid default null,
  exclude_id uuid default null
)
returns table (
  id uuid,
  title text,
  summary text,
  category text,
  published_at timestamptz,
  similarity float
)
language sql
stable
as $$
  select
    ri.id,
    ri.title,
    ri.summary,
    ri.category,
    ri.published_at,
    1 - (ri.embedding <=> query_embedding::vector) as similarity
  from rss_items ri
  where ri.embedding is not null
    and (filter_organization_id is null or ri.organization_id = filter_organization_id)
    and (exclude_id is null or ri.id != exclude_id)
    and 1 - (ri.embedding <=> query_embedding::vector) >= min_similarity
  order by ri.embedding <=> query_embedding::vector
  limit match_count;
$$;
```

## 9.20 `supabase/migrations/schema/020_flightbook_id_filter.sql`

```sql
-- Add optional filter_flightbook_id parameter to match_flightbook_sections
-- so draft generation can target a specific flight book chosen by the user.

create or replace function match_flightbook_sections(
  query_embedding text,
  match_count int default 5,
  min_similarity float default 0.30,
  filter_organization_id uuid default null,
  filter_part text default null,
  filter_flightbook_id uuid default null
)
returns table (
  id uuid,
  flightbook_id uuid,
  organization_id uuid,
  section_number text,
  title text,
  body text,
  sort_order int,
  metadata jsonb,
  flightbook_name text,
  similarity float
)
language sql
stable
as $$
  select
    fs.id,
    fs.flightbook_id,
    fs.organization_id,
    fs.section_number,
    fs.title,
    fs.body,
    fs.sort_order,
    fs.metadata,
    fb.name as flightbook_name,
    1 - (fs.embedding <=> query_embedding::vector) as similarity
  from flightbook_sections fs
  join flightbooks fb on fb.id = fs.flightbook_id
  where fs.embedding is not null
    and fb.active = true
    and (filter_organization_id is null or fs.organization_id = filter_organization_id)
    and (filter_flightbook_id is null or fs.flightbook_id = filter_flightbook_id)
    and (
      filter_part is null
      or coalesce(fs.metadata->>'part', '') = filter_part
      or exists (
        select 1
        from flightbook_mappings fm
        where fm.flightbook_section_id = fs.id
          and fm.easa_section_ref ilike '%' || filter_part || '%'
      )
    )
    and 1 - (fs.embedding <=> query_embedding::vector) >= min_similarity
  order by fs.embedding <=> query_embedding::vector
  limit match_count;
$$;
```

## 9.21 `supabase/migrations/schema/021_training_school_ops.sql`

```sql
-- Flight-school training and operations schema (Phase 3)

do $$
begin
  if exists (select 1 from pg_type where typname = 'app_role') then
    if not exists (
      select 1
      from pg_enum
      where enumtypid = 'app_role'::regtype
        and enumlabel = 'instructor'
    ) then
      alter type app_role add value 'instructor';
    end if;
    if not exists (
      select 1
      from pg_enum
      where enumtypid = 'app_role'::regtype
        and enumlabel = 'student'
    ) then
      alter type app_role add value 'student';
    end if;
    if not exists (
      select 1
      from pg_enum
      where enumtypid = 'app_role'::regtype
        and enumlabel = 'compliance_manager'
    ) then
      alter type app_role add value 'compliance_manager';
    end if;
  end if;
end $$;

create table if not exists organization_branding (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references organizations(id) on delete cascade,
  public_name text,
  logo_url text,
  primary_color text,
  secondary_color text,
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists onboarding_checklists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  key text not null,
  label text not null,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, key)
);

create table if not exists training_programmes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  code text,
  name text not null,
  description text,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists training_phases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  programme_id uuid not null references training_programmes(id) on delete cascade,
  title text not null,
  description text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists training_lessons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  programme_id uuid not null references training_programmes(id) on delete cascade,
  phase_id uuid references training_phases(id) on delete set null,
  lesson_code text,
  title text not null,
  description text,
  lesson_type text not null default 'ground',
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists lesson_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  lesson_id uuid not null references training_lessons(id) on delete cascade,
  flightbook_id uuid references flightbooks(id) on delete set null,
  flightbook_section_id uuid references flightbook_sections(id) on delete set null,
  title text,
  required boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists document_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  lesson_id uuid references training_lessons(id) on delete set null,
  programme_id uuid references training_programmes(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  title text not null,
  due_at timestamptz,
  status text not null default 'assigned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists acknowledgements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  assignment_id uuid not null references document_assignments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  acknowledged_at timestamptz,
  acknowledgement_note text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, user_id)
);

create table if not exists training_signoffs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  lesson_id uuid references training_lessons(id) on delete set null,
  student_user_id uuid not null references auth.users(id) on delete cascade,
  instructor_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending',
  signoff_note text,
  signed_off_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists training_forms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  programme_id uuid references training_programmes(id) on delete set null,
  title text not null,
  description text,
  schema_json jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists training_form_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  form_id uuid not null references training_forms(id) on delete cascade,
  submitted_by uuid references auth.users(id) on delete set null,
  student_user_id uuid references auth.users(id) on delete set null,
  lesson_id uuid references training_lessons(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists training_programmes_org_idx
  on training_programmes (organization_id, created_at desc);

create index if not exists training_phases_programme_idx
  on training_phases (programme_id, sort_order);

create index if not exists training_lessons_programme_idx
  on training_lessons (programme_id, sort_order);

create index if not exists lesson_documents_lesson_idx
  on lesson_documents (lesson_id);

create index if not exists document_assignments_user_idx
  on document_assignments (user_id, status, due_at);

create index if not exists acknowledgements_user_idx
  on acknowledgements (user_id, status, acknowledged_at desc);

create index if not exists training_signoffs_student_idx
  on training_signoffs (student_user_id, status, signed_off_at desc);

create index if not exists training_form_submissions_form_idx
  on training_form_submissions (form_id, status, submitted_at desc);

alter table organization_branding enable row level security;
alter table onboarding_checklists enable row level security;
alter table training_programmes enable row level security;
alter table training_phases enable row level security;
alter table training_lessons enable row level security;
alter table lesson_documents enable row level security;
alter table document_assignments enable row level security;
alter table acknowledgements enable row level security;
alter table training_signoffs enable row level security;
alter table training_forms enable row level security;
alter table training_form_submissions enable row level security;
```

## 9.22 `supabase/migrations/schema/022_training_views.sql`

```sql
-- Dashboard summary views for flight-school training operations (Phase 3)

create or replace view v_training_assignment_status with (security_invoker = true) as
select
  da.organization_id,
  count(*) filter (where da.status = 'assigned') as assignments_open,
  count(*) filter (where a.status = 'acknowledged') as assignments_acknowledged,
  count(*) filter (where a.status = 'pending') as assignments_pending_ack
from document_assignments da
left join acknowledgements a
  on a.assignment_id = da.id
group by da.organization_id;

create or replace view v_training_signoff_status with (security_invoker = true) as
select
  organization_id,
  count(*) filter (where status = 'pending') as signoffs_pending,
  count(*) filter (where status = 'completed') as signoffs_completed
from training_signoffs
group by organization_id;

create or replace view v_programme_overview with (security_invoker = true) as
select
  p.organization_id,
  p.id as programme_id,
  p.name,
  count(distinct ph.id) as phase_count,
  count(distinct l.id) as lesson_count
from training_programmes p
left join training_phases ph on ph.programme_id = p.id
left join training_lessons l on l.programme_id = p.id
group by p.organization_id, p.id, p.name;
```

## 9.23 `supabase/migrations/schema/023_flightbook_library_upgrade.sql`

```sql
-- Flightbook library metadata and collaboration upgrade (Phase 5)

alter table if exists flightbooks
  add column if not exists aircraft text,
  add column if not exists manual_group text,
  add column if not exists effective_date date,
  add column if not exists import_notes text,
  add column if not exists tags text[] not null default '{}';

create table if not exists flightbook_section_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  flightbook_section_id uuid not null references flightbook_sections(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists flightbooks_manual_group_idx
  on flightbooks (organization_id, manual_group);

create index if not exists flightbooks_effective_date_idx
  on flightbooks (organization_id, effective_date desc);

create index if not exists flightbook_section_comments_section_idx
  on flightbook_section_comments (flightbook_section_id, created_at desc);

alter table flightbook_section_comments enable row level security;
```

## 9.24 `supabase/migrations/schema/024_flightbook_section_version_repair.sql`

```sql
-- Repair version history for flightbook sections.
-- Safe to run after the original version-history migration because all
-- statements are idempotent and only backfill sections that lack history.

create table if not exists flightbook_section_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  flightbook_section_id uuid not null references flightbook_sections(id) on delete cascade,
  body text not null,
  version_number int not null,
  change_source text not null,
  created_by uuid references auth.users (id) on delete set null,
  approval_id uuid references approvals(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists section_versions_unique
  on flightbook_section_versions (flightbook_section_id, version_number);

create index if not exists flightbook_section_versions_org_created_idx
  on flightbook_section_versions (organization_id, created_at desc);

alter table flightbook_section_versions enable row level security;

drop policy if exists "flightbook_section_versions select org" on flightbook_section_versions;
create policy "flightbook_section_versions select org" on flightbook_section_versions
  for select using (
    exists (
      select 1 from org_users ou
      where ou.organization_id = flightbook_section_versions.organization_id
        and ou.user_id = auth.uid()
    )
  );

create or replace function public.snapshot_flightbook_section_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_version int;
  latest_version_body text;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if old.body is not distinct from new.body then
    return new;
  end if;

  select fsv.body
    into latest_version_body
  from public.flightbook_section_versions fsv
  where fsv.flightbook_section_id = old.id
  order by fsv.version_number desc
  limit 1;

  if latest_version_body is not distinct from old.body then
    return new;
  end if;

  select coalesce(max(fsv.version_number), 0) + 1
    into next_version
  from public.flightbook_section_versions fsv
  where fsv.flightbook_section_id = old.id;

  insert into public.flightbook_section_versions (
    organization_id,
    flightbook_section_id,
    body,
    version_number,
    change_source,
    created_by
  )
  values (
    old.organization_id,
    old.id,
    old.body,
    next_version,
    'manual_edit',
    auth.uid()
  );

  return new;
end;
$$;

drop trigger if exists trg_snapshot_flightbook_section_version on public.flightbook_sections;
create trigger trg_snapshot_flightbook_section_version
  before update of body on public.flightbook_sections
  for each row
  execute procedure public.snapshot_flightbook_section_version();

insert into public.flightbook_section_versions (
  organization_id,
  flightbook_section_id,
  body,
  version_number,
  change_source,
  created_at
)
select
  fs.organization_id,
  fs.id,
  fs.body,
  1,
  'baseline',
  coalesce(fs.updated_at, fs.created_at, now())
from public.flightbook_sections fs
where not exists (
  select 1
  from public.flightbook_section_versions fsv
  where fsv.flightbook_section_id = fs.id
);
```

## 9.25 `supabase/migrations/schema/025_user_profiles_org_admin_upgrades.sql`

```sql
-- User profile, school profile, billing, and role-management upgrades

do $$
begin
  if exists (select 1 from pg_type where typname = 'app_role') then
    if not exists (
      select 1 from pg_enum
      where enumtypid = 'app_role'::regtype
        and enumlabel = 'instructor'
    ) then
      alter type app_role add value 'instructor';
    end if;

    if not exists (
      select 1 from pg_enum
      where enumtypid = 'app_role'::regtype
        and enumlabel = 'student'
    ) then
      alter type app_role add value 'student';
    end if;
  end if;
end $$;

alter table if exists user_profiles
  add column if not exists personal_notes text,
  add column if not exists phone text;

create table if not exists organization_branding (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references organizations(id) on delete cascade,
  public_name text,
  logo_url text,
  primary_color text,
  secondary_color text,
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table organization_branding
  add column if not exists legal_name text,
  add column if not exists website_url text,
  add column if not exists school_code text,
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists city text,
  add column if not exists region text,
  add column if not exists postal_code text,
  add column if not exists country text,
  add column if not exists billing_contact_name text,
  add column if not exists billing_email text,
  add column if not exists billing_phone text,
  add column if not exists billing_address text,
  add column if not exists vat_number text,
  add column if not exists billing_notes text;

alter table organization_branding enable row level security;

drop policy if exists "organization_branding read own" on organization_branding;
create policy "organization_branding read own" on organization_branding
  for select
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = organization_branding.organization_id
        and org_users.user_id = auth.uid()
    )
  );

drop policy if exists "organization_branding manage by admin" on organization_branding;
create policy "organization_branding manage by admin" on organization_branding
  for all
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = organization_branding.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from org_users
      where org_users.organization_id = organization_branding.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role = 'admin'
    )
  );
```

## 9.26 `supabase/migrations/schema/026_stripe_billing.sql`

```sql
-- Stripe subscription state, billing lock, and trial support

create table if not exists organization_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references organizations(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  subscription_status text not null default 'inactive',
  billing_state text not null default 'inactive',
  cancel_at_period_end boolean not null default false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  access_expires_at timestamptz,
  locked_at timestamptz,
  suspension_reason text,
  last_invoice_id text,
  last_invoice_status text,
  upcoming_invoice_at timestamptz,
  reminder_sent_at timestamptz,
  suspension_notice_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_subscriptions_billing_state_check check (
    billing_state in ('inactive', 'trialing', 'active', 'cancel_scheduled', 'suspended', 'canceled')
  )
);

create index if not exists organization_subscriptions_org_state_idx
  on organization_subscriptions (organization_id, billing_state);

alter table organization_subscriptions enable row level security;

drop policy if exists "organization_subscriptions read own" on organization_subscriptions;
create policy "organization_subscriptions read own" on organization_subscriptions
  for select
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = organization_subscriptions.organization_id
        and org_users.user_id = auth.uid()
    )
  );

drop policy if exists "organization_subscriptions manage by admin" on organization_subscriptions;
create policy "organization_subscriptions manage by admin" on organization_subscriptions
  for all
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = organization_subscriptions.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from org_users
      where org_users.organization_id = organization_subscriptions.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role = 'admin'
    )
  );
```

## 9.27 `supabase/migrations/triggers/001_audit_flightbook.sql`

```sql
-- Audit trail for flight book section body changes (MASTER_BUILD Phase 0)

create or replace function public.audit_flightbook_section_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if tg_op = 'UPDATE' and old.body is distinct from new.body then
    insert into audit_log (organization_id, actor_id, action, entity_type, entity_id, payload)
    values (
      old.organization_id,
      uid,
      'edit',
      'flightbook_section',
      old.id,
      jsonb_build_object(
        'section_number', old.section_number,
        'before_preview', left(old.body, 4000),
        'after_preview', left(new.body, 4000)
      )
    );
  elsif tg_op = 'DELETE' then
    insert into audit_log (organization_id, actor_id, action, entity_type, entity_id, payload)
    values (
      old.organization_id,
      uid,
      'edit',
      'flightbook_section',
      old.id,
      jsonb_build_object(
        'section_number', old.section_number,
        'deleted', true
      )
    );
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_audit_flightbook_section on flightbook_sections;
create trigger trg_audit_flightbook_section
  after update of body or delete on flightbook_sections
  for each row
  execute procedure public.audit_flightbook_section_change();
```

## 9.28 `supabase/migrations/rls/002_extended_rls.sql`

```sql
-- Extended RLS for MASTER_BUILD schema (Phase 0)
-- Run after schema/003–008

-- ─── Helpers ───────────────────────────────────────────────────────────────
create or replace function public.user_is_org_admin(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from org_users ou
    where ou.organization_id = p_org
      and ou.user_id = auth.uid()
      and ou.role = 'admin'
  );
$$;

create or replace function public.user_is_org_editor_or_admin(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from org_users ou
    where ou.organization_id = p_org
      and ou.user_id = auth.uid()
      and ou.role in ('admin', 'editor')
  );
$$;

grant execute on function public.user_is_org_admin(uuid) to authenticated;
grant execute on function public.user_is_org_editor_or_admin(uuid) to authenticated;

-- ─── Flight books ──────────────────────────────────────────────────────────
create policy "flightbooks select org" on flightbooks
  for select using (
    exists (
      select 1 from org_users ou
      where ou.organization_id = flightbooks.organization_id
        and ou.user_id = auth.uid()
    )
  );

create policy "flightbooks insert admin" on flightbooks
  for insert with check (public.user_is_org_admin(organization_id));

create policy "flightbooks update admin" on flightbooks
  for update using (public.user_is_org_admin(organization_id))
  with check (public.user_is_org_admin(organization_id));

create policy "flightbooks delete admin" on flightbooks
  for delete using (public.user_is_org_admin(organization_id));

create policy "flightbook_sections select org" on flightbook_sections
  for select using (
    exists (
      select 1 from org_users ou
      where ou.organization_id = flightbook_sections.organization_id
        and ou.user_id = auth.uid()
    )
  );

create policy "flightbook_sections insert admin" on flightbook_sections
  for insert with check (public.user_is_org_admin(organization_id));

create policy "flightbook_sections update editor" on flightbook_sections
  for update using (public.user_is_org_editor_or_admin(organization_id))
  with check (public.user_is_org_editor_or_admin(organization_id));

create policy "flightbook_sections delete admin" on flightbook_sections
  for delete using (public.user_is_org_admin(organization_id));

create policy "flightbook_mappings select org" on flightbook_mappings
  for select using (
    exists (
      select 1 from org_users ou
      where ou.organization_id = flightbook_mappings.organization_id
        and ou.user_id = auth.uid()
    )
  );

create policy "flightbook_mappings write admin" on flightbook_mappings
  for all using (public.user_is_org_admin(organization_id))
  with check (public.user_is_org_admin(organization_id));

-- ─── Regulation documents & snapshots ─────────────────────────────────────
create policy "reg_documents select" on reg_documents
  for select using (
    organization_id is null
    or exists (
      select 1 from org_users ou
      where ou.organization_id = reg_documents.organization_id
        and ou.user_id = auth.uid()
    )
  );

create policy "reg_documents write admin" on reg_documents
  for all using (
    organization_id is not null
    and public.user_is_org_admin(organization_id)
  )
  with check (
    organization_id is not null
    and public.user_is_org_admin(organization_id)
  );

create policy "source_snapshots select" on source_snapshots
  for select using (
    exists (
      select 1 from sources s
      where s.id = source_snapshots.source_id
        and (
          s.organization_id is null
          or exists (
            select 1 from org_users ou
            where ou.organization_id = s.organization_id
              and ou.user_id = auth.uid()
          )
        )
    )
  );

create policy "document_sections select" on document_sections
  for select using (
    (
      organization_id is not null
      and exists (
        select 1 from org_users ou
        where ou.organization_id = document_sections.organization_id
          and ou.user_id = auth.uid()
      )
    )
    or exists (
      select 1 from source_snapshots ss
      join sources s on s.id = ss.source_id
      where ss.id = document_sections.snapshot_id
        and (
          s.organization_id is null
          or exists (
            select 1 from org_users ou
            where ou.organization_id = s.organization_id
              and ou.user_id = auth.uid()
          )
        )
    )
  );

create policy "reg_changes select org" on reg_changes
  for select using (
    exists (
      select 1 from org_users ou
      where ou.organization_id = reg_changes.organization_id
        and ou.user_id = auth.uid()
    )
  );

-- ─── Proposed updates & approvals ─────────────────────────────────────────
create policy "proposed_updates select org" on proposed_updates
  for select using (
    exists (
      select 1 from org_users ou
      where ou.organization_id = proposed_updates.organization_id
        and ou.user_id = auth.uid()
    )
  );

create policy "proposed_updates update admin" on proposed_updates
  for update using (public.user_is_org_admin(organization_id))
  with check (public.user_is_org_admin(organization_id));

create policy "approvals select org" on approvals
  for select using (
    exists (
      select 1 from org_users ou
      where ou.organization_id = approvals.organization_id
        and ou.user_id = auth.uid()
    )
  );

create policy "approvals insert admin" on approvals
  for insert with check (public.user_is_org_admin(organization_id));

-- ─── Profiles & notes ──────────────────────────────────────────────────────
create policy "user_profiles select own" on user_profiles
  for select using (id = auth.uid());

create policy "user_profiles insert own" on user_profiles
  for insert with check (id = auth.uid());

create policy "user_profiles update own" on user_profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

create policy "update_notes select org" on update_notes
  for select using (
    exists (
      select 1 from org_users ou
      where ou.organization_id = update_notes.organization_id
        and ou.user_id = auth.uid()
    )
  );

create policy "update_notes insert org" on update_notes
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from org_users ou
      where ou.organization_id = update_notes.organization_id
        and ou.user_id = auth.uid()
    )
  );

-- ─── Versions, audit, notifications, pipeline ────────────────────────────────
create policy "flightbook_section_versions select org" on flightbook_section_versions
  for select using (
    exists (
      select 1 from org_users ou
      where ou.organization_id = flightbook_section_versions.organization_id
        and ou.user_id = auth.uid()
    )
  );

create policy "audit_log select org admin" on audit_log
  for select using (
    organization_id is not null
    and public.user_is_org_admin(organization_id)
  );

create policy "notifications select own" on notifications
  for select using (user_id = auth.uid());

create policy "notifications update own" on notifications
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "pipeline_runs select org" on pipeline_runs
  for select using (
    organization_id is not null
    and exists (
      select 1 from org_users ou
      where ou.organization_id = pipeline_runs.organization_id
        and ou.user_id = auth.uid()
    )
  );

-- ─── Sources (org admin can manage org-scoped sources) ─────────────────────
create policy "sources insert org admin" on sources
  for insert with check (
    organization_id is not null
    and public.user_is_org_admin(organization_id)
  );

create policy "sources update org admin" on sources
  for update using (
    organization_id is not null
    and public.user_is_org_admin(organization_id)
  )
  with check (
    organization_id is not null
    and public.user_is_org_admin(organization_id)
  );

create policy "sources delete org admin" on sources
  for delete using (
    organization_id is not null
    and public.user_is_org_admin(organization_id)
  );
```

## 9.29 `supabase/migrations/rls/003_flightbook_exports.sql`

```sql
create policy "flightbook_exports select org" on flightbook_exports
  for select using (
    exists (
      select 1 from org_users ou
      where ou.organization_id = flightbook_exports.organization_id
        and ou.user_id = auth.uid()
    )
  );

create policy "flightbook_exports insert admin" on flightbook_exports
  for insert with check (public.user_is_org_admin(organization_id));

create policy "flightbook_exports update admin" on flightbook_exports
  for update using (public.user_is_org_admin(organization_id))
  with check (public.user_is_org_admin(organization_id));

create policy "flightbook_exports delete admin" on flightbook_exports
  for delete using (public.user_is_org_admin(organization_id));
```

## 9.30 `supabase/migrations/rls/004_training_school_ops.sql`

```sql
-- RLS for flight-school training and operations schema (Phase 3)

drop policy if exists "organization_branding read own" on organization_branding;
create policy "organization_branding read own" on organization_branding
  for select
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = organization_branding.organization_id
        and org_users.user_id = auth.uid()
    )
  );

drop policy if exists "organization_branding manage by admin" on organization_branding;
create policy "organization_branding manage by admin" on organization_branding
  for all
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = organization_branding.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'compliance_manager')
    )
  )
  with check (
    exists (
      select 1 from org_users
      where org_users.organization_id = organization_branding.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'compliance_manager')
    )
  );

drop policy if exists "onboarding_checklists read own" on onboarding_checklists;
create policy "onboarding_checklists read own" on onboarding_checklists
  for select
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = onboarding_checklists.organization_id
        and org_users.user_id = auth.uid()
    )
  );

drop policy if exists "onboarding_checklists manage by admin" on onboarding_checklists;
create policy "onboarding_checklists manage by admin" on onboarding_checklists
  for all
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = onboarding_checklists.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'compliance_manager')
    )
  )
  with check (
    exists (
      select 1 from org_users
      where org_users.organization_id = onboarding_checklists.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'compliance_manager')
    )
  );

drop policy if exists "training_programmes read own" on training_programmes;
create policy "training_programmes read own" on training_programmes
  for select
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = training_programmes.organization_id
        and org_users.user_id = auth.uid()
    )
  );

drop policy if exists "training_programmes manage by staff" on training_programmes;
create policy "training_programmes manage by staff" on training_programmes
  for all
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = training_programmes.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  )
  with check (
    exists (
      select 1 from org_users
      where org_users.organization_id = training_programmes.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  );

drop policy if exists "training_phases read own" on training_phases;
create policy "training_phases read own" on training_phases
  for select
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = training_phases.organization_id
        and org_users.user_id = auth.uid()
    )
  );

drop policy if exists "training_phases manage by staff" on training_phases;
create policy "training_phases manage by staff" on training_phases
  for all
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = training_phases.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  )
  with check (
    exists (
      select 1 from org_users
      where org_users.organization_id = training_phases.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  );

drop policy if exists "training_lessons read own" on training_lessons;
create policy "training_lessons read own" on training_lessons
  for select
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = training_lessons.organization_id
        and org_users.user_id = auth.uid()
    )
  );

drop policy if exists "training_lessons manage by staff" on training_lessons;
create policy "training_lessons manage by staff" on training_lessons
  for all
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = training_lessons.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  )
  with check (
    exists (
      select 1 from org_users
      where org_users.organization_id = training_lessons.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  );

drop policy if exists "lesson_documents read own" on lesson_documents;
create policy "lesson_documents read own" on lesson_documents
  for select
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = lesson_documents.organization_id
        and org_users.user_id = auth.uid()
    )
  );

drop policy if exists "lesson_documents manage by staff" on lesson_documents;
create policy "lesson_documents manage by staff" on lesson_documents
  for all
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = lesson_documents.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  )
  with check (
    exists (
      select 1 from org_users
      where org_users.organization_id = lesson_documents.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  );

drop policy if exists "document_assignments read own" on document_assignments;
create policy "document_assignments read own" on document_assignments
  for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from org_users
      where org_users.organization_id = document_assignments.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  );

drop policy if exists "document_assignments manage by staff" on document_assignments;
create policy "document_assignments manage by staff" on document_assignments
  for all
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = document_assignments.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  )
  with check (
    exists (
      select 1 from org_users
      where org_users.organization_id = document_assignments.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  );

drop policy if exists "acknowledgements read own" on acknowledgements;
create policy "acknowledgements read own" on acknowledgements
  for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from org_users
      where org_users.organization_id = acknowledgements.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  );

drop policy if exists "acknowledgements update own" on acknowledgements;
create policy "acknowledgements update own" on acknowledgements
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "acknowledgements insert by staff" on acknowledgements;
create policy "acknowledgements insert by staff" on acknowledgements
  for insert
  with check (
    exists (
      select 1 from org_users
      where org_users.organization_id = acknowledgements.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  );

drop policy if exists "training_signoffs read own" on training_signoffs;
create policy "training_signoffs read own" on training_signoffs
  for select
  using (
    student_user_id = auth.uid()
    or instructor_user_id = auth.uid()
    or exists (
      select 1 from org_users
      where org_users.organization_id = training_signoffs.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  );

drop policy if exists "training_signoffs manage by staff" on training_signoffs;
create policy "training_signoffs manage by staff" on training_signoffs
  for all
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = training_signoffs.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  )
  with check (
    exists (
      select 1 from org_users
      where org_users.organization_id = training_signoffs.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  );

drop policy if exists "training_forms read own" on training_forms;
create policy "training_forms read own" on training_forms
  for select
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = training_forms.organization_id
        and org_users.user_id = auth.uid()
    )
  );

drop policy if exists "training_forms manage by staff" on training_forms;
create policy "training_forms manage by staff" on training_forms
  for all
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = training_forms.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  )
  with check (
    exists (
      select 1 from org_users
      where org_users.organization_id = training_forms.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  );

drop policy if exists "training_form_submissions read own" on training_form_submissions;
create policy "training_form_submissions read own" on training_form_submissions
  for select
  using (
    submitted_by = auth.uid()
    or student_user_id = auth.uid()
    or exists (
      select 1 from org_users
      where org_users.organization_id = training_form_submissions.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  );

drop policy if exists "training_form_submissions manage own org" on training_form_submissions;
create policy "training_form_submissions manage own org" on training_form_submissions
  for all
  using (
    submitted_by = auth.uid()
    or exists (
      select 1 from org_users
      where org_users.organization_id = training_form_submissions.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  )
  with check (
    submitted_by = auth.uid()
    or exists (
      select 1 from org_users
      where org_users.organization_id = training_form_submissions.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  );
```

## 9.31 `supabase/migrations/rls/005_flightbook_library_upgrade.sql`

```sql
-- RLS for flightbook library metadata and comments (Phase 5)

drop policy if exists "flightbook_section_comments select org" on flightbook_section_comments;
create policy "flightbook_section_comments select org" on flightbook_section_comments
  for select using (
    exists (
      select 1 from org_users ou
      where ou.organization_id = flightbook_section_comments.organization_id
        and ou.user_id = auth.uid()
    )
  );

drop policy if exists "flightbook_section_comments insert org" on flightbook_section_comments;
create policy "flightbook_section_comments insert org" on flightbook_section_comments
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from org_users ou
      where ou.organization_id = flightbook_section_comments.organization_id
        and ou.user_id = auth.uid()
    )
  );

drop policy if exists "flightbook_section_comments update author or admin" on flightbook_section_comments;
create policy "flightbook_section_comments update author or admin" on flightbook_section_comments
  for update using (
    author_id = auth.uid()
    or public.user_is_org_admin(organization_id)
  )
  with check (
    author_id = auth.uid()
    or public.user_is_org_admin(organization_id)
  );

drop policy if exists "flightbook_section_comments delete author or admin" on flightbook_section_comments;
create policy "flightbook_section_comments delete author or admin" on flightbook_section_comments
  for delete using (
    author_id = auth.uid()
    or public.user_is_org_admin(organization_id)
  );
```

## 9.32 `supabase/migrations/storage/001_buckets.sql`

```sql
-- Storage buckets for snapshots, uploaded flight books, exports (MASTER_BUILD §7)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('snapshots', 'snapshots', false, 52428800, null),
  ('flightbooks', 'flightbooks', false, 104857600, null),
  ('exports', 'exports', false, 52428800, null)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit;

-- Path convention: {organization_id}/... for org-owned objects

create policy "snapshots read org"
on storage.objects for select
using (
  bucket_id = 'snapshots'
  and exists (
    select 1 from org_users ou
    where ou.user_id = auth.uid()
      and name like (ou.organization_id::text || '/%')
  )
);

create policy "snapshots write admin"
on storage.objects for insert
with check (
  bucket_id = 'snapshots'
  and exists (
    select 1 from org_users ou
    where ou.user_id = auth.uid()
      and ou.role = 'admin'
      and name like (ou.organization_id::text || '/%')
  )
);

create policy "flightbooks read org"
on storage.objects for select
using (
  bucket_id = 'flightbooks'
  and exists (
    select 1 from org_users ou
    where ou.user_id = auth.uid()
      and name like (ou.organization_id::text || '/%')
  )
);

create policy "flightbooks write admin"
on storage.objects for insert
with check (
  bucket_id = 'flightbooks'
  and exists (
    select 1 from org_users ou
    where ou.user_id = auth.uid()
      and ou.role = 'admin'
      and name like (ou.organization_id::text || '/%')
  )
);

create policy "exports read org"
on storage.objects for select
using (
  bucket_id = 'exports'
  and exists (
    select 1 from org_users ou
    where ou.user_id = auth.uid()
      and name like (ou.organization_id::text || '/%')
  )
);

create policy "exports write service-like admin"
on storage.objects for insert
with check (
  bucket_id = 'exports'
  and exists (
    select 1 from org_users ou
    where ou.user_id = auth.uid()
      and ou.role = 'admin'
      and name like (ou.organization_id::text || '/%')
  )
);
```

## 9.33 `supabase/migrations/storage/002_easa_source_files.sql`

```sql
-- Dedicated storage for raw EASA regulation source files.
-- This bucket is intentionally scoped to upstream source artifacts only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'easa-source-files',
  'easa-source-files',
  false,
  104857600,
  array[
    'text/html',
    'application/xhtml+xml',
    'application/pdf',
    'text/plain',
    'application/xml',
    'text/xml'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "easa source files read org"
on storage.objects for select
using (
  bucket_id = 'easa-source-files'
  and exists (
    select 1 from org_users ou
    where ou.user_id = auth.uid()
      and name like (ou.organization_id::text || '/%')
  )
);

create policy "easa source files write admin"
on storage.objects for insert
with check (
  bucket_id = 'easa-source-files'
  and exists (
    select 1 from org_users ou
    where ou.user_id = auth.uid()
      and ou.role = 'admin'
      and name like (ou.organization_id::text || '/%')
  )
);
```

## 9.34 `supabase/sql/seed/001_easa_sources.sql`

```sql
insert into organizations (id, name)
values ('00000000-0000-4000-8000-000000000001', 'Demo Flight School')
on conflict (id) do nothing;

-- Remove old dead URLs (EASA restructured their site)
delete from sources where url in (
  'https://www.easa.europa.eu/en/rss/news',
  'https://www.easa.europa.eu/en/rss/consultations',
  'https://www.easa.europa.eu/en/rss/publications'
);

-- Insert current working EASA feeds
insert into sources (organization_id, url, type, active)
values
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/newsroom-and-events/news/feed.xml', 'rss', true),
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/newsroom-and-events/press-releases/feed.xml', 'rss', true),
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/document-library/notices-of-proposed-amendment/feed.xml', 'rss', true),
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/document-library/opinions/feed.xml', 'rss', true),
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/document-library/easy-access-rules/feed.xml', 'rss', true),
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/document-library/acceptable-means-of-compliance-and-guidance-material/feed.xml', 'rss', true)
on conflict (url) do nothing;
```

## 9.35 `supabase/sql/seed/002_html_sources.sql`

```sql
-- HTML regulation landing pages for pipeline (MASTER_BUILD §8 seed 002)
-- Uses demo org from 001_easa_sources.sql

insert into sources (organization_id, url, type, active)
values
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/document-library/regulations/easy-access-rules/easy-access-rules-aircrew-regulation-eu-no-11782011-part-fcl', 'html', true),
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/document-library/regulations/easy-access-rules/easy-access-rules-aircrew-regulation-eu-no-11782011-part-med', 'html', true),
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/document-library/regulations/easy-access-rules/easy-access-rules-part-ora', 'html', true),
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/document-library/regulations/easy-access-rules/easy-access-rules-part-dto', 'html', true),
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/document-library/regulations/easy-access-rules/easy-access-rules-part-oro', 'html', true),
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/document-library/regulations/easy-access-rules/easy-access-rules-part-cat', 'html', true),
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/document-library/regulations/easy-access-rules/easy-access-rules-part-ncc', 'html', true),
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/document-library/regulations/easy-access-rules/easy-access-rules-part-nco', 'html', true),
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/document-library/regulations/easy-access-rules/easy-access-rules-part-spa', 'html', true),
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/document-library/certification-specifications/cs-fstda-aeroplanes-issue-2-amendment-1', 'html', true),
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/document-library/certification-specifications/cs-ftl1-issue-1-amendment-1', 'html', true)
on conflict (url) do nothing;
```

## 9.36 `supabase/sql/seed/003_flightbook_mappings.sql`

```sql
-- Link flight book sections to EASA refs after sections exist (MASTER_BUILD §8)
-- Safe to re-run: skips when section numbers are missing

insert into flightbook_mappings (
  organization_id,
  flightbook_section_id,
  easa_section_ref,
  confidence,
  match_type
)
select
  fs.organization_id,
  fs.id,
  m.easa_ref,
  m.confidence,
  m.match_type
from flightbook_sections fs
join (
  values
    ('010.01', 'Part-FCL + ICAO Annex 2 / SERA', 'high', 'manual'),
    ('010.04.02', 'Part-FCL Reg (EU) 1178/2011 Annex I', 'high', 'manual'),
    ('010.04.03', 'Part-MED Reg (EU) 1178/2011 Annex IV', 'high', 'manual'),
    ('010.06', 'Part-CAT, Part-NCC, Part-NCO', 'medium', 'manual')
) as m(section_number, easa_ref, confidence, match_type)
  on m.section_number = fs.section_number
where fs.organization_id = '00000000-0000-4000-8000-000000000001'
  and not exists (
    select 1 from flightbook_mappings fm
    where fm.flightbook_section_id = fs.id
      and fm.easa_section_ref = m.easa_ref
  );
```

## 10. Storage checks after SQL

After running storage SQL, confirm these buckets exist:

1. `snapshots`
2. `flightbooks`
3. `exports`
4. `easa-source-files`

## 11. Deploy Supabase Edge Functions

Functions in repo:

1. `rss-ingest`
2. `regulation-ingest`
3. `ai-analyze`
4. `apply-update`
5. `rollback`
6. `notifications`

Minimum required for pipeline:

1. `rss-ingest`
2. `regulation-ingest`
3. `ai-analyze`

Recommended:

- deploy all 6

CLI example:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... OPENAI_API_KEY=... OPENAI_EMBEDDING_MODEL=text-embedding-3-small
supabase functions deploy rss-ingest
supabase functions deploy regulation-ingest
supabase functions deploy ai-analyze
supabase functions deploy apply-update
supabase functions deploy rollback
supabase functions deploy notifications
```

## 12. Deploy to Vercel

1. Import repo into Vercel.
2. Let Vercel detect Next.js.
3. Add environment variables.
4. Deploy.
5. Set `NEXT_PUBLIC_APP_URL` to the real production URL.
6. Add the production URL into Supabase Auth config.

## 13. Scheduler setup still needed

This is manual.

Current routes:

- `/api/cron/run-scheduled`
- `/api/cron/send-digest`

They require:

- `SCHEDULED_PIPELINE_SECRET`
- request header `Authorization: Bearer YOUR_SECRET`

Still needed:

1. Pick a scheduler:
   - Vercel cron
   - Supabase scheduled jobs
   - external cron service
2. Configure scheduler to call `/api/cron/run-scheduled`
3. Configure scheduler to call `/api/cron/send-digest` if you want digest emails

## 14. Stripe setup if billing is enabled

Manual steps:

1. Create recurring Stripe product.
2. Create recurring Stripe price.
3. Put price ID into `STRIPE_PRICE_ID`.
4. Add `STRIPE_SECRET_KEY`.
5. Enable Stripe customer portal.
6. Create webhook endpoint:
   - local: `http://localhost:3000/api/stripe/webhook`
   - prod: `https://YOUR-DOMAIN/api/stripe/webhook`
7. Subscribe webhook events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.upcoming`
   - `invoice.payment_failed`
   - `invoice.paid`
8. Put webhook secret into `STRIPE_WEBHOOK_SECRET`

## 15. One-off scripts you may still need

## 15.1 Create first admin user

```bash
node scripts/create-admin-user.mjs
```

Optional env vars before running:

```env
ADMIN_EMAIL=
ADMIN_PASSWORD=
ORG_NAME=
```

## 15.2 Import sample manuals

```bash
node scripts/import-flightbooks.mjs
```

Or:

```bash
node scripts/import-flightbooks.mjs data/fixtures/flightbooks/sample-import.json
```

## 15.3 Backfill embeddings

```bash
node scripts/backfill-embeddings.mjs
```

Needed env vars:

```env
ORG_ID=
OPENAI_API_KEY=
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

## 16. In-app setup after deploy

After you can log in:

1. Go to `Settings -> Setup`
2. Confirm organization exists
3. Confirm your user is linked to the organization
4. Add or restore EASA sources
5. Save AI settings
6. Save schedule
7. Upload at least one real manual
8. Create first training programme
9. Create first assignment

## 17. Final beginner checklist

You are done when all of these are true:

1. Local app starts
2. Supabase project exists
3. All SQL in this file has run in order
4. Storage buckets exist
5. Edge Functions are deployed
6. Vercel app is deployed
7. Admin user can log in
8. EASA sources exist
9. A real or sample manual exists
10. Embeddings exist where needed
11. Optional scheduler works
12. Optional Stripe webhook works

## 18. Bottom line

For a novice coder, the remaining work is not big new app coding.

The real remaining work is:

- configuration
- SQL
- deployment
- secrets
- first-run data
- optional billing/scheduler/email integrations

## 19. Live database cleanup plan

This section is for your current live Supabase project.

It is based on the live schema check against project `vdiaiuvliahockwmqcti`.

Good news:

- the major app tables already exist
- training tables already exist
- flightbook tables already exist
- pipeline tables already exist
- the main missing billing/profile fields now appear fixed

What is still different from the repo:

1. `org_users` has no `id` column
2. `ai_provider_config` has no `id` column
3. `permissions` uses `action` instead of `code`
4. `role_permissions` uses `permission_id` instead of `permission_code`

These are mostly repo-parity issues, not emergency breakages.

## 19.1 Safe run order

Run these cleanup blocks in this exact order:

1. `org_users` parity block
2. `ai_provider_config` parity block
3. `permissions` and `role_permissions` parity block
4. verification queries

Important:

- these are additive fixes
- they should not remove current data
- they should not rerun risky early migrations
- they should not touch `org_users.role`

## 19.2 SQL block 1: `org_users` parity

This adds the missing repo-style `id` column safely.

```sql
begin;

create extension if not exists pgcrypto;

alter table if exists org_users
  add column if not exists id uuid;

update org_users
set id = gen_random_uuid()
where id is null;

alter table org_users
  alter column id set default gen_random_uuid();

create unique index if not exists org_users_id_unique
  on org_users (id);

commit;
```

## 19.3 SQL block 2: `ai_provider_config` parity

This adds the missing repo-style `id` column and confirms per-org uniqueness.

```sql
begin;

create extension if not exists pgcrypto;

alter table if exists ai_provider_config
  add column if not exists id uuid;

update ai_provider_config
set id = gen_random_uuid()
where id is null;

alter table ai_provider_config
  alter column id set default gen_random_uuid();

create unique index if not exists ai_provider_config_id_unique
  on ai_provider_config (id);

create unique index if not exists ai_provider_config_org_unique
  on ai_provider_config (organization_id);

commit;
```

## 19.4 SQL block 3: `permissions` and `role_permissions` parity

This keeps your old columns and adds the repo-style ones.

That means:

- keep `permissions.action`
- add `permissions.code`
- keep `role_permissions.permission_id`
- add `role_permissions.permission_code`
- add `role_permissions.id`

```sql
begin;

create extension if not exists pgcrypto;

alter table if exists permissions
  add column if not exists code text;

update permissions
set code = action
where code is null
  and action is not null;

create unique index if not exists permissions_code_unique
  on permissions (code);

alter table if exists role_permissions
  add column if not exists id uuid,
  add column if not exists permission_code text;

update role_permissions
set id = gen_random_uuid()
where id is null;

alter table role_permissions
  alter column id set default gen_random_uuid();

update role_permissions rp
set permission_code = p.code
from permissions p
where rp.permission_code is null
  and rp.permission_id = p.id;

create unique index if not exists role_permissions_id_unique
  on role_permissions (id);

create unique index if not exists role_permissions_role_permission_code_unique
  on role_permissions (role, permission_code);

commit;
```

## 19.5 Verification queries

Run these after the three cleanup blocks.

### Verify `org_users.id`

```sql
select column_name, data_type, udt_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'org_users'
  and column_name = 'id';
```

### Verify `ai_provider_config.id`

```sql
select column_name, data_type, udt_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'ai_provider_config'
  and column_name = 'id';
```

### Verify `permissions.code`

```sql
select id, action, code, description
from permissions
limit 20;
```

### Verify `role_permissions.permission_code`

```sql
select id, role, permission_id, permission_code
from role_permissions
limit 20;
```

### Verify no null backfill values remain

```sql
select
  (select count(*) from org_users where id is null) as org_users_missing_id,
  (select count(*) from ai_provider_config where id is null) as ai_provider_config_missing_id,
  (select count(*) from permissions where code is null) as permissions_missing_code,
  (select count(*) from role_permissions where id is null) as role_permissions_missing_id,
  (select count(*) from role_permissions where permission_code is null) as role_permissions_missing_code;
```

## 19.6 What not to do

Do not do these:

1. Do not rerun `002_roles_permissions.sql`
2. Do not try to alter `org_users.role` again
3. Do not drop old columns like `permissions.action` or `role_permissions.permission_id`
4. Do not rebuild `org_users` from scratch

## 19.7 Final recommendation

For your live DB, the safest path is:

1. leave old columns in place
2. add missing compatibility columns
3. backfill them
4. verify

That gives you much better parity with the repo without risking the current working app.
