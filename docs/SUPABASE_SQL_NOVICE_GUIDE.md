# Supabase SQL Guide For This App

This file gives you copy-pasteable SQL for the EASA app.

Use it in the Supabase dashboard:

1. Open your Supabase project.
2. Go to `SQL Editor`.
3. Paste one section at a time.
4. Run it.
5. Check the result before moving to the next section.

## Important First Note

This app uses both:

- Supabase Auth users
- normal database tables like `organizations`, `sources`, `org_users`, and `ai_provider_config`

You **cannot create an email/password auth user with plain SQL** in the SQL editor.

For auth users, use one of these:

- Supabase dashboard → `Authentication` → `Users`
- the repo script `scripts/create-admin-user.mjs`

After the auth user exists, you can use SQL to connect that user to an organization.

## 1. Check That Core Tables Exist

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

You should see a list of app tables.

## 2. Create The Demo Organization

This app already expects a demo organization ID in several places.

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

## 3. Add The EASA RSS Feeds

These are the feeds the dashboard and pipeline expect.

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

## 4. Add HTML Source Pages For Future RAG / Full-Text Pipeline

These are useful if you want more than RSS summaries later.

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

## 5. Connect A Real Auth User To The Demo Organization

First, create the user in Supabase Auth.

Then get the user ID from:

- Supabase dashboard → `Authentication` → `Users`

Copy the user UUID and paste it below.

```sql
insert into org_users (organization_id, user_id, role)
values (
  '00000000-0000-4000-8000-000000000001',
  'PASTE_REAL_AUTH_USER_UUID_HERE',
  'admin'
)
on conflict do nothing;
```

Check it:

```sql
select *
from org_users
where organization_id = '00000000-0000-4000-8000-000000000001';
```

## 6. Add Or Update AI Provider Settings

This enables the admin settings page and the AI analysis flow.

Replace:

- `openai` with your provider if needed
- `gpt-4o` with your model if needed
- `PASTE_REAL_API_KEY_HERE` with your actual key

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

## 7. Add The New RAG Columns

These columns let the app store embeddings and retrieval evidence.

```sql
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

alter table if exists proposed_updates
  add column if not exists retrieval_context jsonb,
  add column if not exists generation_prompt_version text,
  add column if not exists source_citations jsonb,
  add column if not exists retrieved_at timestamptz;
```

Optional but recommended indexes:

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

Check the new columns:

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('document_sections', 'flightbook_sections', 'proposed_updates')
order by table_name, ordinal_position;
```

## 8. Add The RAG Search Functions

These functions are what the app calls to retrieve similar regulation chunks and similar flightbook sections.

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

Check that the functions exist:

```sql
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('match_document_sections', 'match_flightbook_sections')
order by routine_name;
```

## 9. Backfill Or Check Embeddings

If you already uploaded flightbooks before adding the new RAG columns, those older rows may have `embedding = null`.

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

If you want to backfill embeddings from the terminal, use the repo script:

```bash
set -a
source .env.local
set +a
export OPENAI_API_KEY="PASTE_REAL_OPENAI_API_KEY_HERE"
node scripts/backfill-embeddings.mjs
```

## 10. Quick Health Check Queries

Use these when the UI looks empty and you want to know where the pipeline stopped.

### Sources

```sql
select type, active, count(*) as total
from sources
group by type, active
order by type, active desc;
```

### RSS items

```sql
select count(*) as rss_item_count
from rss_items;
```

### AI findings

```sql
select count(*) as ai_finding_count
from ai_findings;
```

### Regulation changes

```sql
select count(*) as reg_change_count
from reg_changes;
```

### Proposed updates

```sql
select status, count(*) as total
from proposed_updates
group by status
order by status;
```

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

### Flightbooks

```sql
select id, name, doc_type, active, created_at
from flightbooks
order by created_at desc;
```

### Flightbook sections

```sql
select flightbook_id, count(*) as section_count
from flightbook_sections
group by flightbook_id
order by section_count desc;
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

## 11. Check Whether The App Has Enough Data To Show Useful Screens

This query gives a simple overview:

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

## 12. Useful Debug Query For The Dashboard

This helps explain why the dashboard might look empty.

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

## 13. If Login Works But The App Still Looks Empty

Usually one of these is missing:

1. No row in `org_users` for the current auth user.
2. No active `sources`.
3. No `ai_provider_config`.
4. No uploaded `flightbooks` and `flightbook_sections`.
5. No RSS pipeline run yet.

## 14. If Login Fails Entirely

SQL can help with app data, but not with all auth/network problems.

Check these too:

1. `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
3. `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
4. whether the Supabase project URL is valid and reachable
5. whether your auth user actually exists in Supabase Auth

## 15. Safe Cleanup For Demo Data

If you want to reset only the demo organization data:

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

Do **not** run that unless you really want to clear the demo pipeline data.
