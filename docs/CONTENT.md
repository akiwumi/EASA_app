# CONTENT.md — EASA Regulation Update & Flight-School Compliance App (Project Outline)

## 1) Purpose
Build a mobile-friendly web application that:
- **Checks for updates to EASA (European Union Aviation Safety Agency) regulatory content daily**
- **Compares** new/changed items against a flight school’s **internal “Flight Book” / regulatory library**
- **Proposes updates** and **explains why** each change matters
- Requires **human approval** before updates are merged into the school database
- Provides an Apple Time Machine–like **history + rollback** system for every change

Tech stack:
- **Frontend:** React + Tailwind
- **Backend:** Supabase (Postgres, Auth, RLS, Edge Functions, Storage, Cron/Scheduled jobs)

---

## 2) Primary Users & Roles
### Roles
1. **Admin (Flight School Compliance Manager)**
   - Manage school profile, sources, mappings, and approval rules
   - Approve/Reject updates
   - Roll back changes from history
2. **Editor (Operations/Chief Flight Instructor delegate)**
   - Review proposed changes and add notes
   - Request edits before approval
3. **Viewer (Read-only)**
   - View current flight books and the update history

### Core user goals
- “Show me what changed since yesterday.”
- “Explain what this change means for our SOP/Training Manual.”
- “Approve the safe ones, flag the uncertain ones.”
- “Undo what we approved last week.”

---

## 3) Scope: What the App Must Do
### A. Daily monitoring & capture
- Run a **daily scheduled job** that:
  - Pulls EASA updates from defined sources (HTML/PDF pages, decision/AMC/GM pages, etc.)
  - Stores a **snapshot** of the retrieved content (raw HTML/PDF + extracted text)
  - Detects **what changed** compared to prior snapshots (diff)

### B. Normalization & indexing
- Convert scraped documents into a normalized internal format:
  - Document → Sections/paragraphs → Clauses/rules → Metadata
- Track:
  - Document identifiers
  - Effective dates
  - Versioning and provenance (source URLs, scrape timestamps)

### C. Compare to the flight school’s database (“Flight Books”)
- Maintain a structured representation of each school document:
  - Manuals, SOPs, Training Syllabi, Checklists, Compliance matrices
- Map EASA clauses/sections to internal sections (manual page/section/paragraph)

### D. “Relevance” decision engine
For each detected EASA change:
- Determine if it is **relevant** to the flight school’s documents
- Classify it (e.g. “must update”, “likely update”, “watchlist”, “not relevant”)
- Generate a **proposed patch** to the school content with:
  - Summary of change
  - Rationale and risk level
  - Suggested edits (structured patch/diff)

### E. Approval & merge
- End user sees proposed updates in a queue
- User can:
  - Approve (merge into school database)
  - Reject (with reason)
  - Request revision / send back for refinement
- After approval:
  - Update is applied
  - A permanent audit entry is created
  - Notifications sent (email/in-app)

### F. Time Machine (history & rollback)
- Every change creates a **version snapshot**:
  - Before and after states
  - Who approved and when
  - Exact diff
- Admin can:
  - “Go back in time” to a date/version
  - Restore specific documents or individual sections
  - Compare any two versions

---

## 4) Non-Functional Requirements
### Security & compliance
- Supabase **Auth** for login
- **RLS** (Row Level Security) everywhere:
  - Strict tenant isolation (each school is a tenant)
- Full audit trail (immutable log table)
- Encryption at rest (handled by managed Supabase/Postgres) and TLS in transit
- Permissions by role (Admin/Editor/Viewer)

### Mobile-friendly UI
- Responsive layout (Tailwind)
- Touch-friendly diff viewer
- Performance: cache and paginate large docs

### Reliability & integrity
- Idempotent ingestion (re-running job doesn’t duplicate)
- Back-pressure and retry strategy for scraping failures
- Deterministic “apply patch” with validation and safe merges

---

## 5) High-Level Architecture
### Frontend (React + Tailwind)
- Supabase client for Auth + data reads/writes
- UI for reviewing and approving updates
- Time Machine interface for browsing history

### Backend (Supabase)
- **Postgres**: structured data + versioning
- **Edge Functions**:
  - Ingestion worker (scrape, parse, snapshot)
  - Diff worker (detect changes)
  - Relevance engine (rules + semantic matching + optional LLM)
  - Patch generator (create proposed updates)
  - Apply/rollback handlers (transactional)
- **Storage**:
  - Raw snapshots (PDF/HTML)
  - Extracted text + parsing artifacts (optional)

### Scheduled jobs
- Daily schedule triggers ingestion pipeline:
  1) fetch sources → 2) snapshot → 3) diff → 4) classify → 5) propose patches → 6) notify

---

## 6) Data Model (Conceptual)
### Tenancy
- `organizations` (flight schools)
- `org_users` (user ↔ org mapping, role)

### Source tracking (EASA)
- `sources` (URL, type: html/pdf/rss, scrape rules)
- `source_snapshots` (timestamp, hash, raw file ref, extracted text)
- `documents` (normalized document records)
- `document_sections` (section hierarchy with stable IDs)

### Flight school “Flight Books”
- `flightbooks` (manual types, owner org)
- `flightbook_sections` (hierarchy + content)
- `flightbook_mappings` (EASA section ↔ flightbook section links + confidence)

### Change & approval workflow
- `reg_changes` (what changed: before/after section hashes + diff summary)
- `proposed_updates` (patches, classification, rationale, confidence, risk)
- `approvals` (approve/reject, comments, approver, timestamp)

### Time Machine (versioning)
- `flightbook_versions` (snapshot pointers, created_by, created_at)
- `flightbook_section_versions` (per-section versioning for efficient rollback)
- `audit_log` (append-only: who did what, when, why)

---

## 7) Relevance & Patch Strategy
### Minimum viable relevance engine (Phase 1)
- Rule-based matching:
  - Keyword and phrase matching
  - Metadata filtering (aircrew, ops, training, licensing categories)
- Mapping UI to manually link EASA clauses to internal sections
- Confidence scoring:
  - High: direct mapping exists
  - Medium: keyword overlap and same topic group
  - Low: semantic similarity only

### Stronger relevance engine (Phase 2)
- Semantic indexing (pgvector):
  - Embed EASA sections and flightbook sections
  - Similarity search to propose likely mappings
- Optional AI/LLM assist:
  - Generate rationale and suggested edits
  - Always keep a “human-in-the-loop” gate (approval required)

### Patch application (safety-first)
- Store patches as structured diffs (insert/replace/delete operations)
- Validate patches against current content before applying
- Apply within a single DB transaction:
  - If conflict detected (content changed since patch created), require re-review

---

## 8) Key Screens / UX Flow
### 1) Login
- Email + password (or SSO later)
- Organization selection if user belongs to multiple orgs

### 2) Dashboard
- “Latest EASA updates” summary
- Counts: new changes, pending approvals, approved this week
- Health: last successful scrape time, source errors

### 3) Update Review Queue
- Filter by: risk, confidence, document type, date
- Open an item to see:
  - EASA diff (before/after)
  - Suggested flightbook edits
  - Rationale + impact summary
  - Confidence/risk badges

### 4) Diff Viewer (mobile friendly)
- Toggle: side-by-side vs inline diff
- Jump-to anchors for sections
- Quick actions: Approve / Reject / Request revision

### 5) Flight Book Viewer / Editor
- View current manual
- See “regulation links” and mapping status
- Manual override edits (optional, permissioned)

### 6) Time Machine
- Timeline (by day/week/month)
- Select a point in time → preview what changes would revert
- Restore:
  - Entire flight book
  - Specific sections
  - Only changes from a selected approval batch

### 7) Settings (Admin)
- Manage sources and scrape frequency
- Define risk thresholds and review rules
- Manage users/roles and notifications

---

## 9) Operational Concerns
### Observability
- Central “pipeline run” table:
  - start/end time, status, errors, items processed
- Alerts:
  - Scrape failures
  - Unusually large change sets
  - Patch conflicts

### Performance
- Paginate large documents and diffs
- Cache “latest dashboard” stats
- Store normalized sections to avoid re-parsing on every view

### Governance
- Document retention policy for snapshots
- “Explainability” requirement: each proposed update must include a clear rationale

---

## 10) Delivery Plan (Milestones)
### Phase 0 — Discovery & setup (1–2 weeks)
- Confirm EASA sources, document types, and update cadence
- Define flight school data model for flightbooks
- Confirm approval workflow and roles

### Phase 1 — MVP (4–8 weeks)
- Auth + org tenancy + basic UI
- Daily ingestion + snapshot + simple diff detection
- Manual mapping between EASA sections and flightbook sections
- Proposed updates queue + approvals
- Version snapshots + basic rollback

### Phase 2 — Automation & quality (4–8 weeks)
- Improved parsing + normalization
- Semantic similarity suggestions (pgvector)
- Better diffs + conflict handling
- Notifications and reporting

### Phase 3 — Product-grade (ongoing)
- Multi-source coverage
- SSO, advanced roles
- Export reports (PDF/CSV)
- Compliance dashboards and scheduled summaries

---

## 11) Key Risks & Mitigations
- **Source format variability (PDF/HTML changes):**
  - Keep scraping modular per source
  - Store raw snapshots for forensic checks
- **False positives/negatives in relevance:**
  - Use confidence scoring + require human approval
  - Let admins tune rules and mappings
- **Unsafe automatic edits:**
  - Use structured patches, validation, and conflicts requiring re-review
- **Tenant data leakage risk:**
  - Enforce RLS and minimal privileges
  - Log all privileged actions

---

## 12) Definition of Done (MVP)
- Daily pipeline runs successfully and records snapshots + diffs
- Users can log in, view pending updates, and approve/reject
- Approved updates merge into flightbook sections and create history entries
- Admin can roll back to any prior version from the Time Machine screen
- App works smoothly on mobile screens
