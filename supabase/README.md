# Supabase Setup

This folder contains schema migrations, storage policies, seed data, and Edge
Functions for RSS ingestion, regulation ingestion, and AI analysis.

## 1) Create a Supabase project
- Create a new project in Supabase.
- Note your `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

## 2) Run schema + storage + seed
- In Supabase SQL editor, run:
  - `supabase/migrations/schema/001_init.sql`
  - `supabase/migrations/schema/002_roles_permissions.sql`
  - `supabase/migrations/schema/004_reg_documents.sql`
  - `supabase/migrations/schema/014_rag_embeddings.sql`
  - `supabase/migrations/schema/016_rag_match_functions.sql`
  - `supabase/migrations/schema/017_source_snapshot_storage_metadata.sql`
  - `supabase/migrations/storage/001_buckets.sql`
  - `supabase/migrations/storage/002_easa_source_files.sql`
  - `supabase/sql/seed/001_easa_sources.sql`
  - `supabase/sql/seed/002_html_sources.sql`

- Key outcomes:
  - `rss-ingest` writes feed items into `rss_items`
  - `regulation-ingest` writes chunked regulation text into `document_sections`
  - `pgvector` powers `match_document_sections` for EASA regulation search
  - raw EASA source files are stored in the `easa-source-files` bucket

## 3) Deploy Edge Functions
- Deploy:
  - `supabase/functions/rss-ingest`
  - `supabase/functions/regulation-ingest`
  - `supabase/functions/ai-analyze`
- Set function environment variables:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `OPENAI_API_KEY` (optional; enables real AI analysis)
  - `OPENAI_EMBEDDING_MODEL` (optional; defaults to `text-embedding-3-small`)

## 4) Schedule the pipeline
- Create a scheduled job in Supabase:
  - Run `rss-ingest` daily.
  - Run `regulation-ingest` after RSS ingestion.
  - Run `ai-analyze` after regulation ingestion.

## 5) Configure the Next.js app
- Create `.env.local` in the repo root with:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

The dashboard "Run AI scrape" button calls `/api/run-scrape`, which invokes
RSS ingest, regulation ingest, and AI analysis in sequence.

## 6) Daily schedule
- The dashboard includes a daily automation schedule card.
- Schedule settings are stored in the `schedules` table and are restricted to
  `admin` users via RLS.
