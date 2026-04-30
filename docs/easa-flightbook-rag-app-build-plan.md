# EASA Flight Book Compliance RAG App — Full Build Plan

**Project purpose:**  
Build an application that monitors EASA RSS feeds for regulatory updates, compares those updates against flight school flight books, identifies relevant changes, proposes amendments, creates updated flight book files, and preserves full rollback/version history.

**Core privacy requirement:**  
Flight books should stay local to the user/school. Supabase should hold shared cloud data such as users, EASA feeds, EASA updates, billing, and notification metadata. Users should not need to set up Supabase locally.

---

## 1. Product Summary

The app is a **local-first aviation compliance assistant**.

It should:

1. Read EASA RSS feeds.
2. Detect new regulatory updates.
3. Store and classify EASA updates in Supabase.
4. Keep each flight school’s flight books local to the user/device.
5. Use RAG to compare EASA updates against local flight book content.
6. Identify affected manual sections.
7. Generate proposed amendments.
8. Require human approval before applying changes.
9. Create a new updated flight book version.
10. Allow rollback to previous versions.
11. Maintain audit logs for compliance traceability.

The app must never silently rewrite a flight book without review.

---

## 2. Important Compliance Principle

The app should **assist compliance**, not claim legal or regulatory compliance on its own.

Use language like:

> “This EASA update appears relevant to the following sections. Review is required.”

Avoid language like:

> “Your flight book is now compliant.”

This distinction matters because aviation documents should be reviewed and approved by an authorised person, such as a compliance manager, head of training, or nominated person.

---

## 3. Recommended Architecture

```text
EASA RSS Feeds
   ↓
Supabase Cloud Backend
   ↓
EASA Update Database
   ↓
EASA Regulation Chunks + Embeddings
   ↓
User App
   ↓
Local Flight Book Database
   ↓
Local RAG Search
   ↓
Proposed Amendments
   ↓
Human Approval
   ↓
New Local Flight Book Version
   ↓
Rollback / Time Machine
```

---

## 4. Local-First Design

### 4.1 What stays in Supabase

Supabase should store shared, non-private, cloud-side data.

```text
Supabase stores:
- user accounts
- organisations / flight schools
- roles and permissions
- EASA RSS feed list
- EASA update records
- EASA source document metadata
- EASA regulation chunks
- EASA embeddings
- billing status
- notification records
- cloud audit metadata
```

### 4.2 What stays local

The user’s actual flight books should stay local.

```text
Local database stores:
- uploaded flight books
- extracted document text
- flight book sections
- flight book chunks
- local embeddings
- proposed amendments
- approved amendments
- full document snapshots
- rollback history
- local audit logs
- exported PDF/DOCX files
```

---

## 5. Browser App vs Desktop App

This is a critical design choice.

### Option A — Web App MVP

A web app can use persistent local browser storage such as:

```text
- IndexedDB
- OPFS
- SQLite WASM
- PGlite
```

This is not the same as browser cache, but it is still browser-managed storage. If the user clears site data, the local database may be removed.

Use this for a fast MVP.

### Option B — Production Desktop App

For a stronger compliance-grade product, use:

```text
Tauri Desktop App
React Frontend
Local SQLite Database
Supabase Cloud Backend
```

This gives the user a real local database file on their device and avoids relying on browser-managed storage.

### Recommended path

```text
MVP:
Next.js / React web app + PGlite or SQLite WASM

Production:
Tauri desktop app + SQLite
```

If the requirement is strict that the data must not be inside browser storage, then go directly to **Tauri + SQLite**.

---

## 6. Recommended Tech Stack

### Frontend

```text
React
Next.js
Tailwind CSS
shadcn/ui
TanStack Query
Zustand or Redux Toolkit
```

### Cloud backend

```text
Supabase Auth
Supabase Postgres
Supabase Storage
Supabase Edge Functions
Supabase Realtime
Supabase pgvector
```

### Local database

For web MVP:

```text
PGlite
or SQLite WASM
or Dexie.js over IndexedDB
```

For production desktop:

```text
SQLite
Tauri
Drizzle ORM or Prisma
```

### RAG / AI

```text
OpenAI API or compatible LLM provider
Embeddings for EASA cloud data
Local embeddings for flight books
Optional local model later for privacy-sensitive customers
```

### Jobs and scheduling

```text
Supabase Edge Functions
Supabase cron jobs
Trigger.dev
Inngest
or a small Node/Python worker
```

### Document processing

```text
PDF parsing
DOCX parsing
Markdown conversion
Text chunking
Section detection
Diff generation
PDF/DOCX export
```

### Possible libraries

```text
rss-parser
pdf-parse
mammoth
docx
pdf-lib
jsdiff
marked
tiptap
langchain or llamaindex
zod
```

---

## 7. Main App Modules

```text
1. Authentication
2. Organisation / Flight School Management
3. EASA RSS Feed Monitor
4. EASA Regulation Library
5. Flight Book Upload
6. Local Document Parser
7. Local Flight Book Database
8. RAG Comparison Engine
9. Proposed Amendment Generator
10. Human Review Dashboard
11. Version Control / Time Machine
12. Export Engine
13. Notifications
14. Audit Log
15. Optional MCP Server
```

---

## 8. User Roles

Suggested roles:

```text
Owner
Admin
Compliance Manager
Head of Training
Instructor
Reviewer
Read-only Auditor
```

### Permissions

| Role | Can Upload Flight Books | Can Review Changes | Can Approve Changes | Can Roll Back | Can Manage Users |
|---|---:|---:|---:|---:|---:|
| Owner | Yes | Yes | Yes | Yes | Yes |
| Admin | Yes | Yes | Yes | Yes | Yes |
| Compliance Manager | Yes | Yes | Yes | Yes | No |
| Head of Training | Yes | Yes | Yes | No | No |
| Instructor | No | Yes | No | No | No |
| Reviewer | No | Yes | No | No | No |
| Auditor | No | Read only | No | No | No |

---

## 9. Supabase Cloud Database

Supabase is the shared cloud system. The user does not install Supabase locally.

### 9.1 `organisations`

```sql
create table organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text,
  created_at timestamptz default now()
);
```

### 9.2 `profiles`

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organisation_id uuid references organisations(id),
  full_name text,
  role text not null default 'reviewer',
  created_at timestamptz default now()
);
```

### 9.3 `easa_feeds`

```sql
create table easa_feeds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  feed_url text not null,
  category text,
  active boolean default true,
  last_checked_at timestamptz,
  created_at timestamptz default now()
);
```

### 9.4 `easa_updates`

```sql
create table easa_updates (
  id uuid primary key default gen_random_uuid(),
  feed_id uuid references easa_feeds(id),
  title text not null,
  source_url text not null,
  published_at timestamptz,
  summary text,
  document_type text,
  regulation_area text,
  effective_date date,
  content_hash text,
  status text default 'new',
  created_at timestamptz default now()
);
```

### 9.5 `easa_documents`

```sql
create table easa_documents (
  id uuid primary key default gen_random_uuid(),
  easa_update_id uuid references easa_updates(id),
  source_url text,
  document_title text,
  raw_text text,
  xml_content text,
  pdf_url text,
  created_at timestamptz default now()
);
```

### 9.6 `easa_document_chunks`

```sql
create table easa_document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references easa_documents(id),
  chunk_index int not null,
  heading text,
  content text not null,
  regulation_reference text,
  created_at timestamptz default now()
);
```

### 9.7 Add vector support

```sql
create extension if not exists vector;

alter table easa_document_chunks
add column embedding vector(1536);
```

### 9.8 `easa_update_classifications`

```sql
create table easa_update_classifications (
  id uuid primary key default gen_random_uuid(),
  easa_update_id uuid references easa_updates(id),
  regulation_area text,
  likely_affects_training boolean default false,
  likely_affects_ato boolean default false,
  likely_affects_dto boolean default false,
  likely_affects_ops_manual boolean default false,
  likely_affects_training_manual boolean default false,
  confidence_score numeric,
  created_at timestamptz default now()
);
```

### 9.9 `notifications`

```sql
create table notifications (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references organisations(id),
  user_id uuid references auth.users(id),
  title text not null,
  message text not null,
  type text,
  read boolean default false,
  created_at timestamptz default now()
);
```

### 9.10 `cloud_audit_log`

```sql
create table cloud_audit_log (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references organisations(id),
  user_id uuid references auth.users(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz default now()
);
```

---

## 10. Local Database

The local database holds the flight books and all document-specific data.

### 10.1 Web MVP local database

For a web app:

```text
Use PGlite, SQLite WASM, or Dexie/IndexedDB.
The app automatically creates the local database on first launch.
```

### 10.2 Desktop local database

For a desktop app:

```text
Use SQLite.
Tauri creates and manages the local DB file.
The user does not need to manually create or configure anything.
```

---

## 11. Local Database Tables

### 11.1 `local_schema_migrations`

```sql
create table if not exists local_schema_migrations (
  id integer primary key autoincrement,
  version text not null unique,
  applied_at datetime default current_timestamp
);
```

### 11.2 `local_settings`

```sql
create table if not exists local_settings (
  key text primary key,
  value text,
  updated_at datetime default current_timestamp
);
```

### 11.3 `flight_books`

```sql
create table if not exists flight_books (
  id text primary key,
  organisation_id text,
  title text not null,
  aircraft_type text,
  training_type text,
  current_version_id text,
  created_at datetime default current_timestamp,
  updated_at datetime default current_timestamp
);
```

### 11.4 `flight_book_versions`

```sql
create table if not exists flight_book_versions (
  id text primary key,
  flight_book_id text not null,
  version_number text not null,
  full_text text not null,
  file_format text,
  original_file_name text,
  file_hash text,
  created_by text,
  created_at datetime default current_timestamp,
  reason text,
  restored_from_version_id text
);
```

### 11.5 `flight_book_sections`

```sql
create table if not exists flight_book_sections (
  id text primary key,
  flight_book_id text not null,
  version_id text not null,
  heading text,
  section_number text,
  page_start integer,
  page_end integer,
  content text not null,
  created_at datetime default current_timestamp
);
```

### 11.6 `flight_book_chunks`

```sql
create table if not exists flight_book_chunks (
  id text primary key,
  section_id text not null,
  chunk_index integer not null,
  content text not null,
  token_count integer,
  embedding text,
  created_at datetime default current_timestamp
);
```

Store embeddings as JSON text in SQLite, or use a local vector extension if you later add one.

### 11.7 `local_easa_update_cache`

```sql
create table if not exists local_easa_update_cache (
  id text primary key,
  title text not null,
  summary text,
  source_url text,
  regulation_area text,
  document_type text,
  published_at text,
  effective_date text,
  downloaded_at datetime default current_timestamp
);
```

### 11.8 `proposed_amendments`

```sql
create table if not exists proposed_amendments (
  id text primary key,
  easa_update_id text not null,
  flight_book_id text not null,
  section_id text not null,
  original_text text not null,
  proposed_text text not null,
  explanation text,
  confidence_score real,
  status text default 'pending',
  created_by text,
  created_at datetime default current_timestamp,
  reviewed_by text,
  reviewed_at datetime
);
```

### 11.9 `approved_amendments`

```sql
create table if not exists approved_amendments (
  id text primary key,
  proposed_amendment_id text not null,
  flight_book_id text not null,
  applied_version_id text not null,
  approved_by text,
  approved_at datetime default current_timestamp,
  notes text
);
```

### 11.10 `rollback_points`

```sql
create table if not exists rollback_points (
  id text primary key,
  flight_book_id text not null,
  version_id text not null,
  created_at datetime default current_timestamp,
  reason text
);
```

### 11.11 `local_audit_log`

```sql
create table if not exists local_audit_log (
  id text primary key,
  action text not null,
  entity_type text,
  entity_id text,
  user_id text,
  metadata text,
  created_at datetime default current_timestamp
);
```

---

## 12. Automatic Local Database Setup

The app should initialise the local database automatically.

### Startup flow

```text
1. User opens app
2. User logs in with Supabase Auth
3. App checks for local database
4. If local database does not exist, create it
5. Run local migrations
6. Store local schema version
7. Sync latest EASA metadata from Supabase
8. Show dashboard
```

### Example pseudocode

```ts
export async function bootstrapApp(userId: string) {
  const session = await getSupabaseSession();

  if (!session) {
    redirectToLogin();
    return;
  }

  const localDb = await initLocalDatabase(userId);

  await runLocalMigrations(localDb);
  await syncEasaUpdateMetadata(localDb, session.user.id);

  return {
    session,
    localDb
  };
}
```

---

## 13. RAG System Design

The app should use a dual-index RAG system.

```text
Cloud RAG Index:
- EASA updates
- EASA source documents
- EASA chunks
- regulation references
- EASA embeddings

Local RAG Index:
- flight books
- sections
- chunks
- local embeddings
- amendment history
```

---

## 14. RAG Workflow

### 14.1 New EASA update arrives

```text
1. Supabase cron checks EASA RSS feeds
2. New RSS item detected
3. App stores update in easa_updates
4. Related EASA source document is fetched
5. Document is parsed
6. Document is chunked
7. Embeddings are created
8. Update is classified
9. Users are notified if relevant
```

### 14.2 User opens the app

```text
1. App syncs update metadata from Supabase
2. App downloads relevant EASA chunks
3. Flight books remain local
4. Local RAG searches flight book chunks
5. Matching sections are identified
6. Proposed changes are generated
7. User reviews proposed changes
```

### 14.3 Proposed amendment flow

```text
EASA update
   ↓
Relevant EASA chunks
   ↓
Local search against flight book chunks
   ↓
Affected sections
   ↓
AI-generated explanation
   ↓
Suggested replacement text
   ↓
Human review
```

---

## 15. Privacy Modes

The app should support three privacy levels.

### Mode 1 — Local-only

```text
- Flight book text never leaves the device
- Local embeddings only
- Local model required for amendment generation
- Best for strict privacy
- Hardest to build
```

### Mode 2 — Local retrieval + controlled AI

```text
- Flight books stay local
- Relevant snippets are selected locally
- User approves sending snippets to cloud AI
- Best MVP balance
```

### Mode 3 — Cloud-assisted

```text
- Flight book chunks can be processed in cloud
- Easier to build
- Not suitable for strict private-document requirements
```

Recommended MVP: **Mode 2**.

---

## 16. AI Safety Rules

The AI should:

```text
- identify possibly relevant sections
- explain why a section may be affected
- propose wording changes
- provide confidence levels
- request human review
```

The AI should not:

```text
- auto-approve amendments
- claim legal compliance
- hide uncertainty
- overwrite flight books silently
- delete older versions
```

---

## 17. Prompt Design for RAG

### 17.1 Relevance prompt

```text
You are assisting with aviation document review.

Given the EASA update and the flight book section, determine whether the update may affect this section.

Return:
- relevance: high, medium, low, none
- reason
- affected requirement
- suggested action
- confidence score
```

### 17.2 Amendment prompt

```text
You are drafting a proposed amendment for human review.

Use only the provided EASA source text and the provided flight book section.

Do not invent regulation references.
Do not claim compliance.
Preserve the style of the original manual where possible.

Return:
- original issue
- proposed replacement text
- explanation
- confidence score
- human review notes
```

### 17.3 Reviewer summary prompt

```text
Create a concise review note for the compliance manager.

Include:
- EASA update title
- affected flight book section
- why the section may need review
- proposed change summary
- approval recommendation
- uncertainty or missing information
```

---

## 18. Document Processing Pipeline

### Upload flow

```text
1. User uploads DOCX or PDF
2. File remains local
3. App extracts text
4. App detects headings and sections
5. App chunks sections
6. App creates embeddings
7. App saves full original version
8. App creates rollback point
```

### Supported file types

Start with:

```text
DOCX
PDF
TXT
Markdown
```

Later add:

```text
HTML
ODT
Scanned PDF with OCR
```

### Canonical internal format

Store documents internally as structured sections.

```json
{
  "flightBookId": "book_123",
  "title": "Cessna 172 Training Manual",
  "version": "1.0",
  "sections": [
    {
      "sectionNumber": "3.4",
      "heading": "Pre-solo Requirements",
      "content": "..."
    }
  ]
}
```

---

## 19. Chunking Strategy

Flight books should be chunked by section, not randomly.

Recommended:

```text
1. Split by headings
2. Preserve section numbers
3. Preserve page numbers where possible
4. Chunk long sections into 500–1,000 token blocks
5. Keep neighbouring context
6. Store source section ID with every chunk
```

Good chunk metadata:

```text
flight_book_id
version_id
section_id
section_number
heading
page_start
page_end
chunk_index
content
embedding
```

---

## 20. EASA Feed Monitor

### Feed check flow

```text
1. Cron job runs every 1–6 hours
2. Fetch active RSS feeds
3. Parse feed items
4. Generate content hash
5. Check if update already exists
6. Store new update
7. Fetch linked source document if available
8. Parse document
9. Chunk document
10. Embed chunks
11. Classify update
12. Notify relevant users
```

### RSS item fields

```text
title
link
guid
published_at
summary
category
source_feed
content_hash
```

---

## 21. Regulation Classification

Each EASA update should be classified.

Example categories:

```text
Aircrew
Air Operations
ATO
DTO
Part-FCL
Part-ORA
Part-DTO
SERA
AMC
GM
Easy Access Rules
Airworthiness
Safety Information
```

Example classification output:

```json
{
  "regulation_area": "Part-FCL",
  "likely_affects_training": true,
  "likely_affects_ato": true,
  "likely_affects_dto": false,
  "likely_affects_ops_manual": false,
  "likely_affects_training_manual": true,
  "confidence_score": 0.82
}
```

---

## 22. Comparison Engine

The comparison engine checks whether EASA updates affect local flight book sections.

### Step-by-step

```text
1. Get EASA update
2. Get EASA chunks
3. Search local flight book chunks
4. Rank matching chunks
5. Send top matches to AI
6. Ask AI for relevance assessment
7. Store possible impacts
8. Generate proposed amendments
```

### Matching methods

Use a combination of:

```text
Keyword search
Regulation reference matching
Semantic vector search
AI reasoning
Manual tags
Document type filters
```

---

## 23. Proposed Amendment Review

The proposed amendment screen should show:

```text
EASA update title
EASA source link
Affected flight book
Affected section
Original text
Proposed text
Explanation
Confidence score
Buttons:
- Approve
- Edit and approve
- Reject
- Mark not relevant
- Assign to reviewer
```

### Statuses

```text
pending
in_review
approved
rejected
edited
applied
not_relevant
needs_more_information
```

---

## 24. Versioning and Rollback

Every approved change creates a new immutable version.

### Version rules

```text
- Never overwrite an old version
- Never delete rollback history
- Rollback creates a new version
- Every version has a reason
- Every version has a creator
- Every version records source update IDs
```

### Version example

```text
Version 1.0
Original upload

Version 1.1
EASA Part-FCL update applied

Version 1.2
Internal wording correction

Version 1.3
Rollback to Version 1.1
```

### Rollback flow

```text
1. User opens Time Machine
2. User selects older version
3. App shows diff against current version
4. User clicks Restore
5. App creates new version from old content
6. App records rollback reason
7. New version becomes current
```

---

## 25. Audit Logging

The app needs both local and cloud audit logs.

### Local audit events

```text
flight_book_uploaded
flight_book_parsed
local_embedding_created
easa_update_synced
amendment_generated
amendment_approved
amendment_rejected
version_created
rollback_performed
file_exported
```

### Cloud audit events

```text
user_logged_in
organisation_created
feed_checked
easa_update_detected
notification_sent
billing_status_changed
role_changed
```

---

## 26. Export Engine

The app should export updated flight books as:

```text
DOCX
PDF
Markdown
HTML
```

### Export flow

```text
1. User selects flight book version
2. App builds structured document
3. App applies formatting template
4. App generates DOCX/PDF
5. App stores export locally
6. Optional: user manually uploads or shares
```

### Export metadata

Include:

```text
flight book title
version number
created date
approved by
source EASA updates
change summary
review status
```

---

## 27. Screens and UX

### 27.1 Login

```text
Email/password login
Magic link option
Organisation selection
Role-based access
```

### 27.2 Dashboard

Show:

```text
Latest EASA updates
Updates needing review
Flight books needing attention
Recently approved amendments
Version history shortcuts
```

### 27.3 EASA Updates

Show:

```text
Update title
Published date
Regulation area
Affected document type
Status
Confidence
Source link
```

### 27.4 Flight Book Library

Show:

```text
Uploaded flight books
Current version
Last reviewed date
Open amendments
Export button
Time Machine button
```

### 27.5 Compare View

Side-by-side:

```text
Left:
EASA update / source text

Right:
Flight book section

Bottom:
AI analysis and proposed amendment
```

### 27.6 Amendment Review

Actions:

```text
Approve
Edit and approve
Reject
Mark not relevant
Assign to another reviewer
Request more information
```

### 27.7 Time Machine

Show:

```text
Timeline of versions
Diff viewer
Restore button
Download old version
View approval history
```

### 27.8 Settings

Include:

```text
Organisation settings
User roles
Privacy mode
AI provider settings
Local database status
Export templates
Notification settings
```

---

## 28. Notification System

Notifications should be sent when:

```text
New relevant EASA update detected
A flight book may be affected
A proposed amendment is ready
A review is assigned
An amendment is approved
A rollback is performed
```

Channels:

```text
In-app notification
Email
Optional Slack/Teams later
```

---

## 29. Security Requirements

### Supabase security

```text
Use Row Level Security
Never expose service role key in frontend
Use server-side functions for privileged actions
Limit access by organisation_id
Use role-based permissions
```

### Local security

```text
Encrypt local database if possible
Encrypt exported files if needed
Do not store flight books in localStorage
Do not store flight books in sessionStorage
Do not rely on browser cache
Allow user to delete all local data
```

### AI security

```text
Show user what will be sent to cloud AI
Allow local-only mode
Do not send full flight books without explicit consent
Log AI requests locally
Redact sensitive content where possible
```

---

## 30. Manual Setup Steps

These are the manual steps the developer must perform.

### 30.1 Create Supabase project

1. Create a new Supabase project.
2. Save the project URL.
3. Save the anon public key.
4. Save the service role key securely.
5. Enable email authentication.
6. Enable Row Level Security.
7. Enable the vector extension.
8. Create database tables.
9. Create storage buckets for EASA source files.
10. Deploy Edge Functions for RSS ingestion.

### 30.2 Configure environment variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` in the browser.

### 30.3 Set up RSS feeds

1. Add EASA RSS feeds to `easa_feeds`.
2. Mark feeds as active.
3. Run the first feed check manually.
4. Confirm updates are stored.
5. Confirm duplicate detection works.

### 30.4 Set up local database

The app should do this automatically, but the developer must implement:

```text
initLocalDatabase()
runLocalMigrations()
getLocalSchemaVersion()
syncEasaUpdateMetadata()
```

### 30.5 Set up document parsing

Implement:

```text
parsePdf()
parseDocx()
detectSections()
chunkSections()
createLocalEmbeddings()
saveFlightBookVersion()
```

### 30.6 Set up RAG

Implement:

```text
searchLocalFlightBookChunks()
searchCloudEasaChunks()
compareEasaUpdateToSection()
generateProposedAmendment()
saveProposedAmendment()
```

### 30.7 Set up export

Implement:

```text
exportToDocx()
exportToPdf()
exportToMarkdown()
exportToHtml()
```

---

## 31. Suggested Repo Structure

```text
easa-flightbook-rag/
  app/
    dashboard/
    easa-updates/
    flight-books/
    review/
    settings/
  components/
    dashboard/
    flight-books/
    review/
    time-machine/
    ui/
  lib/
    supabase/
    local-db/
    rag/
    rss/
    documents/
    embeddings/
    export/
    audit/
  supabase/
    migrations/
    functions/
      check-easa-feeds/
      classify-easa-update/
      embed-easa-document/
  local-migrations/
  scripts/
  types/
  docs/
```

---

## 32. Development Phases

## Phase 1 — Project Setup

Goal: create the foundation.

Tasks:

```text
Create Next.js app
Install Tailwind
Install Supabase client
Create Supabase project
Create base Supabase tables
Set up Supabase Auth
Create dashboard layout
Create role model
```

Deliverable:

```text
User can log in and see dashboard.
```

---

## Phase 2 — EASA RSS Ingestion

Goal: read EASA RSS feeds and store updates.

Tasks:

```text
Create easa_feeds table
Create easa_updates table
Build RSS parser
Create Supabase Edge Function
Detect duplicate updates
Store content hashes
Add manual refresh button
Show updates in dashboard
```

Deliverable:

```text
App can detect and display new EASA updates.
```

---

## Phase 3 — EASA Regulation Library

Goal: turn EASA updates into searchable source material.

Tasks:

```text
Fetch linked EASA documents
Extract text
Store raw text
Chunk documents
Create embeddings
Store chunks in Supabase
Build search over EASA chunks
Classify updates by area
```

Deliverable:

```text
App can search EASA update content and classify updates.
```

---

## Phase 4 — Local Database

Goal: create automatic local storage for flight books.

Tasks:

```text
Choose local DB technology
Implement initLocalDatabase()
Implement migrations
Create local tables
Store schema version
Add local database status page
Add local backup/export option
```

Deliverable:

```text
User opens app and local DB is automatically created.
```

---

## Phase 5 — Flight Book Upload

Goal: upload and parse flight books locally.

Tasks:

```text
Build upload UI
Parse DOCX
Parse PDF
Extract text
Detect sections
Save original version
Create chunks
Create local embeddings
Show flight book library
```

Deliverable:

```text
User can upload a flight book and the app can search it locally.
```

---

## Phase 6 — Local RAG Search

Goal: compare EASA updates against local flight books.

Tasks:

```text
Download relevant EASA update metadata
Search local flight book chunks
Rank results
Show affected sections
Add confidence scoring
Save local comparison results
```

Deliverable:

```text
App can identify flight book sections that may be affected by an EASA update.
```

---

## Phase 7 — Proposed Amendments

Goal: generate suggested updates for review.

Tasks:

```text
Create AI prompt templates
Generate amendment suggestions
Store proposed amendments locally
Show original vs proposed text
Add explanation and confidence score
Allow edit/reject/approve
```

Deliverable:

```text
Compliance manager can review proposed changes.
```

---

## Phase 8 — Version Control and Rollback

Goal: create Time Machine functionality.

Tasks:

```text
Create version snapshots
Create rollback points
Build version timeline
Build diff viewer
Restore old version by creating new version
Log rollback events
```

Deliverable:

```text
User can view old versions and roll back safely.
```

---

## Phase 9 — Export Updated Files

Goal: generate updated flight book documents.

Tasks:

```text
Generate DOCX from approved version
Generate PDF from approved version
Include version metadata
Include change summary
Save export locally
Allow download
```

Deliverable:

```text
User can export updated flight books as DOCX/PDF.
```

---

## Phase 10 — Audit and Notifications

Goal: make the app operationally useful.

Tasks:

```text
Build local audit log
Build cloud audit log
Add notification table
Notify users about relevant updates
Notify reviewers about assigned amendments
Add review history
```

Deliverable:

```text
App tracks who did what and alerts users when action is needed.
```

---

## Phase 11 — Privacy Modes

Goal: support different school privacy needs.

Tasks:

```text
Add privacy mode setting
Implement controlled cloud AI mode
Show exactly what text will be sent
Add local-only mode placeholder
Add AI request log
```

Deliverable:

```text
User can control whether flight book snippets are sent to cloud AI.
```

---

## Phase 12 — Desktop App

Goal: create compliance-grade local storage.

Tasks:

```text
Wrap React app in Tauri
Add native SQLite database
Add local file access
Add encrypted local storage
Add auto-updater
Test Windows and macOS
```

Deliverable:

```text
Desktop app stores flight books in a real local SQLite database.
```

---

## Phase 13 — Optional MCP Server

Goal: expose app tools to AI assistants.

Possible MCP tools:

```text
get_latest_easa_updates()
search_easa_regulations()
list_local_flight_books()
find_affected_sections()
generate_proposed_amendment()
get_version_history()
rollback_to_version()
```

Important:

```text
MCP should be optional.
The core app should work without MCP.
MCP should never expose flight books without user approval.
```

---

## 33. API Endpoints

Suggested API routes:

```text
GET /api/easa/updates
GET /api/easa/updates/:id
GET /api/easa/search
POST /api/easa/refresh
POST /api/easa/classify
GET /api/notifications
POST /api/notifications/read
GET /api/profile
POST /api/profile/update
```

Local-only app functions:

```text
local.flightBooks.list()
local.flightBooks.upload()
local.flightBooks.parse()
local.flightBooks.search()
local.amendments.create()
local.amendments.approve()
local.versions.create()
local.versions.rollback()
local.exports.docx()
local.exports.pdf()
```

---

## 34. MVP Definition

The first useful MVP should include:

```text
Supabase Auth
EASA RSS feed ingestion
EASA update list
Local flight book upload
Local document parsing
Local search
Basic RAG comparison
Proposed amendment generation
Manual approval
Local version history
Rollback
DOCX export
```

Do not include in MVP:

```text
Full MCP integration
Mobile apps
Advanced OCR
Full local-only AI
Complex billing
Multi-language regulatory analysis
```

---

## 35. Testing Plan

### Unit tests

```text
RSS parser
Duplicate detection
Document parser
Section detector
Chunking
Local DB migrations
Version creation
Rollback creation
```

### Integration tests

```text
RSS update → Supabase record
Document upload → local chunks
EASA update → affected sections
Amendment approval → new version
Rollback → restored content
Export → valid file
```

### Manual compliance tests

```text
Check that flight books are not uploaded to Supabase
Check that service role key is not exposed
Check that old versions are immutable
Check that rollback creates a new version
Check that AI output requires human approval
```

---

## 36. Deployment Plan

### Web MVP

```text
Frontend:
Vercel

Backend:
Supabase

Cron / Workers:
Supabase Edge Functions or Trigger.dev

Database:
Supabase Postgres

Local storage:
PGlite / SQLite WASM / IndexedDB
```

### Desktop production

```text
Desktop:
Tauri

Cloud:
Supabase

Local database:
SQLite

Distribution:
Signed macOS and Windows builds
```

---

## 37. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| AI proposes incorrect amendment | Require human approval |
| Flight books accidentally uploaded | Keep local-only storage by default |
| Browser storage is cleared | Add local export/backup and desktop version |
| EASA source format changes | Build flexible parsers and manual override |
| Duplicate RSS items | Use content hashes and source URLs |
| Poor PDF extraction | Prefer DOCX uploads and add OCR later |
| Legal/compliance overclaiming | Use careful wording and audit logs |
| Local DB corruption | Add backup/export tools |
| User loses device | Optional encrypted backup later |

---

## 38. Build Order for a Novice Developer

Follow this exact order:

```text
1. Build login with Supabase Auth
2. Create dashboard shell
3. Create EASA feeds table
4. Add a test RSS feed manually
5. Build RSS fetch function
6. Show EASA updates in the UI
7. Add local database initialisation
8. Add flight book upload
9. Parse a DOCX file first
10. Split the document into sections
11. Store sections locally
12. Add local search
13. Add EASA update detail page
14. Compare one EASA update to one flight book
15. Show affected sections
16. Generate a proposed amendment
17. Add approve/reject buttons
18. Create new version after approval
19. Build Time Machine version list
20. Add rollback
21. Add DOCX export
22. Add PDF export
23. Add audit log
24. Add notifications
25. Add desktop/Tauri version
```

---

## 39. Practical MVP User Journey

```text
1. User signs in.
2. User sees dashboard.
3. App syncs latest EASA updates from Supabase.
4. User uploads flight book.
5. App parses flight book locally.
6. App creates local chunks and embeddings.
7. User selects an EASA update.
8. App compares update against local flight book.
9. App shows possibly affected sections.
10. App proposes amendment.
11. User reviews and edits.
12. User approves.
13. App creates new flight book version.
14. User exports updated DOCX/PDF.
15. User can roll back using Time Machine.
```

---

## 40. Final Recommended Build Strategy

Start with:

```text
Next.js
React
Tailwind
Supabase
PGlite or SQLite WASM
OpenAI API
DOCX parsing
Local version snapshots
```

Then move to:

```text
Tauri
SQLite
Encrypted local storage
PDF export
Advanced RAG
Optional MCP
Local-only AI mode
```

The strongest long-term product is a **hybrid local-first compliance platform**:

```text
Supabase for shared EASA intelligence.
Local database for private flight books.
RAG for comparison and amendment generation.
Human approval for safety.
Immutable versioning for rollback.
```

---

## 41. Definition of Done

The app is successful when:

```text
- EASA updates are detected automatically
- Flight books remain local
- Relevant sections are found accurately
- Proposed amendments are clearly explained
- Humans approve all changes
- Updated files can be exported
- Every version can be restored
- Every action is auditable
- Users never manually configure a local Supabase database
```
