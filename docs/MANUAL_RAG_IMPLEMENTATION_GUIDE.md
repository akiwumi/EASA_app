# Manual RAG Implementation Guide For A Remote Supabase Project

This guide is for a novice coder.

It explains how to manually set up and verify the RAG pipeline for this app when your database is a **remote Supabase project** and you do **not** want to work mainly on a local development server.

This guide assumes:

- your Supabase database is remote
- your Supabase Auth is remote
- your Supabase Edge Functions are remote
- your app is already deployed somewhere like Vercel
- you want to do setup mostly in:
  - Supabase Dashboard
  - your deployment dashboard
  - your live app URL

## What You Are Building

You are adding a RAG pipeline to the EASA app.

In this app, RAG means:

1. fetch regulation sources
2. turn them into text
3. split the text into useful chunks
4. create embeddings for those chunks
5. retrieve the most relevant regulation chunks
6. retrieve the most relevant flightbook chunks
7. give those retrieved chunks to the AI model
8. generate a grounded draft update
9. show the evidence to a reviewer

This app is not mainly using RAG for a chatbot.
It is using RAG for:

- compliance review
- regulation-to-manual matching
- grounded draft generation
- traceable evidence in the review UI

## Before You Start

Make sure you have:

1. a remote Supabase project
2. a deployed copy of the app
3. access to the app’s deployment environment variables
4. a real OpenAI API key for embeddings
5. access to the Supabase SQL editor
6. access to Supabase Edge Functions

## Information You Should Have Ready

Write these down before you start:

- your deployed app URL
- your Supabase project URL
- your Supabase anon key
- your Supabase service role key
- your OpenAI API key

You will need all of these.

## High-Level Build Order

Do the steps in this order:

1. update remote database schema
2. seed the remote sources and org data
3. set remote environment variables
4. deploy Supabase Edge Functions to the remote project
5. create or confirm an admin user in remote Auth
6. verify remote flightbook uploads create embeddings
7. verify remote regulation ingestion creates chunks
8. verify remote retrieval and draft generation
9. verify evidence is shown in the live UI

## Step 1: Run The Database SQL In The Remote Supabase Project

Open:

1. Supabase Dashboard
2. your remote project
3. `SQL Editor`

Then use:

- [SUPABASE_SQL_NOVICE_GUIDE.md](/Users/eugene/WebDev%20Archive/EASA_app/docs/SUPABASE_SQL_NOVICE_GUIDE.md)

### Minimum SQL Sections To Run

Run at least these sections:

1. `Create The Demo Organization`
2. `Add The EASA RSS Feeds`
3. `Add HTML Source Pages For Future RAG / Full-Text Pipeline`
4. `Add Or Update AI Provider Settings`
5. `Add The New RAG Columns`
6. `Add The RAG Search Functions`

### Why This Matters

Without this SQL:

- `document_sections` will not have embedding fields
- `proposed_updates` will not have citation fields
- the retrieval functions will not exist
- the deployed app will not be able to use the new RAG code correctly

### Verify The SQL Worked

Run:

```sql
select count(*) from organizations;
select count(*) from sources;
select count(*) from ai_provider_config;
```

Then verify the retrieval functions:

```sql
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('match_document_sections', 'match_flightbook_sections')
order by routine_name;
```

## Step 2: Know Which Files Matter

Even if you are not working locally, it helps to know what parts of the repo correspond to the remote system.

### Database / Supabase

- [014_rag_embeddings.sql](/Users/eugene/WebDev%20Archive/EASA_app/supabase/migrations/schema/014_rag_embeddings.sql)
- [015_rag_provenance.sql](/Users/eugene/WebDev%20Archive/EASA_app/supabase/migrations/schema/015_rag_provenance.sql)
- [016_rag_match_functions.sql](/Users/eugene/WebDev%20Archive/EASA_app/supabase/migrations/schema/016_rag_match_functions.sql)

### Supabase Edge Functions

- [rss-ingest](/Users/eugene/WebDev%20Archive/EASA_app/supabase/functions/rss-ingest/index.ts)
- [ai-analyze](/Users/eugene/WebDev%20Archive/EASA_app/supabase/functions/ai-analyze/index.ts)
- [regulation-ingest](/Users/eugene/WebDev%20Archive/EASA_app/supabase/functions/regulation-ingest/index.ts)

### App API Routes

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

## Step 3: Set The Environment Variables In Your Deployed App

Because you do not want to work locally, this step is very important.

Go to your app hosting platform.

If you are using Vercel:

1. open the project
2. go to `Settings`
3. go to `Environment Variables`

Make sure these exist:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
OPENAI_EMBEDDING_MODEL
NEXT_PUBLIC_APP_URL
```

Recommended value for:

```text
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

### Why This Matters

The remote app needs:

- Supabase client keys
- a service role key for protected server work
- an OpenAI key for embeddings
- its own public URL so internal API calls work correctly

### Verify

After saving environment variables, redeploy the app.

Then open the deployed app URL and make sure the login page loads.

## Step 4: Update The Remote Supabase AI Provider Config

The app stores AI settings inside the database too.

Run this SQL in the remote Supabase SQL editor:

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
  'PASTE_REAL_OPENAI_API_KEY_HERE'
)
on conflict (organization_id) do update
set
  provider = excluded.provider,
  model = excluded.model,
  api_key = excluded.api_key,
  updated_at = now();
```

### Important Note

This AI config is used for generation.

Embeddings also use OpenAI in the current implementation.

### Verify

Run:

```sql
select organization_id, provider, model, updated_at
from ai_provider_config;
```

## Step 5: Deploy The Supabase Edge Functions To The Remote Project

The live app depends on remote Supabase functions.

You need these functions available in the remote project:

1. `rss-ingest`
2. `ai-analyze`
3. `regulation-ingest`

### If You Use Supabase CLI

From a machine that has the repo and the Supabase CLI:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy rss-ingest
supabase functions deploy ai-analyze
supabase functions deploy regulation-ingest
```

If the project is already linked:

```bash
supabase functions deploy rss-ingest
supabase functions deploy ai-analyze
supabase functions deploy regulation-ingest
```

### Remote Function Secrets

Also make sure your remote Supabase project has the needed secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_EMBEDDING_MODEL`

### Verify

In the Supabase dashboard:

1. go to `Edge Functions`
2. confirm the functions exist
3. confirm the latest deployment succeeded

## Step 6: Create Or Confirm A Remote Admin User

This app uses remote Supabase Auth.

You need:

- a real auth user
- connected to an organization
- with role `admin`

### Easiest Method

Create the user directly in:

1. Supabase Dashboard
2. `Authentication`
3. `Users`

Then connect that user to the demo organization with SQL:

```sql
insert into org_users (organization_id, user_id, role)
values (
  '00000000-0000-4000-8000-000000000001',
  'PASTE_REAL_AUTH_USER_UUID_HERE',
  'admin'
)
on conflict do nothing;
```

### Verify

Run:

```sql
select *
from org_users
where organization_id = '00000000-0000-4000-8000-000000000001';
```

## Step 7: Log Into The Deployed App

Now use the **live deployed URL** of the app.

Do not use localhost for this guide.

### What To Do

1. open the deployed app URL
2. go to `/login`
3. sign in with your remote admin user

### Verify

You should be able to reach:

- `/dashboard`
- `/flightbooks`
- `/results`
- `/settings`

If you keep getting redirected back to login:

1. check the remote auth user exists
2. check `org_users`
3. check deployed env vars
4. check the Supabase URL is correct in the deployment platform

## Step 8: Upload A Flightbook In The Live App

The app now embeds flightbook sections during upload.

### What To Do

In the live app:

1. go to `/flightbooks/upload`
2. upload a test `.txt`, `.md`, `.pdf`, or `.json`
3. wait for the upload to complete

### What Happens

The remote app should:

1. parse sections
2. insert rows into `flightbook_sections`
3. store `token_count`
4. store `chunk_hash`
5. store `metadata`
6. try to store embeddings

### Verify In Remote SQL

Run:

```sql
select
  id,
  section_number,
  title,
  token_count,
  embedding is not null as has_embedding
from flightbook_sections
order by created_at desc
limit 20;
```

If `has_embedding` is `false`, check:

1. `OPENAI_API_KEY` in the deployed app environment
2. remote `ai_provider_config`
3. whether outbound OpenAI requests are allowed

## Step 9: Confirm The Remote HTML Regulation Sources Exist

The new regulation ingestion step uses `sources` rows where:

```text
type = 'html'
```

Run:

```sql
select id, url, active, type
from sources
where type = 'html'
order by created_at;
```

You should see EASA HTML URLs.

If not, run the SQL from:

- `Add HTML Source Pages For Future RAG / Full-Text Pipeline`

## Step 10: Run The Full Pipeline In The Live App

Now use the live dashboard.

Go to:

- `/dashboard`

Click:

- `Run RSS + AI`

### What Happens Remotely

The live app now runs:

1. `rss-ingest`
2. `regulation-ingest`
3. `ai-analyze`
4. aggregate reg changes

### What To Look For In The Live Dashboard

You should see counts for:

- active feeds
- items stored
- AI findings
- reg changes
- snapshots
- reg sections

### Verify In Remote SQL

Run:

```sql
select count(*) from source_snapshots;
select count(*) from document_sections;
```

If both are still zero:

1. the remote `regulation-ingest` function may not be deployed
2. HTML sources may be missing
3. remote function secrets may be missing
4. the EASA fetches may be failing

## Step 11: Verify Regulation Chunking In The Remote Database

Inspect the live regulation chunks.

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
- a part such as `Part-FCL`

### Check Real Chunk Bodies

```sql
select section_number, title, body
from document_sections
limit 5;
```

If the text looks too messy:

1. the HTML cleaning may need improvement
2. the heading detection may need improvement
3. chunk size logic may need tuning

That logic lives in:

- [regulation-ingest](/Users/eugene/WebDev%20Archive/EASA_app/supabase/functions/regulation-ingest/index.ts)

## Step 12: Verify Regulation Embeddings In The Remote Database

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

1. `OPENAI_API_KEY` in remote Supabase function secrets
2. `OPENAI_EMBEDDING_MODEL` in remote Supabase function secrets
3. Edge Function logs for `regulation-ingest`
4. whether OpenAI requests are failing remotely

The ingestion step is designed to still succeed even if embeddings fail.

## Step 13: Backfill Old Remote Rows

If you already had:

- old `flightbook_sections`
- old `document_sections`

from before the RAG changes, those older rows may not have embeddings.

### Easiest Novice Approach

Use the verification queries from:

- [SUPABASE_SQL_NOVICE_GUIDE.md](/Users/eugene/WebDev%20Archive/EASA_app/docs/SUPABASE_SQL_NOVICE_GUIDE.md)

Then run the backfill script from any machine that has repo access and valid credentials:

```bash
export SUPABASE_URL="YOUR_REMOTE_SUPABASE_URL"
export SUPABASE_SERVICE_ROLE_KEY="YOUR_REMOTE_SERVICE_ROLE_KEY"
export OPENAI_API_KEY="YOUR_REAL_OPENAI_KEY"
export ORG_ID="00000000-0000-4000-8000-000000000001"
node scripts/backfill-embeddings.mjs
```

This script writes to the **remote** Supabase database.

It does not require you to run the app locally.

### Verify

Run:

```sql
select
  (select count(*) from flightbook_sections where embedding is not null) as flightbook_with_embeddings,
  (select count(*) from document_sections where embedding is not null) as regulation_with_embeddings;
```

## Step 14: Verify Retrieval Through The Live App

You do not need to manually call the SQL functions as a novice.

Instead, test retrieval through the deployed UI.

### What To Do

1. go to `/results`
2. open a finding
3. click `Generate AI draft`

### What Should Happen

The live app should:

1. load the finding
2. build a retrieval query
3. retrieve regulation chunks
4. retrieve flightbook chunks
5. build the RAG prompt
6. call the AI model
7. save the generated draft with citations

### Verify In The Live UI

You should see:

- current flightbook text
- AI suggested revision
- change summary
- why this section
- confidence
- retrieved evidence cards

## Step 15: Verify The Saved Evidence In Remote SQL

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

### What Good Output Looks Like

You want to see:

- `generation_prompt_version`
- `retrieved_at`
- `source_citations`
- `retrieval_context`

If those are empty, the generation route may still be using old code or old deployment output.

## Step 16: Verify Approval Still Works In The Live App

After a draft is generated:

1. review it
2. edit it if needed
3. approve it

### What Should Happen

The live app should:

- store the previous flightbook version
- update the flightbook section
- preserve the proposal record
- keep the RAG evidence fields

This proves the new RAG layer did not break the old review flow.

## Step 17: Troubleshooting For A Remote Setup

### Problem: Live dashboard counts stay at zero

Check:

1. remote `sources` table has RSS and HTML rows
2. remote Edge Functions are deployed
3. Supabase function secrets are set
4. EASA fetches are succeeding remotely

### Problem: Flightbook sections exist in remote DB but no embeddings

Check:

1. deployed app has `OPENAI_API_KEY`
2. remote OpenAI calls are not blocked
3. upload route is using correct environment variables

### Problem: Document sections exist in remote DB but no embeddings

Check:

1. `regulation-ingest` function has remote secrets
2. function logs show no OpenAI errors
3. `OPENAI_EMBEDDING_MODEL` is valid

### Problem: Draft generation still feels like keyword matching

Check:

1. `embedding` values exist in both corpora
2. `match_document_sections` exists
3. `match_flightbook_sections` exists
4. `source_citations` are being saved

### Problem: The live app shows findings but no evidence cards

Check:

1. the deployed app includes the latest `ReviewPanel.tsx`
2. the deployed app includes the latest `generate-update` route
3. `source_citations` exists in remote Supabase

### Problem: Login works but admin pages fail

Check:

1. the auth user is in remote Supabase Auth
2. the user has a row in `org_users`
3. the role is `admin`

## Step 18: Simple Remote Verification Sequence

If you want the shortest possible remote-only test, do exactly this:

1. run the SQL guide in the remote Supabase project
2. set remote app environment variables
3. set remote Supabase function secrets
4. deploy `rss-ingest`
5. deploy `ai-analyze`
6. deploy `regulation-ingest`
7. create an admin auth user in remote Supabase
8. connect that user in `org_users`
9. log into the deployed app
10. upload one flightbook
11. click `Run RSS + AI`
12. confirm `snapshots` and `reg sections` increase
13. open a result
14. click `Generate AI draft`
15. confirm evidence is shown

If those 15 steps work, the remote RAG setup is working.

## Step 19: Files To Read If You Want To Learn More

Read these in order:

1. [RAG_IMPLEMENTATION_PLAN.md](/Users/eugene/WebDev%20Archive/EASA_app/docs/RAG_IMPLEMENTATION_PLAN.md)
2. [SUPABASE_SQL_NOVICE_GUIDE.md](/Users/eugene/WebDev%20Archive/EASA_app/docs/SUPABASE_SQL_NOVICE_GUIDE.md)
3. [retrieval.ts](/Users/eugene/WebDev%20Archive/EASA_app/src/lib/ai/retrieval.ts)
4. [rag-prompt.ts](/Users/eugene/WebDev%20Archive/EASA_app/src/lib/ai/rag-prompt.ts)
5. [generate-update route](/Users/eugene/WebDev%20Archive/EASA_app/src/app/api/findings/generate-update/route.ts)
6. [regulation-ingest function](/Users/eugene/WebDev%20Archive/EASA_app/supabase/functions/regulation-ingest/index.ts)

## Step 20: What To Build Next

After this remote RAG setup is stable, the next good improvements would be:

1. ingest PDF regulations as well as HTML
2. add reranking
3. add stronger citation display
4. add retrieval quality tests
5. measure how often reviewers accept the generated drafts
