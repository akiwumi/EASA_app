# Supabase SQL Guide For Beginners

This guide is for getting the EASA app working without needing to understand every table in the database.

If the old guide felt overwhelming, use this rule:

- Open the app and start in `Settings -> Setup`.
- Do the **Quick Start** first.
- Ignore the **Advanced / Optional** sections unless you truly need them.

## What This Guide Is For

Use this guide when you want to:

- set up the demo organization
- add the default EASA feeds
- connect your login user to the app
- save your AI provider settings
- check why the app looks empty

The app now includes a live beginner checklist in:

- `Settings -> Setup`

Use that screen first. It tells you which steps are already complete in your own Supabase project.

This guide is **not** for:

- creating a Supabase Auth user with SQL
- fixing every possible auth problem
- understanding every RAG or embedding feature on day one

## Before You Start

Open your Supabase project, then:

1. Go to `SQL Editor`
2. Click `New query`
3. Paste **one block at a time**
4. Run it
5. Read the result before moving on

## Very Important: SQL Users vs Auth Users

This app uses two different things:

- **Supabase Auth users**: the people who log in
- **Database rows**: app data such as organizations, feeds, and settings

You **cannot** create an email/password login user in the SQL editor.

To create a real login user, use one of these instead:

- Supabase dashboard -> `Authentication` -> `Users`
- the repo script `scripts/create-admin-user.mjs`

After the user exists, you **can** use SQL to connect that user to the app.

## Quick Start

If you are new, these are the only sections you usually need:

1. Log in to the app and open `Settings -> Setup`
2. Check that the tables exist
3. Create the demo organization if the setup page says it is missing
4. Add the default RSS feeds
5. Link your real login user to the organization
6. Save AI provider settings
7. Save the automation schedule from `Settings -> Automation`

If you do those steps, the app usually becomes usable.

---

## 1. Check That The App Tables Exist

Run this first:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'organizations',
    'org_users',
    'sources',
    'rss_items',
    'ai_findings',
    'reg_documents',
    'source_snapshots',
    'document_sections',
    'reg_changes',
    'flightbooks',
    'flightbook_sections',
    'proposed_updates',
    'ai_provider_config'
  )
order by table_name;
```

What success looks like:

- you see a list of table names

If you do **not** see the tables:

- stop here
- your database schema has probably not been set up yet

---

## 2. Create The Demo Organization

This app expects a demo organization ID in several places.

Only run this if `Settings -> Setup` says the organization is missing.

Run this:

```sql
insert into organizations (id, name)
values ('00000000-0000-4000-8000-000000000001', 'Demo Flight School')
on conflict (id) do update
set name = excluded.name;
```

Check it:

```sql
select *
from organizations
where id = '00000000-0000-4000-8000-000000000001';
```

What success looks like:

- you see one row for `Demo Flight School`

---

## 3. Add The Default EASA RSS Feeds

These are the feeds the dashboard and pipeline expect.

Easier option first:

- open `Settings -> Setup`
- click `Restore EASA defaults`

Only use the SQL below if you prefer to do it manually.

Run this:

```sql
delete from sources
where url in (
  'https://www.easa.europa.eu/en/rss/news',
  'https://www.easa.europa.eu/en/rss/consultations',
  'https://www.easa.europa.eu/en/rss/publications'
);

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

Check them:

```sql
select id, url, type, active
from sources
where organization_id = '00000000-0000-4000-8000-000000000001'
order by created_at;
```

What success looks like:

- you see multiple rows
- `type` should be `rss`
- `active` should be `true`

---

## 4. Connect Your Real Login User To The App

This step is the one most people miss.

Even if you can log in to Supabase Auth, the app may still look empty until your user is linked in `org_users`.

Tip:

- `Settings -> Setup` now shows your current Auth user UUID so you do not have to guess it.

### Step 4A: Create Or Find Your Auth User

In Supabase:

1. Open `Authentication`
2. Open `Users`
3. Find your user
4. Copy the user UUID

### Step 4B: Paste That UUID Into This SQL

Replace `PASTE_REAL_AUTH_USER_UUID_HERE` with your real user ID:

```sql
insert into org_users (organization_id, user_id, role)
select
  '00000000-0000-4000-8000-000000000001',
  'PASTE_REAL_AUTH_USER_UUID_HERE',
  'admin'
where not exists (
  select 1
  from org_users
  where organization_id = '00000000-0000-4000-8000-000000000001'
    and user_id = 'PASTE_REAL_AUTH_USER_UUID_HERE'
);
```

Check it:

```sql
select *
from org_users
where organization_id = '00000000-0000-4000-8000-000000000001';
```

What success looks like:

- you see your user linked to the demo organization
- the role is usually `admin`

---

## 5. Add Or Update AI Provider Settings

This enables the AI analysis flow.

Easier option first:

- open `Settings -> AI settings`
- save your provider, model, and API key there

Only use the SQL below if you want to do it manually.

Replace:

- `openai` if you use a different provider
- `gpt-4o` if you want a different model
- `PASTE_REAL_API_KEY_HERE` with your real API key

```sql
insert into ai_provider_config (
  organization_id,
  provider,
  model,
  api_key
)
values (
  '00000000-0000-4000-8000-000000000001',
  'openai',
  'gpt-4o',
  'PASTE_REAL_API_KEY_HERE'
)
on conflict (organization_id) do update
set
  provider = excluded.provider,
  model = excluded.model,
  api_key = excluded.api_key,
  updated_at = now();
```

Check it:

```sql
select organization_id, provider, model, updated_at
from ai_provider_config
where organization_id = '00000000-0000-4000-8000-000000000001';
```

What success looks like:

- one row exists for your organization
- the provider and model look correct

## At This Point, Stop And Test The App

Before doing anything more advanced:

1. log in to the app
2. open the dashboard
3. check whether feeds appear
4. check whether AI settings appear
5. open `Settings -> Automation` and save a schedule if one does not exist

If the app is now working, you probably do **not** need the advanced sections yet.

---

## Common Problems For Beginners

## Problem: "I can log in, but the app is empty"

Usually one of these is missing:

1. no row in `org_users` for your user
2. no active rows in `sources`
3. no row in `ai_provider_config`
4. no flightbooks uploaded yet
5. the pipeline has not been run yet

## Problem: "Login itself fails"

SQL usually will not fix this by itself.

Check:

1. `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
3. `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
4. whether the Supabase project is reachable
5. whether the auth user really exists in Supabase Auth

---

## Quick Health Check Queries

Use these if the app still looks empty and you want simple answers.

## Active sources

```sql
select type, active, count(*) as total
from sources
group by type, active
order by type, active desc;
```

What it tells you:

- whether you have feeds
- whether they are active

## RSS items

```sql
select count(*) as rss_item_count
from rss_items;
```

What it tells you:

- whether RSS ingestion has brought in anything

## AI findings

```sql
select count(*) as ai_finding_count
from ai_findings;
```

## Regulation changes

```sql
select count(*) as reg_change_count
from reg_changes;
```

## Proposed updates

```sql
select status, count(*) as total
from proposed_updates
group by status
order by status;
```

## Flightbooks

```sql
select id, name, doc_type, active, created_at
from flightbooks
order by created_at desc;
```

## Flightbook sections

```sql
select flightbook_id, count(*) as section_count
from flightbook_sections
group by flightbook_id
order by section_count desc;
```

## One big overview query

If you want one simple summary, run this:

```sql
select
  (select count(*) from organizations) as organizations,
  (select count(*) from org_users) as org_users,
  (select count(*) from sources where active = true) as active_sources,
  (select count(*) from rss_items) as rss_items,
  (select count(*) from ai_findings) as ai_findings,
  (select count(*) from reg_changes) as reg_changes,
  (select count(*) from flightbooks) as flightbooks,
  (select count(*) from flightbook_sections) as flightbook_sections,
  (select count(*) from proposed_updates) as proposed_updates;
```

What it tells you:

- whether the app has enough data to show useful screens

---

## Advanced / Optional Setup

Only use the rest of this guide if you specifically need:

- HTML regulation pages in `sources`
- RAG / embedding support
- vector search functions
- embedding backfill
- demo data cleanup

If those terms are unfamiliar, it is safe to stop here.

---

## 6. Add HTML Source Pages For The Full-Text Regulation Pipeline

These are optional.

Use them only if you want the app to store and search regulation page content, not just RSS summaries.

```sql
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
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/document-library/regulations/easy-access-rules/easy-access-rules-part-spa', 'html', true)
on conflict (url) do nothing;
```

Check them:

```sql
select id, url, type, active
from sources
where organization_id = '00000000-0000-4000-8000-000000000001'
  and type = 'html'
order by created_at;
```

---

## 7. Add The RAG Columns

Only do this if you are working on embeddings or retrieval.

```sql
create extension if not exists vector;

alter table if exists document_sections
  add column if not exists embedding vector(1536),
  add column if not exists token_count int,
  add column if not exists chunk_hash text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table if exists flightbook_sections
  add column if not exists embedding vector(1536),
  add column if not exists token_count int,
  add column if not exists chunk_hash text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table if exists proposed_updates
  add column if not exists retrieval_context jsonb,
  add column if not exists generation_prompt_version text,
  add column if not exists source_citations jsonb,
  add column if not exists retrieved_at timestamptz;
```

Optional but recommended:

```sql
create index if not exists document_sections_chunk_hash_idx
  on document_sections (chunk_hash);

create index if not exists flightbook_sections_chunk_hash_idx
  on flightbook_sections (chunk_hash);

create index if not exists document_sections_metadata_gin_idx
  on document_sections using gin (metadata);

create index if not exists flightbook_sections_metadata_gin_idx
  on flightbook_sections using gin (metadata);

create index if not exists proposed_updates_source_citations_gin_idx
  on proposed_updates using gin (source_citations);
```

Check the columns:

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('document_sections', 'flightbook_sections', 'proposed_updates')
order by table_name, ordinal_position;
```

---

## 8. Add The RAG Search Functions

These functions let the app search for similar regulation chunks and similar flightbook sections.

```sql
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

Check that they exist:

```sql
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('match_document_sections', 'match_flightbook_sections')
order by routine_name;
```

---

## 9. Check Or Backfill Embeddings

If you uploaded flightbooks before adding the embedding fields, older rows may still have `embedding = null`.

Check missing flightbook embeddings:

```sql
select count(*) as flightbook_sections_missing_embeddings
from flightbook_sections
where embedding is null;
```

Check missing document embeddings:

```sql
select count(*) as document_sections_missing_embeddings
from document_sections
where embedding is null;
```

Check chunk metadata:

```sql
select id, section_number, title, token_count, left(chunk_hash, 12) as chunk_hash_short, metadata
from flightbook_sections
order by created_at desc
limit 20;
```

If you need to backfill from the terminal:

```bash
set -a
source .env.local
set +a
export OPENAI_API_KEY="PASTE_REAL_OPENAI_API_KEY_HERE"
node scripts/backfill-embeddings.mjs
```

---

## 10. Useful Debug Queries

### Proposed updates with RAG evidence

```sql
select
  id,
  status,
  generation_prompt_version,
  retrieved_at,
  jsonb_array_length(coalesce(source_citations, '[]'::jsonb)) as citation_count
from proposed_updates
order by updated_at desc
limit 20;
```

### Document sections

```sql
select count(*) as document_section_count
from document_sections;
```

### Embedding coverage summary

```sql
select
  (select count(*) from flightbook_sections where embedding is not null) as flightbook_sections_with_embeddings,
  (select count(*) from flightbook_sections where embedding is null) as flightbook_sections_without_embeddings,
  (select count(*) from document_sections where embedding is not null) as document_sections_with_embeddings,
  (select count(*) from document_sections where embedding is null) as document_sections_without_embeddings;
```

### Dashboard debug query

```sql
select
  s.id,
  s.type,
  s.active,
  s.url,
  count(ri.id) as rss_items_seen
from sources s
left join rss_items ri on ri.source_id = s.id
where s.organization_id = '00000000-0000-4000-8000-000000000001'
group by s.id, s.type, s.active, s.url
order by s.created_at;
```

---

## 11. Safe Cleanup For Demo Data

Only run this if you truly want to clear the demo organization's pipeline data.

```sql
delete from proposed_updates
where organization_id = '00000000-0000-4000-8000-000000000001';

delete from reg_changes
where organization_id = '00000000-0000-4000-8000-000000000001';

delete from ai_findings
where organization_id = '00000000-0000-4000-8000-000000000001';

delete from rss_items
where organization_id = '00000000-0000-4000-8000-000000000001';

delete from sources
where organization_id = '00000000-0000-4000-8000-000000000001';
```

## Final Advice

If you are unsure what to run, do this:

1. Run sections `1` to `5`
2. Stop
3. Test the app
4. Only come back for sections `6+` if you know you need advanced features

That will save you a lot of confusion.
