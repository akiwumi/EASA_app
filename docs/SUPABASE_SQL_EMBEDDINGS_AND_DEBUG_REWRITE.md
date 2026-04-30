## 9. Check Or Backfill Embeddings

This section replaces the existing guide from `Check Or Backfill Embeddings` onward.

Important:

- Paste `sql` blocks into the Supabase SQL editor.
- Run `bash` blocks in your terminal.
- Do not paste shell commands like `set -a`, `source`, `export`, or `node ...` into the SQL editor.

### 9.1 Preflight: check that the required tables exist

Run this first:

```sql
select
  to_regclass('public.organizations') as organizations,
  to_regclass('public.sources') as sources,
  to_regclass('public.flightbooks') as flightbooks,
  to_regclass('public.flightbook_sections') as flightbook_sections,
  to_regclass('public.reg_documents') as reg_documents,
  to_regclass('public.source_snapshots') as source_snapshots,
  to_regclass('public.document_sections') as document_sections,
  to_regclass('public.reg_changes') as reg_changes,
  to_regclass('public.proposed_updates') as proposed_updates;
```

What you want:

- every value should be the table name, not `null`

If `reg_changes` or `proposed_updates` is `null`, do not run proposal debug queries yet. Your earlier schema migrations are still missing.

### 9.2 Preflight: check that the embedding columns exist

Run:

```sql
select
  table_name,
  column_name,
  data_type,
  udt_name
from information_schema.columns
where table_schema = 'public'
  and table_name in ('flightbook_sections', 'document_sections')
  and column_name in ('embedding', 'token_count', 'chunk_hash', 'metadata')
order by table_name, column_name;
```

What you want:

- `flightbook_sections.embedding`
- `flightbook_sections.token_count`
- `flightbook_sections.chunk_hash`
- `flightbook_sections.metadata`
- `document_sections.embedding`
- `document_sections.token_count`
- `document_sections.chunk_hash`
- `document_sections.metadata`

If some are missing, run the RAG schema additions:

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

### 9.3 Check missing flightbook embeddings

```sql
select count(*) as flightbook_sections_missing_embeddings
from flightbook_sections
where embedding is null;
```

### 9.4 Check missing document embeddings

```sql
select count(*) as document_sections_missing_embeddings
from document_sections
where embedding is null;
```

### 9.5 Check chunk metadata safely

Use this for flightbook chunks:

```sql
select
  id,
  section_number,
  title,
  token_count,
  left(chunk_hash, 12) as chunk_hash_short,
  metadata
from flightbook_sections
order by created_at desc
limit 20;
```

Use this for regulation chunks:

```sql
select
  id,
  section_number,
  title,
  token_count,
  left(chunk_hash, 12) as chunk_hash_short,
  metadata
from document_sections
order by id desc
limit 20;
```

### 9.6 Backfill embeddings from the terminal

This is terminal-only, not SQL.

The script in [backfill-embeddings.mjs](/Users/eugene/WebDev%20Archive/EASA_app/scripts/backfill-embeddings.mjs) needs:

- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- optionally `ORG_ID`
- optionally `OPENAI_EMBEDDING_MODEL`

Run this in the terminal from `/Users/eugene/WebDev Archive/EASA_app`:

```bash
export SUPABASE_URL="YOUR_REMOTE_SUPABASE_URL"
export SUPABASE_SERVICE_ROLE_KEY="YOUR_REMOTE_SERVICE_ROLE_KEY"
export OPENAI_API_KEY="YOUR_REAL_OPENAI_KEY"
export ORG_ID="00000000-0000-4000-8000-000000000001"
node scripts/backfill-embeddings.mjs
```

What the script does:

- finds up to 100 `flightbook_sections` rows with `embedding is null`
- finds up to 100 `document_sections` rows with `embedding is null`
- requests embeddings from OpenAI
- writes back `embedding`, `token_count`, `chunk_hash`, and `metadata`

If you still have more than 100 missing rows after one run, run the same command again until the missing counts reach zero.

### 9.7 Verify backfill results

```sql
select
  (select count(*) from flightbook_sections where embedding is not null) as flightbook_sections_with_embeddings,
  (select count(*) from flightbook_sections where embedding is null) as flightbook_sections_without_embeddings,
  (select count(*) from document_sections where embedding is not null) as document_sections_with_embeddings,
  (select count(*) from document_sections where embedding is null) as document_sections_without_embeddings;
```

### 9.8 Verify retrieval SQL functions exist

Run:

```sql
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('match_document_sections', 'match_flightbook_sections')
order by routine_name;
```

What you want:

- `match_document_sections`
- `match_flightbook_sections`

If one or both are missing, your RAG match-function migration has not been applied yet.

---

## 10. Useful Debug Queries

Run these only after the related tables exist.

### 10.1 Quick table-existence check before proposal queries

```sql
select
  to_regclass('public.proposed_updates') as proposed_updates,
  to_regclass('public.reg_changes') as reg_changes,
  to_regclass('public.approvals') as approvals;
```

If `proposed_updates` is `null`, skip the next query and create that table first.

### 10.2 Proposed updates with RAG evidence

This query assumes `proposed_updates` exists and the later provenance columns were added.

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

If you get a column-missing error for `generation_prompt_version`, `retrieved_at`, or `source_citations`, run:

```sql
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

### 10.3 Document sections count

```sql
select count(*) as document_section_count
from document_sections;
```

### 10.4 Embedding coverage summary

```sql
select
  (select count(*) from flightbook_sections where embedding is not null) as flightbook_sections_with_embeddings,
  (select count(*) from flightbook_sections where embedding is null) as flightbook_sections_without_embeddings,
  (select count(*) from document_sections where embedding is not null) as document_sections_with_embeddings,
  (select count(*) from document_sections where embedding is null) as document_sections_without_embeddings;
```

### 10.5 Dashboard source debug query

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

### 10.6 Saved RAG evidence

Run this after you generate a draft successfully in the app:

```sql
select
  id,
  generation_prompt_version,
  retrieved_at,
  source_citations,
  retrieval_context
from proposed_updates
order by updated_at desc
limit 10;
```

---

## 11. Troubleshooting

### Error: `relation "proposed_updates" does not exist`

You have not applied the migration that creates `proposed_updates` yet.

### Error: `relation "reg_changes" does not exist`

You have not applied the regulation-tables migration yet.

### Error: `column "generation_prompt_version" does not exist`

You created `proposed_updates`, but you did not apply the later provenance-column migration.

### Error: `column "embedding" does not exist`

You created `flightbook_sections` or `document_sections`, but you did not apply the RAG embedding schema changes.

### Error: `syntax error at or near "-" line 1: set -a`

You pasted a shell command into the SQL editor. Run that block in the terminal instead.

### Error: backfill script says missing `OPENAI_API_KEY`

Set `OPENAI_API_KEY` in your terminal before running:

```bash
export OPENAI_API_KEY="YOUR_REAL_OPENAI_KEY"
```

### Error: backfill script updates only some rows

That script uses `.limit(100)`. Run it again until the SQL missing-count queries return zero.

---

## 12. Safe Cleanup For Demo Data

Only run this if you really want to clear the demo organization data.

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

---

## 13. Shortest Safe Path

If you want the least error-prone sequence, do this:

1. Run section `9.1` and confirm the required tables exist.
2. Run section `9.2` and confirm the embedding columns exist.
3. Run sections `9.3` and `9.4` to see whether backfill is needed.
4. If embeddings are missing, run section `9.6` in the terminal.
5. Run section `9.7` to confirm coverage.
6. Run section `10.1` before any `proposed_updates` query.
7. Only run section `10.2` or `10.6` after `proposed_updates` exists.
