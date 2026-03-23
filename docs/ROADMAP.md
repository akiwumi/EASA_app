# EASA Regulation Compliance App — Comprehensive Build Roadmap

> **Last updated:** 2026-03-23
> **Organisation:** South Sweden Aviation (Flight School)
> **Stack:** Next.js 16 + React 19, Tailwind CSS v4, Supabase (Postgres + Auth + RLS + Edge Functions + Storage + Cron)

---

## 1. What We Have Today

The initial scaffolding is live on the `main` branch. The following pieces are already built:

| Layer | What exists |
|-------|-------------|
| **Frontend** | Next.js 16 app with Tailwind v4; design tokens in `globals.css`; dashboard UI (static mock data); results page (reads from Supabase); login page; middleware auth guard |
| **Backend schema** | `organizations`, `org_users`, `sources`, `rss_items`, `ai_findings`, `permissions`, `role_permissions`, `schedules` |
| **Edge Functions** | `rss-ingest` (fetches EASA RSS feeds → upserts `rss_items`); `ai-analyze` (heuristic + optional OpenAI → writes `ai_findings`) |
| **Seed data** | Demo org + 3 EASA RSS source URLs |
| **Roles** | `admin`, `editor`, `viewer` with permission codes in DB |
| **Design system** | Documented in `docs/DESIGN_SYS.md`; token naming convention `--easa-*` |
| **Docs** | `CONTENT.md` (product scope), `DESIGN_SYS.md`, `SYSTEM.md` (file layout) |
| **Source materials** | EASA Regulation Update Status List (PDF); ATPL flight books A, B, C, D, F, TM (Word docs) |

**What the app does NOT yet do (the gap):** real regulation scraping beyond RSS, document diffing, flight-book database with the ATPL content, AI text generation, meaningful approval workflow, user profiles with notes, notifications, export to PDF/DOCX, and configurable schedules.

---

## 2. Source Materials Inventory

### 2a. EASA Regulations (regulations to track)

From the **EASA Regulations Update Status List** (auto-created 2025-12-12), the relevant regulation families are:

| Family | Key regulation | Relevance to flight school |
|--------|---------------|---------------------------|
| **Part-FCL** | Reg (EU) No 1178/2011 + amendments through 2025-02-05 | Pilot licensing, CPL, ratings |
| **Part-MED** | AMC/GM Issue 2, Amendment 1 (2025-02-05) | Medical certificates |
| **Part-ORA** | AMC/GM Issue 1, Amendment 8 (2025-02-05) | Approved Training Organisations |
| **Part-ARA** | AMC/GM Issue 1, Amendment 13 (2025-02-05) | Authority requirements for aircrew |
| **Part-DTO** | AMC/GM Issue 1, Amendment 2 (2025-02-05) | Declared Training Organisations |
| **Part-ORO** | AMC/GM Issue 2, Amendment 29 (2025-12-05) | Organisation requirements (ops) |
| **Part-CAT** | AMC/GM Issue 2, Amendment 25 (2025-07-07) | Commercial air transport |
| **Part-NCC** | AMC/GM Issue 1, Amendment 19 (2023-06-28) | Non-commercial complex aircraft |
| **Part-NCO** | AMC/GM Issue 2, Amendment 16 (2023-06-28) | Non-commercial other aircraft |
| **CS-FSTD(A)** | Issue 2 (2018-05-03) | Simulator certification |
| **CS-FTL.1** | Issue 1, Amendment 1 (2023-12-19) | Flight time limitations |
| **SES** | Reg (EU) 2024/2803 (2024-11-11) | Single European Sky |

Primary web source: **https://www.easa.europa.eu/en/regulations**

### 2b. Flight Books (internal documents to keep compliant)

| File | Content | EASA link |
|------|---------|-----------|
| `App ATPL A – Student progress KSA Rev 3.doc` | Student progress tracking form | Part-FCL, Part-ORA |
| `App ATPL B ALL SUBJECTS KSA Rev 1.0.docx` | Full-subject KSA (Knowledge, Skills, Attitudes) matrix | Part-FCL, Part-ORA |
| `App ATPL C KSA Rev 1.0.doc` | KSA competency document | Part-FCL |
| `App ATPL D KSA Rev 1.0.docx` | Classroom training phases + ATPL syllabus (010 Air Law, Part-FCL, Part-MED…) | Part-FCL, Part-ORA |
| `App ATPL F – KSA 100 examples Rev 1.0.docx` | Competency-based training examples (FNTP, comm, mental maths, scenario exercises) | Part-FCL KSA area 100 |
| `TM ATPL Theory EASA KSA Rev 1.doc` | Theory Manual — EASA ATPL theory training programme | Part-FCL, Part-ORA |

These six documents form the **initial flight-book database** that all regulation changes will be compared against.

---

## 3. Target Feature Set

1. **Multi-source EASA scraping** — RSS feeds already wired; add HTML/PDF scraping of the regulations page and individual part pages on a configurable schedule (N times per day, set per-org in Settings)
2. **Flight Book database** — Import all ATPL documents into structured, searchable sections; version-controlled
3. **Diff engine** — Detect what changed in a regulation compared to the last snapshot
4. **Relevance / impact analysis** — AI maps each regulation change to one or more flight book sections; classifies as Must Update / Likely / Watchlist / Not Relevant
5. **AI text generation** — For each relevant change, AI drafts the exact replacement text that can be pasted into the manual
6. **Change list compilation** — Aggregated list of all changes that affect this organisation, filterable by document, section, risk
7. **User profiles** — Each user has login + password, display name, role; can write notes on any change item; notes are visible to everyone in the organisation
8. **Approval workflow** — Configurable: manual (admin must approve every change) or semi-automated (auto-approve Low risk items, require admin sign-off for Medium/High); only admins can make final approval
9. **Notifications** — In-app + email notifications sent to all users when a new update is detected; notification before any automated or manual approval is applied
10. **Configurable scrape schedule** — Settings panel lets admin choose 1–4 scrapes per day and set preferred UTC times
11. **Export** — Any change item, section, or full document can be exported as PDF or DOCX with one click
12. **Time Machine** — Full version history of every flight-book section; restore individual sections or entire documents

---

## 4. Technical Architecture (Target State)

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                    │
│  Auth → Dashboard → Update Queue → Diff Viewer          │
│  Flight Book Viewer → Time Machine → Settings → Export  │
└───────────────────────────┬─────────────────────────────┘
                            │ Supabase JS client
┌───────────────────────────▼─────────────────────────────┐
│                   SUPABASE BACKEND                       │
│                                                          │
│  Auth + RLS  ←→  Postgres (schema below)                │
│                                                          │
│  Edge Functions (Deno):                                  │
│   ├─ rss-ingest          (exists — extend)              │
│   ├─ html-scrape         (new) scrapes EASA reg pages   │
│   ├─ pdf-parse           (new) extracts text from PDFs  │
│   ├─ diff-worker         (new) compares snapshots       │
│   ├─ relevance-engine    (new) AI + keyword matching    │
│   ├─ patch-generator     (new) AI drafts manual text    │
│   ├─ apply-update        (new) transactional apply      │
│   ├─ rollback            (new) revert to prior version  │
│   └─ notifications       (new) email + in-app alerts    │
│                                                          │
│  Storage buckets:                                        │
│   ├─ snapshots/          raw HTML/PDF captures          │
│   ├─ flightbooks/        uploaded source documents      │
│   └─ exports/            generated PDF/DOCX output      │
│                                                          │
│  Cron jobs (pg_cron / Supabase Scheduled Functions):     │
│   └─ pipeline trigger    N times/day per org schedule   │
└─────────────────────────────────────────────────────────┘
```

### AI Integration

- **Primary AI:** Claude API (claude-sonnet-4-6) via Anthropic SDK in Edge Functions
  - Relevance analysis: "Does this regulation change affect section X of our manual?"
  - Patch drafting: "Write the updated text for section X to comply with this change"
- **Fallback / cost control:** keyword/heuristic analysis when AI budget is exceeded
- **Embeddings (Phase 2):** pgvector for semantic section matching

---

## 5. Extended Database Schema

> Additions to the existing schema in `supabase/migrations/schema/`

### Migration 003 — Flight Books

```sql
-- Uploaded source documents (Word/PDF)
create table flightbooks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,                   -- e.g. "ATPL D Classroom Training"
  doc_type text not null,               -- training_manual | sop | checklist | ksa | syllabus
  file_ref text,                        -- Supabase Storage path
  version_label text,                   -- e.g. "Rev 1.0"
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Parsed sections of each flight book (hierarchical)
create table flightbook_sections (
  id uuid primary key default gen_random_uuid(),
  flightbook_id uuid references flightbooks(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  parent_id uuid references flightbook_sections(id),  -- for nesting
  section_number text,               -- e.g. "010.04.02.01"
  title text,
  body text not null,
  embedding vector(1536),            -- pgvector (Phase 2)
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Mapping: EASA source section ↔ flightbook section
create table flightbook_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  easa_section_id uuid references document_sections(id),
  flightbook_section_id uuid references flightbook_sections(id),
  confidence text not null default 'medium',  -- high | medium | low
  match_type text not null default 'manual',  -- manual | keyword | semantic
  created_at timestamptz not null default now()
);
```

### Migration 004 — Regulation Documents & Diff

```sql
-- Normalized EASA regulation documents (beyond RSS items)
create table reg_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  source_id uuid references sources(id),
  title text not null,
  reg_number text,                    -- e.g. "EU No 1178/2011"
  part text,                          -- e.g. "Part-FCL"
  url text,
  effective_date date,
  created_at timestamptz not null default now()
);

-- Snapshots of scraped content
create table source_snapshots (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references sources(id) on delete cascade,
  scraped_at timestamptz not null default now(),
  content_hash text not null,
  raw_storage_path text,              -- Storage bucket path
  extracted_text text,
  status text not null default 'pending'  -- pending | parsed | error
);

-- Sections parsed from snapshots
create table document_sections (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid references source_snapshots(id),
  organization_id uuid references organizations(id),
  section_number text,
  title text,
  body text not null,
  sort_order int not null default 0
);

-- Detected changes between two snapshots
create table reg_changes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  source_id uuid references sources(id),
  reg_document_id uuid references reg_documents(id),
  old_snapshot_id uuid references source_snapshots(id),
  new_snapshot_id uuid references source_snapshots(id),
  section_ref text,
  change_type text not null,          -- added | modified | deleted
  diff_text text,                     -- unified diff or JSON patch
  detected_at timestamptz not null default now()
);
```

### Migration 005 — Proposed Updates & Approvals

```sql
-- AI-proposed manual updates
create table proposed_updates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  reg_change_id uuid references reg_changes(id),
  flightbook_section_id uuid references flightbook_sections(id),
  classification text not null,      -- must_update | likely | watchlist | not_relevant
  risk_level text not null,          -- high | medium | low
  ai_rationale text,
  ai_suggested_text text,            -- text to paste into the manual
  confidence_score numeric(4,2),
  status text not null default 'pending',  -- pending | approved | rejected | revision_requested
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Approval records
create table approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  proposed_update_id uuid references proposed_updates(id),
  action text not null,              -- approved | rejected | revision_requested
  approver_id uuid references auth.users(id),
  comment text,
  decided_at timestamptz not null default now()
);
```

### Migration 006 — User Notes & Profiles

```sql
-- Extended user profiles
create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  notification_email boolean not null default true,
  notification_inapp boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- User notes on proposed updates (visible to all org members)
create table update_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  proposed_update_id uuid references proposed_updates(id),
  author_id uuid references auth.users(id),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### Migration 007 — Version History (Time Machine)

```sql
-- Full snapshots of flight book sections for rollback
create table flightbook_section_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  flightbook_section_id uuid references flightbook_sections(id),
  body text not null,
  version_number int not null,
  created_by uuid references auth.users(id),
  approval_id uuid references approvals(id),
  created_at timestamptz not null default now()
);

-- Immutable audit log
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- Notifications
create table notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  type text not null,                -- new_update | approval_needed | approved | rejected | rollback
  title text not null,
  body text,
  related_entity_type text,
  related_entity_id uuid,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
```

### Settings Extension (Migration 008)

```sql
-- Extend schedules table
alter table schedules add column if not exists runs_per_day int not null default 1;
alter table schedules add column if not exists run_times_utc time[] not null default array['06:00'::time];
alter table schedules add column if not exists auto_approve_low_risk boolean not null default false;
alter table schedules add column if not exists notify_on_detect boolean not null default true;
alter table schedules add column if not exists export_format text not null default 'pdf';  -- pdf | docx | both
```

---

## 6. Edge Functions to Build

| Function | Trigger | Description |
|----------|---------|-------------|
| `rss-ingest` | Cron / manual | **Exists** — extend to support org-specific schedules |
| `html-scrape` | Cron / manual | Fetches EASA regulation HTML pages; computes content hash; stores snapshot in Storage |
| `pdf-parse` | Storage trigger | Triggered when new PDF lands in `snapshots/`; extracts text via Deno PDF lib; writes `document_sections` |
| `diff-worker` | After ingestion | Compares new snapshot text to prior; creates `reg_changes` records; uses unified diff algorithm |
| `relevance-engine` | After diff | Calls Claude API to classify each change against mapped flight book sections; writes `proposed_updates` |
| `patch-generator` | After relevance | Calls Claude API to draft suggested replacement text; updates `proposed_updates.ai_suggested_text` |
| `apply-update` | Manual trigger (approval) | Transactional: updates `flightbook_sections.body`; creates `flightbook_section_versions`; writes `audit_log` |
| `rollback` | Manual trigger (admin) | Restores a prior `flightbook_section_versions` record; creates `audit_log` entry |
| `notifications` | DB trigger / after apply | Sends in-app `notifications` records + emails via Supabase Auth email / Resend |

### Pipeline Order (per scheduled run)

```
1. html-scrape   → fetches pages, stores raw snapshots
2. pdf-parse     → extracts text from any new PDF snapshots
3. rss-ingest    → processes RSS feeds in parallel
4. diff-worker   → compares all new snapshots to previous
5. relevance-engine → AI classifies changes
6. patch-generator  → AI drafts suggested manual text
7. notifications    → alerts all org users of new items
```

---

## 7. New Frontend Screens

### Screens to build (beyond what exists)

| Screen | Route | Key features |
|--------|-------|-------------|
| **Login / Register** | `/login` | Exists — add "forgot password" and user profile setup on first login |
| **Dashboard** | `/dashboard` | Exists as mock — wire to real Supabase data |
| **Update Queue** | `/updates` | Filterable list of `proposed_updates`; risk/confidence badges; open → Diff Viewer |
| **Diff Viewer** | `/updates/[id]` | Side-by-side EASA diff + proposed manual patch; user notes thread; Approve / Reject / Request Revision buttons |
| **Flight Book Viewer** | `/flightbooks` | Browse imported ATPL documents by section; see "linked regulations"; see pending updates per section |
| **Flight Book Upload** | `/flightbooks/upload` | Admin uploads a Word/PDF; triggers `pdf-parse`; confirms section structure |
| **Time Machine** | `/history` | Timeline view; select date → preview state; restore section or whole document |
| **Change List** | `/changes` | Aggregated list of all reg changes affecting this org; CSV/PDF export |
| **Settings** | `/settings` | Scrape schedule (runs/day, times); approval mode; notification prefs; user management |
| **User Profile** | `/profile` | Display name, avatar, notification preferences |
| **Notifications** | `/notifications` (panel) | In-app notification bell + drawer |

### Export Feature (all screens)

Every list view and document view will have an **Export** button offering:
- **PDF** — rendered via Supabase Edge Function using a headless rendering approach (or `jsPDF` in-browser)
- **DOCX** — generated via `docx` npm library in an Edge Function; returns the file for download

---

## 8. AI Integration Detail

### Relevance Engine prompt (per change)

```
You are a flight school compliance analyst. Here is an EASA regulatory change:

REGULATION: {reg_number} — {part} — {section_ref}
CHANGE TYPE: {change_type}
BEFORE: {old_text}
AFTER: {new_text}

Here are our internal flight book sections that may be affected:
{list of flightbook_sections with section_number and body}

For each section, classify relevance as one of:
- must_update: regulation requires a change to our text
- likely: text probably needs updating
- watchlist: monitor but no immediate action
- not_relevant: this change does not affect this section

For each "must_update" or "likely" section, draft the exact replacement text.
Return a JSON array.
```

### Patch Generator prompt (per proposed_update)

```
You are a flight school compliance writer. Update the following section of our
training manual to comply with the new regulation text below.

CURRENT SECTION ({section_number} — {title}):
{current_body}

REGULATION CHANGE ({reg_number}):
{diff_text}

RATIONALE: {ai_rationale}

Write the updated section text. Match the existing writing style and structure.
Do not add legal interpretation; only reflect what the regulation requires.
Output only the updated section text, no commentary.
```

### Switching from OpenAI to Claude

The existing `ai-analyze` function uses OpenAI. All new AI functions will use the **Claude API** (Anthropic SDK for Deno):

```typescript
// In Edge Functions
import Anthropic from "npm:@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
const message = await anthropic.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 4096,
  messages: [{ role: "user", content: prompt }],
});
```

---

## 9. Flight Book Import Strategy

The six ATPL documents will be imported as the initial flight-book database. The import runs once manually (admin action), then stays updated via the approval workflow.

### Import steps

1. **Upload** — Admin uploads each `.doc` / `.docx` / PDF to `flightbooks/` Storage bucket via the Flight Book Upload screen
2. **Parse** — `pdf-parse` Edge Function extracts text; for `.docx`, use the `docx` npm library or LibreOffice conversion; write `flightbook_sections` rows
3. **Structure** — Section numbers (e.g., `010.04.02.01`) are parsed from headings; hierarchical `parent_id` is inferred from numbering depth
4. **Map** — Admin (or AI) links sections to EASA regulation parts:
   - ATPL D section `010.04.02` → Part-FCL AMC/GM
   - ATPL D section `010.04.03` → Part-MED AMC/GM
   - ATPL F area `100` → Part-FCL KSA area 100
   - TM Theory → Part-FCL + Part-ORA

### Seed mappings to pre-populate

| Flight book section | EASA regulation |
|--------------------|----------------|
| ATPL D — Air Law (010.01–010.06) | Part-FCL + ICAO Annex 2 / SERA |
| ATPL D — Personnel Licensing (010.04) | Part-FCL (Reg 1178/2011) + Part-MED |
| ATPL D — Aircraft Operations (010.06) | Part-CAT, Part-NCC, Part-NCO |
| ATPL A — Student Progress | Part-ORA (ATO requirements) |
| ATPL B — All Subjects KSA | Part-FCL Subpart FCL.725 |
| ATPL F — KSA Area 100 | Part-FCL Appendix 3 (CBT) |
| TM Theory Manual | Part-FCL + Part-ORA + CS-FSTD(A) |

---

## 10. Implementation Phases

### Phase 0 — Foundation & Data (Weeks 1–2) ✅ Partially done

**Goal:** All data structures in place; ATPL books imported; EASA sources confirmed.

- [x] Supabase project + auth + RLS base schema
- [x] Organizations, org_users, sources, rss_items, ai_findings
- [x] RSS ingest Edge Function
- [x] Basic AI analysis Edge Function
- [x] Dashboard UI scaffold
- [ ] Run migrations 003–008 (flight books, reg docs, proposed updates, notes, history, settings)
- [ ] Import all 6 ATPL documents into `flightbooks` + `flightbook_sections`
- [ ] Seed `flightbook_mappings` with the known EASA section links
- [ ] Extend `sources` with HTML scrape targets for each EASA regulation part page
- [ ] Create `user_profiles` for existing org users
- [ ] Wire dashboard stats to real Supabase queries (replace mock data)

**Deliverable:** Real data in DB; dashboard shows live numbers.

---

### Phase 1 — Core Pipeline (Weeks 3–6)

**Goal:** The daily regulation monitoring pipeline runs end-to-end automatically.

- [ ] **`html-scrape` Edge Function**
  - Fetch EASA regulation HTML pages (Part-FCL, Part-MED, Part-ORA, Part-DTO, Part-ORO, Part-CAT, Part-NCC, Part-NCO, Part-SPA, CS-FSTD(A), CS-FTL.1)
  - Compute SHA-256 hash of extracted text; skip if unchanged
  - Store raw HTML in `snapshots/` Storage
  - Write `source_snapshots` record
- [ ] **`pdf-parse` Edge Function**
  - Trigger on new PDFs in `snapshots/` Storage
  - Extract text sections; write `document_sections`
- [ ] **`diff-worker` Edge Function**
  - Compare new `extracted_text` to previous snapshot
  - Produce unified diff; write `reg_changes` rows
  - Detect: added paragraphs, modified paragraphs, deleted paragraphs
- [ ] **Cron schedule wiring**
  - Read org `schedules.run_times_utc` + `runs_per_day`
  - Trigger pipeline accordingly (Supabase pg_cron or Scheduled Edge Functions)
- [ ] **Pipeline status UI**
  - Dashboard "Pipeline" card shows real step statuses from a `pipeline_runs` table

**Deliverable:** Reg changes detected automatically; stored in DB daily.

---

### Phase 2 — AI Analysis & Proposed Updates (Weeks 7–10)

**Goal:** For every detected change, AI classifies relevance and drafts manual text.

- [ ] **`relevance-engine` Edge Function** (Claude API)
  - For each new `reg_change`, fetch mapped `flightbook_sections`
  - Run classification prompt; write `proposed_updates` rows
  - Handle fallback to keyword matching if API unavailable
- [ ] **`patch-generator` Edge Function** (Claude API)
  - For each `must_update` / `likely` proposed_update, generate `ai_suggested_text`
  - Store in `proposed_updates.ai_suggested_text`
- [ ] **Switch `ai-analyze` from OpenAI to Claude** (consistency)
- [ ] **Update Queue screen** (`/updates`)
  - Live data from `proposed_updates` join `reg_changes`
  - Filters: risk level, classification, document, date range
  - Sorting: newest, highest risk first
- [ ] **Change List screen** (`/changes`)
  - All `reg_changes` for the org grouped by regulation part
  - Exportable as PDF or DOCX

**Deliverable:** Admin can see every change, what it affects, and read the AI-drafted replacement text.

---

### Phase 3 — Approval Workflow & Notes (Weeks 11–13)

**Goal:** Users can review, annotate, and approve/reject each proposed update.

- [ ] **Diff Viewer screen** (`/updates/[id]`)
  - Two-panel layout: EASA diff (before/after) on left, proposed manual patch on right
  - Inline/side-by-side toggle
  - Action buttons: Approve / Reject / Request Revision (admin-only for final approval)
  - Confidence/risk badges
- [ ] **User notes** (all users can write; all can read)
  - Notes thread beneath each proposed update
  - Stored in `update_notes`; real-time refresh via Supabase Realtime
- [ ] **Approval backend** (`apply-update` Edge Function)
  - Transaction: update `flightbook_sections.body`, create `flightbook_section_versions`, write `audit_log`, update `proposed_updates.status`
  - Validate: reject if section content changed since patch was generated (conflict detection)
- [ ] **Auto-approve setting**
  - If `schedules.auto_approve_low_risk = true`, auto-apply Low risk items after N hours
  - Notify users before applying (configurable lead time)
- [ ] **Reject / Request Revision flow**
  - On reject: mark `proposed_updates.status = rejected`; write reason to `approvals`
  - On revision: re-run patch-generator with user's comment as context

**Deliverable:** Full review-and-approve loop works; changes are applied to flight book DB.

---

### Phase 4 — Notifications & User Profiles (Weeks 14–15)

**Goal:** Everyone is informed in real time; users can personalise their experience.

- [ ] **`notifications` Edge Function**
  - Triggered after `diff-worker` creates new `reg_changes`
  - Creates `notifications` rows for all org users
  - Sends email via Supabase Auth email or Resend API
- [ ] **In-app notification bell**
  - Bell icon in nav with unread count
  - Drawer listing `notifications` ordered by newest
  - Mark as read (single / all)
- [ ] **User Profile screen** (`/profile`)
  - Display name, avatar upload
  - Notification preferences: email on / off, in-app on / off
  - Notification frequency: immediate | daily digest
- [ ] **Settings — user management** (admin only)
  - Invite users by email
  - Change roles (admin / editor / viewer)
  - Deactivate users

**Deliverable:** All users get notified of changes; profiles are personalised.

---

### Phase 5 — Flight Book Viewer & Time Machine (Weeks 16–18)

**Goal:** Users can browse manuals and the admin can roll back any change.

- [ ] **Flight Book Viewer** (`/flightbooks`)
  - Hierarchical section tree (matches ATPL document structure)
  - Each section shows:
    - Current text
    - "Linked regulation" chips (Part-FCL, Part-MED, etc.)
    - "Pending update" badge if a proposed_update is in queue
    - Version history button
- [ ] **Flight Book Upload** (`/flightbooks/upload`)
  - Drag-and-drop Word/PDF upload
  - Shows parsing progress (sections detected)
  - Admin confirms section structure before saving
- [ ] **Time Machine** (`/history`)
  - Timeline chart of approvals (day/week/month view)
  - Select any date → preview what the flight book looked like then
  - Restore buttons: entire document, single section, batch (by approval)
  - Rollback triggers `rollback` Edge Function + `audit_log` entry
- [ ] **`rollback` Edge Function**
  - Restores `flightbook_sections.body` from specified `flightbook_section_versions`
  - Creates an `audit_log` record with who, when, why
  - Sends notification to all org users

**Deliverable:** Complete history and rollback capability; manual browsing with compliance links visible.

---

### Phase 6 — Export & Polish (Weeks 19–20)

**Goal:** Export any content to PDF or DOCX; app is production-ready.

- [ ] **Export Edge Function**
  - Input: `{ type: "section" | "document" | "change_list" | "update_queue", id, format: "pdf" | "docx" }`
  - PDF: use `jsPDF` or `puppeteer` (Deno) to render styled output
  - DOCX: use `docx` npm package with EASA brand styling
  - Returns signed Storage URL for download
- [ ] **Export buttons** on all screens
  - Update Queue → Export change list (PDF/DOCX)
  - Flight Book Viewer → Export section or full document
  - Diff Viewer → Export this change item with notes + approval trail
  - Change List → Export full compliance report
- [ ] **Settings — Scrape schedule** (full UI)
  - Slider: 1–4 runs per day
  - Time picker for each run (UTC)
  - Toggle: auto-approve low risk
  - Toggle: notify before auto-approve + lead time (hours)
- [ ] **Dark mode** toggle (design system already supports both themes)
- [ ] **Mobile optimisation pass**
  - Bottom navigation for mobile
  - Touch-friendly diff viewer (swipe left/right for inline/side-by-side)
  - Collapsible sections for small screens
- [ ] **Performance**
  - Paginate large document/diff lists
  - Cache dashboard stats (Supabase function with 5-minute TTL)
  - Lazy-load flight book sections

**Deliverable:** App is production-ready and fully responsive.

---

### Phase 7 — Hardening & Multi-tenant (Post-launch)

- [ ] Multi-org support (each flight school is a separate tenant, strict RLS isolation)
- [ ] SSO (SAML / Google via Supabase Auth providers)
- [ ] Audit log export (compliance report for CAA / authority audits)
- [ ] Scheduled compliance summary email (weekly digest for admin)
- [ ] pgvector semantic matching for more accurate section linking (Phase 2 relevance engine)
- [ ] Source expansion: additional EASA document families as regulation evolves
- [ ] API for third-party integration (LMS, document management systems)

---

## 11. Roles & Permissions Summary

| Permission | Admin | Editor | Viewer |
|-----------|-------|--------|--------|
| View updates / changes | ✅ | ✅ | ✅ |
| Write notes on changes | ✅ | ✅ | ✅ |
| Request revision | ✅ | ✅ | ❌ |
| **Final approve / reject** | **✅** | **❌** | **❌** |
| Run scrape pipeline manually | ✅ | ✅ | ❌ |
| Rollback changes | ✅ | ❌ | ❌ |
| Manage sources & schedule | ✅ | ❌ | ❌ |
| Manage users & roles | ✅ | ❌ | ❌ |
| Upload flight books | ✅ | ❌ | ❌ |
| Export (PDF/DOCX) | ✅ | ✅ | ✅ |

---

## 12. Environment Variables Required

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
ANTHROPIC_API_KEY=          # primary (new functions)
OPENAI_API_KEY=              # legacy (ai-analyze function, optional)

# Email (pick one)
RESEND_API_KEY=              # recommended for transactional email
# OR use Supabase built-in SMTP

# Scraping
EASA_RSS_FEEDS=              # comma-separated RSS URLs (has defaults)
EASA_HTML_SOURCES=           # comma-separated HTML regulation URLs
```

---

## 13. Key Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| EASA website structure changes break scraper | Modular per-source scrapers; raw snapshot stored for forensic check; scrape failures surfaced in dashboard |
| AI generates incorrect manual text | Text is always a *suggestion*; admin must approve before applying; keep original text visible |
| Approved change conflicts with manual edit | Conflict detection before apply; require re-review if mismatch |
| Token cost for large regulation documents | Chunk large documents; cache embeddings; fallback to keyword heuristics |
| Tenant data leakage | RLS on every table; `organization_id` on all rows; service role key only used in Edge Functions |
| `.doc` files (legacy Word format) | Convert to `.docx` via LibreOffice before parsing; LibreOffice runs in Supabase Edge Function container |
| Regulations PDF format changes | Store raw PDF in Storage; re-parse on demand; human review for structural changes |

---

## 14. Definition of Done (Full Scope)

- [ ] Daily pipeline runs, detects EASA changes, maps to ATPL flight book sections
- [ ] AI generates compliant replacement text for each affected section
- [ ] All users notified before any change is applied
- [ ] Only admins can give final approval; editors and viewers can annotate
- [ ] Approved changes update the flight book database transactionally
- [ ] Admin can roll back any section to any prior version
- [ ] Configurable scrape schedule (1–4×/day) and approval preferences
- [ ] PDF and DOCX export of any section, document, or change report
- [ ] App works on mobile; all user profiles personalised
- [ ] Full audit trail; immutable log of every approval and rollback
- [ ] All 6 ATPL documents imported and linked to EASA regulation families

---

## 15. Immediate Next Steps (Start Here)

1. **Run migration 003–008** — extend the schema for flight books, reg docs, notes, history
2. **Import ATPL documents** — write a one-time script to parse and import all 6 Word/doc files into `flightbooks` + `flightbook_sections`
3. **Seed EASA HTML sources** — add Part-FCL, Part-MED, Part-ORA, Part-ORO, Part-CAT page URLs to `sources` with `type = 'html'`
4. **Build `html-scrape` Edge Function** — start with Part-FCL as the proof-of-concept; verify snapshot storage and diff detection
5. **Wire dashboard to real data** — replace all static mock data in `dashboard/page.tsx` with live Supabase queries
6. **Build Update Queue screen** — this is the core daily-use screen for all users
