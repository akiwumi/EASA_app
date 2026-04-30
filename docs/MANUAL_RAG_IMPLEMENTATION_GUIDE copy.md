# Manual RAG Implementation Guide

This guide is for a novice coder.

It explains how to manually implement and verify the RAG pipeline for this app from start to finish.

You do **not** need to understand every part before starting. Follow the steps in order.

## What You Are Building

You are adding a RAG pipeline to the EASA app.

RAG means:

1. collect source documents
2. split them into useful chunks
3. create embeddings for those chunks
4. retrieve the best matching chunks for a query
5. give those chunks to the AI model
6. generate a grounded answer or grounded draft

In this app, the goal is:

- ingest EASA regulation sources
- ingest school flightbook sections
- retrieve matching regulation text and matching flightbook text
- generate a proposed flightbook revision
- show the evidence to the reviewer

This app is **not** mainly using RAG for chat.
It is using RAG for compliance drafting and change review.

## Before You Start

Make sure you have:

1. the repo cloned locally
2. Node.js installed
3. a Supabase project
4. `.env.local` filled in
5. an OpenAI API key if you want embeddings to work

### Check Your Local Repo

From the project root:

```bash
pwd
git branch --show-current
npm install
```

### Check Your Env Vars

Your `.env.local` should include values like:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

If `OPENAI_API_KEY` is missing, the app can still run, but embeddings and semantic retrieval will not work properly.

## High-Level Build Order

Follow this order:

1. run the Supabase SQL changes
2. deploy or update Supabase Edge Functions
3. verify flightbook upload embeddings
4. verify regulation HTML ingestion
5. verify retrieval functions
6. verify generation route
7. verify UI evidence display
8. backfill old rows
9. run a full end-to-end test

## Step 1: Run The Database Changes

Open the Supabase dashboard.

Go to:

1. `SQL Editor`
2. create a new query

Then run the SQL from:

- [SUPABASE_SQL_NOVICE_GUIDE.md](/Users/eugene/WebDev%20Archive/EASA_app/docs/SUPABASE_SQL_NOVICE_GUIDE.md)

### Minimum SQL Sections To Run

At minimum, run these sections:

1. `Create The Demo Organization`
2. `Add The EASA RSS Feeds`
3. `Add HTML Source Pages For Future RAG / Full-Text Pipeline`
4. `Add Or Update AI Provider Settings`
5. `Add The New RAG Columns`
6. `Add The RAG Search Functions`

### Why This Matters

Without the SQL:

- `document_sections` will not have embeddings
- `proposed_updates` will not have citation fields
- retrieval RPCs will not exist
- the app code will compile but retrieval will fail

### Verify The SQL Worked

Run these checks in Supabase:

```sql
select count(*) from sources;
select count(*) from organizations;
select count(*) from ai_provider_config;
```

Then check the retrieval functions:

```sql
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('match_document_sections', 'match_flightbook_sections');
```

## Step 2: Understand The Main Files

These are the important files for the RAG system.

### Database / Supabase

- [014_rag_embeddings.sql](/Users/eugene/WebDev%20Archive/EASA_app/supabase/migrations/schema/014_rag_embeddings.sql)
- [015_rag_provenance.sql](/Users/eugene/WebDev%20Archive/EASA_app/supabase/migrations/schema/015_rag_provenance.sql)
- [016_rag_match_functions.sql](/Users/eugene/WebDev%20Archive/EASA_app/supabase/migrations/schema/016_rag_match_functions.sql)

### Edge Functions

- [rss-ingest](/Users/eugene/WebDev%20Archive/EASA_app/supabase/functions/rss-ingest/index.ts)
- [ai-analyze](/Users/eugene/WebDev%20Archive/EASA_app/supabase/functions/ai-analyze/index.ts)
- [regulation-ingest](/Users/eugene/WebDev%20Archive/EASA_app/supabase/functions/regulation-ingest/index.ts)

### API Routes

- [run-scrape route](/Users/eugene/WebDev%20Archive/EASA_app/src/app/api/run-scrape/route.ts)
- [generate-update route](/Users/eugene/WebDev%20Archive/EASA_app/src/app/api/findings/generate-update/route.ts)
- [flightbook upload route](/Users/eugene/WebDev%20Archive/EASA_app/src/app/api/flightbooks/upload/route.ts)
- [pipeline-status route](/Users/eugene/WebDev%20Archive/EASA_app/src/app/api/admin/pipeline-status/route.ts)

### Shared AI Logic

- [embeddings.ts](/Users/eugene/WebDev%20Archive/EASA_app/src/lib/ai/embeddings.ts)
- [retrieval.ts](/Users/eugene/WebDev%20Archive/EASA_app/src/lib/ai/retrieval.ts)
- [rag-prompt.ts](/Users/eugene/WebDev%20Archive/EASA_app/src/lib/ai/rag-prompt.ts)

### UI

- [AiScrapeButton.tsx](/Users/eugene/WebDev%20Archive/EASA_app/src/components/dashboard/AiScrapeButton.tsx)
- [ReviewPanel.tsx](/Users/eugene/WebDev%20Archive/EASA_app/src/components/results/ReviewPanel.tsx)

## Step 3: Start The App Locally

In the project root:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

If your local port is different, use that instead.

### Verify

You should be able to load:

- `/`
- `/login`

Protected routes may redirect to login if auth is not working yet.

## Step 4: Deploy Or Update Supabase Edge Functions

This app depends on Supabase functions, not only Next.js routes.

You need these deployed:

1. `rss-ingest`
2. `ai-analyze`
3. `regulation-ingest`

### If You Use Supabase CLI

From the repo root:

```bash
supabase functions deploy rss-ingest
supabase functions deploy ai-analyze
supabase functions deploy regulation-ingest
```

If you already use a linked Supabase project, this is usually enough.

### If You Are Not Sure

Check the function folders exist:

- `supabase/functions/rss-ingest`
- `supabase/functions/ai-analyze`
- `supabase/functions/regulation-ingest`

### Verify

In the Supabase dashboard, go to:

1. `Edge Functions`
2. confirm the functions appear

## Step 5: Create Or Confirm An Admin User

This app uses Supabase Auth.

You need a real auth user connected to an organization.

### Easiest Method

Use the repo helper script:

```bash
set -a
source .env.local
set +a
node scripts/create-admin-user.mjs
```

That usually creates:

- email: `admin@easa.local`
- login shortcut: `admin`

### Verify

Go to:

1. Supabase dashboard
2. `Authentication`
3. `Users`

Make sure the admin user exists.

Then run this SQL:

```sql
select *
from org_users;
```

Make sure the user is connected to an organization with role `admin`.

## Step 6: Verify Flightbook Upload Embeddings

The app now tries to embed flightbook sections during upload.

### What To Do

1. log in
2. go to `/flightbooks/upload`
3. upload a test file
4. wait for the upload to finish

Good test files:

- `.txt`
- `.md`
- `.pdf`
- `.json` fixture format

### What The Code Does

The upload route:

- parses sections
- inserts `flightbook_sections`
- stores `token_count`
- stores `chunk_hash`
- stores `metadata`
- tries to store `embedding`

See:

- [flightbook upload route](/Users/eugene/WebDev%20Archive/EASA_app/src/app/api/flightbooks/upload/route.ts)

### Verify In SQL

Run:

```sql
select id, section_number, title, token_count, embedding is not null as has_embedding
from flightbook_sections
order by created_at desc
limit 20;
```

If `has_embedding` is `false`, check:

1. `OPENAI_API_KEY`
2. `ai_provider_config`
3. whether OpenAI requests are allowed from your environment

## Step 7: Verify Regulation HTML Sources Exist

The new regulation ingestion uses `sources` rows with `type = 'html'`.

Run:

```sql
select id, url, active, type
from sources
where type = 'html'
order by created_at;
```

You should see the EASA HTML URLs.

If not, run the SQL from the novice guide section:

- `Add HTML Source Pages For Future RAG / Full-Text Pipeline`

## Step 8: Run The Full Pipeline

Now run the pipeline from the app.

### In The UI

Go to `/dashboard`.

Click:

- `Run RSS + AI`

### What Happens Internally

The pipeline route now runs:

1. `rss-ingest`
2. `regulation-ingest`
3. `ai-analyze`
4. aggregate reg changes

See:

- [run-scrape route](/Users/eugene/WebDev%20Archive/EASA_app/src/app/api/run-scrape/route.ts)

### What To Look For In The Dashboard

You should see counts for:

- active feeds
- items stored
- AI findings
- reg changes
- snapshots
- reg sections

### Verify In SQL

Run:

```sql
select count(*) from source_snapshots;
select count(*) from document_sections;
```

If both are still zero:

1. the `regulation-ingest` function may not be deployed
2. HTML sources may be missing
3. fetches may be failing

## Step 9: Verify Regulation Chunking Worked

Now inspect the actual chunks.

Run:

```sql
select
  id,
  section_number,
  title,
  token_count,
  left(chunk_hash, 12) as chunk_hash_short,
  metadata->>'part' as part
from document_sections
order by sort_order
limit 30;
```

### What Good Output Looks Like

You want to see:

- a title
- sometimes a section number
- a token count
- a part like `Part-FCL`

### Check Actual Bodies

```sql
select section_number, title, body
from document_sections
limit 5;
```

If the text looks too noisy:

1. improve HTML cleaning
2. improve heading detection
3. adjust chunk sizes

Those rules live in:

- [regulation-ingest](/Users/eugene/WebDev%20Archive/EASA_app/supabase/functions/regulation-ingest/index.ts)

## Step 10: Verify Regulation Embeddings Worked

Run:

```sql
select count(*) as with_embeddings
from document_sections
where embedding is not null;
```

And:

```sql
select count(*) as without_embeddings
from document_sections
where embedding is null;
```

### If Embeddings Are Missing

Check:

1. `OPENAI_API_KEY`
2. `OPENAI_EMBEDDING_MODEL`
3. `ai_provider_config`
4. Edge Function logs in Supabase

It is okay if ingestion succeeded but embeddings failed.
The system is designed to degrade gracefully.

## Step 11: Backfill Old Rows

If you added the RAG code after already uploading flightbooks or regulation sections, you may need a backfill.

Use:

- [backfill-embeddings.mjs](/Users/eugene/WebDev%20Archive/EASA_app/scripts/backfill-embeddings.mjs)

Run:

```bash
set -a
source .env.local
set +a
export OPENAI_API_KEY="YOUR_KEY_HERE"
node scripts/backfill-embeddings.mjs
```

### Verify

Run:

```sql
select
  (select count(*) from flightbook_sections where embedding is not null) as flightbook_with_embeddings,
  (select count(*) from document_sections where embedding is not null) as regulation_with_embeddings;
```

## Step 12: Verify Retrieval Functions

You do not have to manually pass a real embedding from SQL as a novice.

Instead, verify indirectly:

1. upload flightbook content
2. run the pipeline
3. open a result detail page
4. generate a draft

If retrieval works, the app should:

- choose a relevant flightbook section
- show evidence cards
- persist citations

### What The Retrieval Code Uses

See:

- [retrieval.ts](/Users/eugene/WebDev%20Archive/EASA_app/src/lib/ai/retrieval.ts)

It builds a query from:

- update title
- RSS summary
- finding summary
- mapped section
- regulation part

Then it tries:

1. vector retrieval
2. fallback text search if embeddings are unavailable

## Step 13: Verify Draft Generation

Go to:

1. `/results`
2. open a finding
3. click `Generate AI draft`

### What Should Happen

The app should:

1. load the finding
2. retrieve regulation chunks
3. retrieve flightbook chunks
4. build the RAG prompt
5. call the LLM
6. save the draft plus evidence

### Verify In The UI

You should see:

- current text
- AI suggested revision
- change summary
- why this section
- confidence
- retrieved evidence

### Verify In SQL

Run:

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

## Step 14: Verify Approval Still Works

After generating a draft:

1. edit the text if needed
2. click approve

### What Should Happen

The app should:

- snapshot the previous section version
- update the flightbook section body
- keep the proposal record

This confirms the new RAG layer did not break the old review workflow.

## Step 15: Troubleshooting Checklist

### Problem: Dashboard counts stay at zero

Check:

1. `sources` table has RSS and HTML rows
2. Edge Functions are deployed
3. Supabase service role key is valid
4. fetch from EASA is allowed

### Problem: Flightbook sections exist but no embeddings

Check:

1. OpenAI key exists
2. upload route has access to env vars
3. model name is valid

### Problem: Document sections exist but no embeddings

Check:

1. `regulation-ingest` function has `OPENAI_API_KEY`
2. function logs in Supabase
3. no rate-limit or auth errors from OpenAI

### Problem: Draft generation still feels like keyword matching

Check:

1. embeddings exist
2. `match_document_sections` exists
3. `match_flightbook_sections` exists
4. `source_citations` are being saved

### Problem: Results page shows findings but no evidence

Check:

1. generation route returned `citations`
2. `ReviewPanel.tsx` is up to date
3. `source_citations` field exists in Supabase

## Step 16: Beginner Verification Sequence

If you only want the simplest possible test, do exactly this:

1. run the SQL guide
2. deploy the three Supabase functions
3. create admin user
4. run `npm run dev`
5. log in
6. upload one flightbook
7. click `Run RSS + AI`
8. confirm `snapshots` and `reg sections` increase
9. open a result
10. click `Generate AI draft`
11. confirm evidence is shown

If all 11 steps work, the manual RAG implementation is working.

## Step 17: Files To Read If You Want To Learn More

If you want to understand the design after getting it working, read these in order:

1. [RAG_IMPLEMENTATION_PLAN.md](/Users/eugene/WebDev%20Archive/EASA_app/docs/RAG_IMPLEMENTATION_PLAN.md)
2. [SUPABASE_SQL_NOVICE_GUIDE.md](/Users/eugene/WebDev%20Archive/EASA_app/docs/SUPABASE_SQL_NOVICE_GUIDE.md)
3. [retrieval.ts](/Users/eugene/WebDev%20Archive/EASA_app/src/lib/ai/retrieval.ts)
4. [rag-prompt.ts](/Users/eugene/WebDev%20Archive/EASA_app/src/lib/ai/rag-prompt.ts)
5. [generate-update route](/Users/eugene/WebDev%20Archive/EASA_app/src/app/api/findings/generate-update/route.ts)
6. [regulation-ingest function](/Users/eugene/WebDev%20Archive/EASA_app/supabase/functions/regulation-ingest/index.ts)

## Step 18: What To Build Next

After this manual implementation is stable, the next improvements would be:

1. ingest PDF regulations as well as HTML
2. add a reranking layer
3. add side-by-side citation highlighting
4. create automated tests for retrieval quality
5. benchmark acceptance rate of generated drafts
