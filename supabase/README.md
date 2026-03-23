# Supabase Setup

This folder contains schema migrations, seed data, and Edge Functions for RSS
ingestion + AI analysis.

## 1) Create a Supabase project
- Create a new project in Supabase.
- Note your `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

## 2) Run schema + seed
- In Supabase SQL editor, run:
  - `supabase/migrations/schema/001_init.sql`
  - `supabase/migrations/schema/002_roles_permissions.sql`
  - `supabase/sql/seed/001_easa_sources.sql`

## 3) Deploy Edge Functions
- Deploy:
  - `supabase/functions/rss-ingest`
  - `supabase/functions/ai-analyze`
- Set function environment variables:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `EASA_RSS_FEEDS` (comma-separated, optional)
  - `OPENAI_API_KEY` (optional; enables real AI analysis)

## 4) Schedule the pipeline
- Create a scheduled job in Supabase:
  - Run `rss-ingest` daily.
  - Run `ai-analyze` after ingestion.

## 5) Configure the Next.js app
- Create `.env.local` in the repo root with:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

The dashboard "Run AI scrape" button calls `/api/run-scrape`, which invokes
both Edge Functions in sequence.

## 6) Daily schedule
- The dashboard includes a daily automation schedule card.
- Schedule settings are stored in the `schedules` table and are restricted to
  `admin` users via RLS.
