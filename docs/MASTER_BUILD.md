# EASA Regulation Compliance App — Master Build Document

> **Authority:** This document supersedes `CONTENT.md`, `SYSTEM.md`, and `ROADMAP.md` as the single source of truth for design, architecture, and implementation.
> **Last updated:** 2026-03-23
> **Organisation:** South Sweden Aviation
> **Status:** Active development — initial scaffolding complete

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Technology Stack](#2-technology-stack)
3. [Design System](#3-design-system)
4. [User Roles & Permissions](#4-user-roles--permissions)
5. [Complete Feature Set](#5-complete-feature-set)
6. [Architecture](#6-architecture)
7. [File Structure](#7-file-structure)
8. [Data Model](#8-data-model)
9. [Edge Functions & Backend Pipeline](#9-edge-functions--backend-pipeline)
10. [AI Integration](#10-ai-integration)
11. [Screen Inventory](#11-screen-inventory)
12. [Implementation Phases](#12-implementation-phases)
13. [Environment Variables](#13-environment-variables)
14. [Risks & Mitigations](#14-risks--mitigations)
15. [Definition of Done](#15-definition-of-done)

---

## 1. Product Vision

A **modern, mobile-friendly web application** that allows a flight school to stay continuously compliant with EASA (European Union Aviation Safety Agency) regulatory changes — automatically, intelligently, and with full human oversight.

### What the app does

1. **Monitors** EASA regulation sources on a configurable schedule (RSS feeds, HTML regulation pages, PDFs)
2. **Detects** what changed compared to prior snapshots using structural diffing
3. **Compares** those changes against the school's internal flight books (training manuals, SOPs, syllabi, KSA matrices)
4. **Compiles** a prioritised list of changes that affect the organisation
5. **Generates** AI-drafted replacement text that can be reviewed and pasted directly into the relevant manual section
6. **Notifies** all users when new updates are detected — before any changes are applied
7. **Manages** an approval workflow where editors annotate and admins give final sign-off
8. **Tracks** the full version history of every manual section with rollback capability
9. **Exports** any section, document, or compliance report to PDF or DOCX

### Core user goals

- *"Show me what changed since yesterday."*
- *"Explain what this means for our training manual."*
- *"Give me the text to paste in — I'll approve it."*
- *"Undo the change we approved last week."*

### Source materials (flight books to manage)

| Document | Content | EASA link |
|----------|---------|-----------|
| ATPL A — Student Progress KSA Rev 3 | Student progress tracking | Part-FCL, Part-ORA |
| ATPL B — All Subjects KSA Rev 1.0 | Full-subject KSA matrix | Part-FCL, Part-ORA |
| ATPL C — KSA Rev 1.0 | Competency document | Part-FCL |
| ATPL D — Classroom Training Rev 1.0 | Training phases + ATPL syllabus (010 Air Law, Part-FCL, Part-MED…) | Part-FCL, Part-ORA |
| ATPL F — KSA 100 Examples Rev 1.0 | Competency-based training examples (FNTP, comm, scenarios) | Part-FCL KSA area 100 |
| TM — Theory Manual Rev 1 | EASA ATPL theory programme | Part-FCL, Part-ORA |

### EASA regulation families to track

| Regulation family | Key instrument | Relevance |
|-------------------|---------------|-----------|
| Part-FCL | Reg (EU) No 1178/2011 — AMC/GM Amdt 13 (2025-02-05) | Pilot licensing, CPL, ratings |
| Part-MED | AMC/GM Issue 2, Amdt 1 (2025-02-05) | Medical certificates |
| Part-ORA | AMC/GM Issue 1, Amdt 8 (2025-02-05) | Approved Training Organisations |
| Part-ARA | AMC/GM Issue 1, Amdt 13 (2025-02-05) | Authority requirements for aircrew |
| Part-DTO | AMC/GM Issue 1, Amdt 2 (2025-02-05) | Declared Training Organisations |
| Part-ORO | AMC/GM Issue 2, Amdt 29 (2025-12-05) | Organisation requirements (ops) |
| Part-CAT | AMC/GM Issue 2, Amdt 25 (2025-07-07) | Commercial air transport |
| Part-NCC | AMC/GM Issue 1, Amdt 19 (2023-06-28) | Non-commercial complex aircraft |
| Part-NCO | AMC/GM Issue 2, Amdt 16 (2023-06-28) | Non-commercial other aircraft |
| CS-FSTD(A) | Issue 2 (2018-05-03) | Simulator certification |
| CS-FTL.1 | Issue 1, Amdt 1 (2023-12-19) | Flight time limitations |
| SES | Reg (EU) 2024/2803 (2024-11-11) | Single European Sky |

Primary EASA source: **https://www.easa.europa.eu/en/regulations**

---

## 2. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend framework | Next.js 16 (App Router) | SSR, API routes, middleware |
| UI library | React 19 | Component model |
| Styling | Tailwind CSS v4 | Utility-first with custom design tokens |
| Type safety | TypeScript 5 | Strict types throughout |
| Database | Supabase Postgres | Primary data store |
| Auth | Supabase Auth | Email/password; SSO in Phase 7 |
| Row-level security | Supabase RLS | Tenant isolation, permission enforcement |
| Edge Functions | Supabase Edge Functions (Deno) | Backend pipeline workers |
| Storage | Supabase Storage | Raw snapshots, uploaded docs, export files |
| Scheduled jobs | Supabase pg_cron + Scheduled Functions | Daily/configurable pipeline trigger |
| Primary AI | Anthropic Claude API (claude-sonnet-4-6) | Relevance analysis, patch generation |
| Email | Resend | Transactional notification emails |
| Export — PDF | jsPDF (client) + headless render (Edge Function) | PDF export |
| Export — DOCX | `docx` npm package (Edge Function) | Word document export |
| Semantic search | pgvector (Phase 4+) | Section similarity matching |

---

## 3. Design System

### 3.1 Design Philosophy

The interface is **aviation-professional meets modern SaaS**: precision, hierarchy, and trust. Clean surfaces with subtle depth. Data-dense but never cluttered. Smooth micro-animations on state changes. The dark theme is the primary daily-use mode; light mode for print/export contexts.

### 3.2 Color Palette

#### Dark Theme (default — daily use)

| Token | Value | Role |
|-------|-------|------|
| `--easa-color-bg` | `#1A1A1C` | App background |
| `--easa-color-surface-1` | `#232427` | Cards, panels |
| `--easa-color-surface-2` | `#2B2D31` | Raised cards, inputs |
| `--easa-color-surface-3` | `#33363B` | Hover states, active rows |
| `--easa-color-border` | `#3A3C41` | Borders, dividers |
| `--easa-color-text-primary` | `#F2F2F4` | Primary text |
| `--easa-color-text-secondary` | `#C7C8CD` | Secondary text |
| `--easa-color-text-muted` | `#8D9099` | Labels, placeholders |
| `--easa-color-brand-primary` | `#F07A2B` | Primary CTA, active nav, brand |
| `--easa-color-accent-blue` | `#5AA2FF` | Links, info, confidence badges |
| `--easa-color-accent-green` | `#43D17B` | Success, approved, low-risk |
| `--easa-color-accent-yellow` | `#F4C752` | Warning, watchlist |
| `--easa-color-accent-red` | `#F05C62` | Error, high-risk, rejected |
| `--easa-color-accent-teal` | `#3CC8B4` | Time Machine, history |
| `--easa-color-accent-purple` | `#A78BFA` | Progress, AI-generated |

#### Light Theme (export / print contexts)

| Token | Value | Role |
|-------|-------|------|
| `--easa-color-bg` | `#F6F7FA` | App background |
| `--easa-color-surface-1` | `#FFFFFF` | Cards |
| `--easa-color-surface-2` | `#EEF1F6` | Inputs, sub-panels |
| `--easa-color-border` | `#E3E7EE` | Borders |
| `--easa-color-text-primary` | `#1E1F24` | Primary text |
| `--easa-color-text-secondary` | `#3C3F49` | Secondary text |
| `--easa-color-text-muted` | `#6C6F7B` | Labels |
| `--easa-color-brand-primary` | `#1F3434` | CTA, active nav |

### 3.3 Typography

**Font stack:** `Inter`, `SF Pro Display`, `Segoe UI`, `system-ui`, sans-serif
**Display font (large headings only):** `Poppins`

| Scale | Size/Line | Weight | Use |
|-------|-----------|--------|-----|
| Display | 32 / 40 | 600 | Page hero titles |
| H1 | 26 / 34 | 600 | Screen headings |
| H2 | 22 / 30 | 600 | Section headings |
| H3 | 18 / 26 | 600 | Card headings |
| Body M | 14 / 22 | 500 | Primary body copy |
| Body S | 12 / 18 | 500 | Secondary copy, metadata |
| Caption | 11 / 16 | 500 | Labels, timestamps |

Mobile scales down one level: Display → 26/34, H1 → 22/30, H2 → 20/28, H3 → 16/24.

### 3.4 Spacing

Scale: `2 4 6 8 12 16 20 24 32 40 48 64`
Desktop page padding: `32` | Card padding: `20` | Mobile page padding: `20` | Mobile card: `16`

### 3.5 Radius

| Name | Value | Use |
|------|-------|-----|
| XS | 8px | Chips, small tags |
| S | 12px | Inputs, table rows |
| M | 16px | Cards, panels |
| L | 24px | Large cards, modal panels |
| XL | 32px | Sidebar, hero blocks |
| Pill | 999px | Buttons, badges, nav pills |

### 3.6 Elevation (Dark Theme)

```css
--easa-shadow-1: 0 2px 10px rgba(0,0,0,0.35);   /* cards */
--easa-shadow-2: 0 8px 30px rgba(0,0,0,0.45);   /* modals, popovers */
--easa-shadow-glow-brand: 0 0 20px rgba(240,122,43,0.25);  /* active CTA */
--easa-shadow-glow-blue: 0 0 16px rgba(90,162,255,0.2);    /* focus rings */
```

### 3.7 Motion & Animation

- Transition duration: `150ms` (micro), `250ms` (standard), `400ms` (page/modal enter)
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)` (standard), `cubic-bezier(0, 0, 0.2, 1)` (decelerate)
- Diff text: character-level fade-in with `stagger(20ms)`
- Approval action: button transforms to loading spinner → success check with scale pulse
- Dashboard stats: count-up animation on first load
- Notification bell: subtle bounce on new item
- Pipeline steps: sequential reveal as each step completes

### 3.8 Layout System

**Desktop (1440px baseline)**
- 12-column grid, 24px gutters
- Sidebar: 72px collapsed / 240px expanded (smooth slide transition)
- Top bar height: 64px
- Content max-width: 1400px

**Mobile (375px baseline)**
- 4-column grid, 16px gutters
- Bottom navigation bar: 64px, pill container with 5 items
- Cards: full-width, stacked

### 3.9 Component Tokens

```css
/* Navigation */
--easa-nav-active-bg: var(--easa-color-brand-primary);
--easa-nav-hover-bg: var(--easa-color-surface-3);

/* Buttons */
--easa-btn-primary: var(--easa-color-brand-primary);  /* orange pill */
--easa-btn-secondary: var(--easa-color-surface-2);    /* ghost */
--easa-btn-danger: var(--easa-color-accent-red);

/* Risk badges */
--easa-badge-high: var(--easa-color-accent-red) with 15% alpha fill;
--easa-badge-medium: var(--easa-color-accent-yellow) with 15% alpha fill;
--easa-badge-low: var(--easa-color-accent-green) with 15% alpha fill;
--easa-badge-ai: var(--easa-color-accent-purple) with 15% alpha fill;

/* Diff viewer */
--easa-diff-added: rgba(67,209,123,0.15);    /* green tint row */
--easa-diff-removed: rgba(240,92,98,0.15);   /* red tint row */
--easa-diff-modified: rgba(90,162,255,0.15); /* blue tint row */
```

### 3.10 Iconography

- Style: line icons, 1.5–2px stroke, rounded caps
- Library: Lucide React (consistent set)
- Sizes: 16px (micro), 20px (default), 24px (navigation)
- Aviation-specific icons: custom SVGs for regulation document, flight book, runway, compass

### 3.11 Accessibility

- Body/label text: minimum 4.5:1 contrast ratio
- Large text (18px+ or 14px bold): minimum 3:1
- Interactive outlines, chart marks: minimum 3:1
- Focus rings: 2px solid `--easa-color-accent-blue`, 2px offset
- All interactive elements keyboard-navigable
- ARIA live regions for notification bell and pipeline status updates

---

## 4. User Roles & Permissions

Three roles with granular permissions enforced at the database level (RLS) and UI level.

| Capability | Admin | Editor | Viewer |
|-----------|:-----:|:------:|:------:|
| View dashboard, updates, changes | ✅ | ✅ | ✅ |
| View flight books (read) | ✅ | ✅ | ✅ |
| Export PDF / DOCX | ✅ | ✅ | ✅ |
| Write notes on any change item | ✅ | ✅ | ✅ |
| View all notes (everyone's) | ✅ | ✅ | ✅ |
| Request revision on a proposed update | ✅ | ✅ | ❌ |
| **Final approve or reject** | **✅** | **❌** | **❌** |
| Run ingestion pipeline manually | ✅ | ✅ | ❌ |
| Roll back sections / documents | ✅ | ❌ | ❌ |
| Upload / manage flight books | ✅ | ❌ | ❌ |
| Manage EASA sources | ✅ | ❌ | ❌ |
| Configure scrape schedule | ✅ | ❌ | ❌ |
| Configure approval preferences | ✅ | ❌ | ❌ |
| Manage users and roles | ✅ | ❌ | ❌ |

**Admin** = Flight School Compliance Manager
**Editor** = Operations / Chief Flight Instructor delegate
**Viewer** = Read-only (student, external auditor, observer)

---

## 5. Complete Feature Set

### 5.1 Regulation Monitoring

- **Multi-source ingestion** — RSS feeds (EASA news, consultations, publications) + HTML scraping of individual regulation part pages + PDF download and parsing
- **Configurable schedule** — admin sets 1–4 scrape runs per day with specific UTC times per run; stored per organisation
- **Idempotent ingestion** — content hash comparison prevents duplicate snapshots; re-runs are safe
- **Scrape health monitoring** — each run logged to `pipeline_runs`; failures surfaced on dashboard; automatic retry with exponential back-off (max 3 attempts)
- **Source management** — admin can add, edit, enable/disable any source URL

### 5.2 Change Detection

- **Snapshot storage** — every scrape stores raw HTML/PDF to Supabase Storage (`snapshots/` bucket)
- **Text extraction** — HTML scraped text + PDF text extraction written to `document_sections`
- **Structural diffing** — unified diff comparing new extracted text against previous snapshot; detects added, modified, and deleted paragraphs/clauses
- **Section-level granularity** — changes tracked at paragraph/clause level, not whole-document level
- **Regulation metadata** — regulation number, effective date, part family, amendment number stored with every change

### 5.3 Flight Book Database

- **Document import** — admin uploads `.doc`, `.docx`, or PDF; app parses into hierarchical `flightbook_sections`
- **Section structure** — numbered sections (e.g., `010.04.02.01`) with parent–child hierarchy preserved
- **Regulation mapping** — each flight book section linked to one or more EASA regulation sections; mapping shows confidence level (high / medium / low) and match type (manual / keyword / semantic)
- **Manual override edits** — admin/editor can directly edit any section body in the flight book viewer (with audit trail)
- **Version control** — every edit (approved update or manual override) creates a new `flightbook_section_version` snapshot

### 5.4 Relevance & Impact Analysis (AI)

- **Classification** — for each detected change, Claude classifies every linked flight book section as: `must_update` | `likely` | `watchlist` | `not_relevant`
- **Risk scoring** — `high` | `medium` | `low` based on change type, section criticality, and regulatory language
- **Confidence score** — numeric 0–100 reflecting how certain the mapping is
- **Rationale** — human-readable explanation of why this change affects the section
- **Keyword fallback** — if Claude API is unavailable, heuristic keyword matching provides a degraded-but-functional classification

### 5.5 AI Text Generation

- **Patch drafting** — Claude generates the exact replacement text for each `must_update` / `likely` section, matched to the existing writing style
- **Suggested text display** — shows as a distinct, copyable panel in the Diff Viewer; can be accepted as-is or edited before approval
- **Re-generation** — user can request a re-run with additional context (e.g., an editor's note becomes part of the AI prompt)
- **Traceability** — every AI-generated text block is tagged with model version, timestamp, and the source regulation diff that produced it

### 5.6 User Notes

- Any user (any role) can write notes on any proposed update
- Notes are visible to all members of the organisation in real time (Supabase Realtime)
- Notes are timestamped and author-attributed
- Notes appear in the Diff Viewer comment thread beneath the proposed update
- Notes are included in the PDF/DOCX export of an update item

### 5.7 Approval Workflow

- **Update Review Queue** — all pending `proposed_updates` in a filterable, sortable list
- **Approval modes** (configured by admin in Settings):
  - *Manual*: every update requires explicit admin approval
  - *Semi-automatic*: `low` risk items auto-approve after a configurable lead time (hours); `medium` and `high` always require admin sign-off
- **Notification before auto-approve** — all users notified when an auto-approval is scheduled; admin can cancel within the lead-time window
- **Actions**: Approve / Reject / Request Revision (editors can request revision; only admins approve or reject)
- **Conflict detection** — if the flight book section was manually edited after the patch was generated, the approval is blocked and requires re-review
- **Audit entry** — every approval, rejection, and revision request creates an immutable `audit_log` record

### 5.8 Notifications

- **Triggers**: new regulation change detected; new proposed update created; approval scheduled; update approved; update rejected; rollback performed
- **Channels**: in-app notification centre (bell icon) + email (via Resend)
- **User control**: each user can independently toggle email on/off and in-app on/off from their profile; choose immediate or daily digest
- **Organisation-wide** — notifications go to all org members by default; per-user preference overrides

### 5.9 Version History & Time Machine

- Every approved update and every manual edit creates a `flightbook_section_version` entry (before + after body, who, when, linked approval)
- **Time Machine screen** — timeline visualisation; select any past date to preview the full flight book state at that point
- **Granular restore** — restore an entire document, a single section, or a specific approval batch
- **Compare mode** — pick two dates or two versions and see a diff between them
- **Rollback** — admin-only; transactional; creates an audit log entry and notifies all org users

### 5.10 Export

- **Scope options**: single section, entire document, change list (all changes for a period), compliance report (pending + approved + notes)
- **Formats**: PDF and DOCX (admin configures default format in Settings)
- **PDF** — styled with EASA brand colours; includes section numbers, approval trail, AI rationale, notes thread
- **DOCX** — editable Word document; section structure preserved; tracked-changes markup for diff items
- **Export triggered from**: Diff Viewer, Flight Book Viewer, Change List, Time Machine

---

## 6. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      BROWSER / CLIENT                           │
│   Next.js 16 App Router  ·  React 19  ·  Tailwind CSS v4       │
│   Supabase JS client  ·  Supabase Realtime (notes, pipeline)   │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTPS / WebSocket
┌─────────────────────────────▼───────────────────────────────────┐
│                       SUPABASE PLATFORM                         │
│                                                                 │
│  ┌─────────────────┐   ┌──────────────────┐   ┌─────────────┐  │
│  │  Auth + RLS     │   │    Postgres DB    │   │   Storage   │  │
│  │  (tenant iso.)  │   │  (schema below)  │   │  buckets:   │  │
│  └─────────────────┘   └──────────────────┘   │  snapshots/ │  │
│                                               │  flightbks/ │  │
│  ┌─────────────────────────────────────────┐  │  exports/   │  │
│  │           Edge Functions (Deno)         │  └─────────────┘  │
│  │  rss-ingest     html-scrape             │                   │
│  │  pdf-parse      diff-worker             │                   │
│  │  relevance-engine  patch-generator      │                   │
│  │  apply-update   rollback                │                   │
│  │  notifications  export-generator        │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
│  ┌─────────────────────────────────────────┐                   │
│  │        Cron / Scheduled Functions       │                   │
│  │  Triggers pipeline N times/day per org  │                   │
│  └─────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       Anthropic Claude    Resend          EASA Website
       API (AI analysis)   (email)        (scrape targets)
```

### Pipeline execution order (per scheduled run)

```
1. rss-ingest          → fetch RSS feeds → upsert rss_items
2. html-scrape         → fetch HTML pages → store snapshots (skip if hash unchanged)
3. pdf-parse           → extract text from new PDF snapshots → write document_sections
4. diff-worker         → compare snapshots → write reg_changes
5. relevance-engine    → Claude classifies each change → write proposed_updates
6. patch-generator     → Claude drafts replacement text → update proposed_updates
7. notifications       → write notification rows + send emails
```

---

## 7. File Structure

```
EASA_app/
├─ docs/
│  ├─ MASTER_BUILD.md          ← this file (single source of truth)
│  ├─ CONTENT.md               (archived — superseded)
│  ├─ DESIGN_SYS.md            (archived — superseded)
│  ├─ SYSTEM.md                (archived — superseded)
│  └─ ROADMAP.md               (archived — superseded)
│
├─ web/
│  ├─ public/
│  │  ├─ icons/                SVG icons and favicon
│  │  ├─ images/               static images (logo, onboarding)
│  │  └─ manifest/             PWA manifest
│  └─ src/
│     ├─ app/
│     │  ├─ (auth)/
│     │  │  └─ login/page.tsx
│     │  ├─ (app)/
│     │  │  ├─ layout.tsx       shared app shell (sidebar + topbar)
│     │  │  ├─ dashboard/page.tsx
│     │  │  ├─ updates/
│     │  │  │  ├─ page.tsx      Update Queue
│     │  │  │  └─ [id]/page.tsx Diff Viewer
│     │  │  ├─ flightbooks/
│     │  │  │  ├─ page.tsx      Flight Book Viewer
│     │  │  │  ├─ [id]/page.tsx Single document view
│     │  │  │  └─ upload/page.tsx
│     │  │  ├─ changes/page.tsx Change List
│     │  │  ├─ history/page.tsx Time Machine
│     │  │  ├─ notifications/page.tsx
│     │  │  ├─ settings/page.tsx
│     │  │  └─ profile/page.tsx
│     │  ├─ api/
│     │  │  ├─ run-pipeline/route.ts   triggers Edge Function chain
│     │  │  ├─ approve/route.ts
│     │  │  ├─ rollback/route.ts
│     │  │  └─ export/route.ts
│     │  ├─ globals.css          design tokens + base styles
│     │  └─ layout.tsx           root layout (theme provider)
│     │
│     ├─ components/
│     │  ├─ navigation/
│     │  │  ├─ Sidebar.tsx
│     │  │  ├─ TopBar.tsx
│     │  │  ├─ MobileNav.tsx
│     │  │  └─ NotificationBell.tsx
│     │  ├─ cards/
│     │  │  ├─ StatCard.tsx
│     │  │  ├─ UpdateCard.tsx
│     │  │  └─ PipelineCard.tsx
│     │  ├─ diff/
│     │  │  ├─ DiffViewer.tsx    side-by-side + inline toggle
│     │  │  ├─ DiffLine.tsx      individual changed line
│     │  │  └─ PatchPreview.tsx  AI-suggested replacement text
│     │  ├─ flightbook/
│     │  │  ├─ SectionTree.tsx
│     │  │  ├─ SectionBody.tsx
│     │  │  └─ SectionEditor.tsx
│     │  ├─ timemachine/
│     │  │  ├─ Timeline.tsx
│     │  │  └─ VersionDiff.tsx
│     │  ├─ notes/
│     │  │  └─ NotesThread.tsx
│     │  ├─ export/
│     │  │  └─ ExportButton.tsx
│     │  └─ ui/                  atomic primitives
│     │     ├─ Button.tsx
│     │     ├─ Badge.tsx
│     │     ├─ Chip.tsx
│     │     ├─ Input.tsx
│     │     ├─ Modal.tsx
│     │     ├─ Toast.tsx
│     │     ├─ Progress.tsx
│     │     └─ Skeleton.tsx
│     │
│     ├─ hooks/
│     │  ├─ useSupabase.ts
│     │  ├─ useRealtime.ts
│     │  ├─ useOrganization.ts
│     │  └─ useNotifications.ts
│     │
│     ├─ lib/
│     │  ├─ supabase/
│     │  │  ├─ browser.ts
│     │  │  └─ server.ts
│     │  ├─ ai-scraper.ts        existing scraper lib
│     │  └─ export/
│     │     ├─ pdf.ts
│     │     └─ docx.ts
│     │
│     ├─ services/
│     │  ├─ updates.ts           proposed_updates queries
│     │  ├─ flightbooks.ts       flightbook section queries
│     │  ├─ changes.ts           reg_changes queries
│     │  ├─ approvals.ts         approval actions
│     │  ├─ notifications.ts     notification queries
│     │  └─ pipeline.ts          pipeline trigger + status
│     │
│     ├─ state/
│     │  └─ orgStore.ts          org context (Zustand or Context)
│     │
│     └─ types/
│        ├─ database.ts          generated Supabase types
│        └─ app.ts               UI-layer types
│
├─ supabase/
│  ├─ migrations/
│  │  ├─ schema/
│  │  │  ├─ 001_init.sql          ✅ exists
│  │  │  ├─ 002_roles_permissions.sql  ✅ exists
│  │  │  ├─ 003_flightbooks.sql        ← Phase 0
│  │  │  ├─ 004_reg_documents.sql      ← Phase 0
│  │  │  ├─ 005_proposed_updates.sql   ← Phase 0
│  │  │  ├─ 006_user_profiles.sql      ← Phase 0
│  │  │  ├─ 007_version_history.sql    ← Phase 0
│  │  │  └─ 008_settings_extend.sql    ← Phase 0
│  │  ├─ rls-policies/
│  │  │  ├─ 001_base_rls.sql      ✅ exists (inline in 001_init)
│  │  │  └─ 002_extended_rls.sql  ← Phase 0
│  │  └─ triggers/
│  │     └─ 001_audit_trigger.sql ← Phase 0
│  ├─ functions/
│  │  ├─ rss-ingest/index.ts      ✅ exists — extend for org schedules
│  │  ├─ ai-analyze/index.ts      ✅ exists — migrate to Claude
│  │  ├─ html-scrape/index.ts     ← Phase 1
│  │  ├─ pdf-parse/index.ts       ← Phase 1
│  │  ├─ diff-worker/index.ts     ← Phase 1
│  │  ├─ relevance-engine/index.ts ← Phase 2
│  │  ├─ patch-generator/index.ts ← Phase 2
│  │  ├─ apply-update/index.ts    ← Phase 3
│  │  ├─ rollback/index.ts        ← Phase 5
│  │  ├─ notifications/index.ts   ← Phase 4
│  │  └─ export-generator/index.ts ← Phase 6
│  ├─ storage/
│  │  ├─ snapshots/               raw HTML + PDF captures
│  │  ├─ flightbooks/             uploaded source documents
│  │  └─ exports/                 generated PDF/DOCX files
│  └─ sql/
│     ├─ seed/
│     │  ├─ 001_easa_sources.sql  ✅ exists (RSS)
│     │  ├─ 002_html_sources.sql  ← Phase 0 (HTML reg pages)
│     │  └─ 003_flightbook_mappings.sql ← Phase 0
│     └─ views/
│        ├─ v_dashboard_stats.sql
│        └─ v_update_queue.sql
│
├─ scripts/
│  ├─ create-admin-user.mjs       ✅ exists
│  └─ import-flightbooks.mjs      ← Phase 0 (one-time ATPL import)
│
├─ data/
│  ├─ sources/
│  │  └─ easa/                    local copies of scraped content
│  └─ fixtures/
│     ├─ flightbooks/             ATPL doc source files
│     └─ mappings/                initial EASA ↔ section mapping JSON
│
└─ tests/
   ├─ integration/
   │  ├─ pipeline.test.ts
   │  ├─ diff.test.ts
   │  ├─ approvals.test.ts
   │  └─ rollback.test.ts
   └─ e2e/
      ├─ auth.test.ts
      ├─ update-queue.test.ts
      ├─ diff-viewer.test.ts
      ├─ flightbook.test.ts
      └─ time-machine.test.ts
```

---

## 8. Data Model

### Existing tables (migrations 001–002) ✅

`organizations` · `org_users` · `sources` · `rss_items` · `ai_findings` · `permissions` · `role_permissions` · `schedules`

### Migration 003 — Flight Books

```sql
create table flightbooks (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  name              text not null,
  doc_type          text not null,  -- training_manual | sop | checklist | ksa | syllabus
  file_ref          text,           -- Storage path (flightbooks/ bucket)
  version_label     text,           -- e.g. "Rev 1.0"
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table flightbook_sections (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  flightbook_id     uuid not null references flightbooks(id) on delete cascade,
  parent_id         uuid references flightbook_sections(id),
  section_number    text,           -- e.g. "010.04.02.01"
  title             text,
  body              text not null,
  embedding         vector(1536),   -- pgvector (Phase 4)
  sort_order        int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table flightbook_mappings (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references organizations(id) on delete cascade,
  flightbook_section_id    uuid not null references flightbook_sections(id) on delete cascade,
  easa_section_ref         text not null, -- e.g. "Part-FCL AMC1 FCL.725"
  confidence               text not null default 'medium', -- high | medium | low
  match_type               text not null default 'manual', -- manual | keyword | semantic
  created_at               timestamptz not null default now()
);
```

### Migration 004 — Regulation Documents & Snapshots

```sql
create table reg_documents (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  source_id       uuid references sources(id),
  title           text not null,
  reg_number      text,            -- e.g. "EU No 1178/2011"
  part            text,            -- e.g. "Part-FCL"
  amendment       text,            -- e.g. "Issue 1, Amendment 13"
  url             text,
  effective_date  date,
  created_at      timestamptz not null default now()
);

create table source_snapshots (
  id               uuid primary key default gen_random_uuid(),
  source_id        uuid not null references sources(id) on delete cascade,
  scraped_at       timestamptz not null default now(),
  content_hash     text not null,
  raw_storage_path text,           -- Storage: snapshots/ bucket
  extracted_text   text,
  status           text not null default 'pending' -- pending | parsed | error
);

create unique index source_snapshots_hash_unique
  on source_snapshots(source_id, content_hash);

create table document_sections (
  id              uuid primary key default gen_random_uuid(),
  snapshot_id     uuid not null references source_snapshots(id) on delete cascade,
  organization_id uuid references organizations(id),
  section_number  text,
  title           text,
  body            text not null,
  sort_order      int not null default 0
);

create table reg_changes (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  source_id         uuid references sources(id),
  reg_document_id   uuid references reg_documents(id),
  old_snapshot_id   uuid references source_snapshots(id),
  new_snapshot_id   uuid references source_snapshots(id),
  section_ref       text,
  change_type       text not null, -- added | modified | deleted
  diff_text         text,          -- unified diff
  detected_at       timestamptz not null default now()
);
```

### Migration 005 — Proposed Updates & Approvals

```sql
create table proposed_updates (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references organizations(id) on delete cascade,
  reg_change_id          uuid references reg_changes(id),
  flightbook_section_id  uuid references flightbook_sections(id),
  classification         text not null default 'watchlist',
                         -- must_update | likely | watchlist | not_relevant
  risk_level             text not null default 'medium', -- high | medium | low
  ai_rationale           text,
  ai_suggested_text      text,       -- draft replacement text
  confidence_score       numeric(5,2),
  status                 text not null default 'pending',
                         -- pending | approved | rejected | revision_requested
  auto_approve_at        timestamptz, -- set when auto-approve is scheduled
  ai_model               text,        -- model ID used to generate
  ai_generated_at        timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table approvals (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references organizations(id) on delete cascade,
  proposed_update_id  uuid not null references proposed_updates(id),
  action              text not null,  -- approved | rejected | revision_requested | auto_approved
  approver_id         uuid references auth.users(id),
  comment             text,
  decided_at          timestamptz not null default now()
);
```

### Migration 006 — User Profiles & Notes

```sql
create table user_profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  display_name          text,
  avatar_url            text,
  notification_email    boolean not null default true,
  notification_inapp    boolean not null default true,
  notification_digest   text not null default 'immediate', -- immediate | daily
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table update_notes (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references organizations(id) on delete cascade,
  proposed_update_id  uuid not null references proposed_updates(id) on delete cascade,
  author_id           uuid not null references auth.users(id),
  body                text not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
```

### Migration 007 — Version History & Audit

```sql
create table flightbook_section_versions (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references organizations(id) on delete cascade,
  flightbook_section_id  uuid not null references flightbook_sections(id),
  body                   text not null,
  version_number         int not null,
  change_source          text not null, -- approved_update | manual_edit | rollback | import
  created_by             uuid references auth.users(id),
  approval_id            uuid references approvals(id),
  created_at             timestamptz not null default now()
);

create unique index section_versions_unique
  on flightbook_section_versions(flightbook_section_id, version_number);

-- Immutable audit log — no updates or deletes allowed
create table audit_log (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  actor_id        uuid references auth.users(id),
  action          text not null,        -- approved | rejected | rollback | edit | import | login
  entity_type     text not null,        -- proposed_update | flightbook_section | flightbook | user
  entity_id       uuid,
  payload         jsonb,                -- before/after state, metadata
  created_at      timestamptz not null default now()
);

create table notifications (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references organizations(id) on delete cascade,
  user_id              uuid not null references auth.users(id) on delete cascade,
  type                 text not null,
  -- new_change | approval_needed | auto_approve_scheduled | approved | rejected | rollback
  title                text not null,
  body                 text,
  related_entity_type  text,
  related_entity_id    uuid,
  read                 boolean not null default false,
  created_at           timestamptz not null default now()
);
```

### Migration 008 — Pipeline & Schedule Extensions

```sql
create table pipeline_runs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  status          text not null default 'running', -- running | complete | error
  steps           jsonb,     -- { step_name: { status, started_at, finished_at, error } }
  items_processed int default 0,
  changes_found   int default 0,
  error_message   text
);

-- Extend schedules table (from migration 002)
alter table schedules
  add column if not exists runs_per_day       int not null default 1,
  add column if not exists run_times_utc      time[] not null default array['06:00'::time],
  add column if not exists auto_approve_low   boolean not null default false,
  add column if not exists auto_approve_delay_hours int not null default 24,
  add column if not exists notify_on_detect   boolean not null default true,
  add column if not exists default_export_fmt text not null default 'pdf';
```

### Initial EASA → flight book section seed mappings

| Flight book section | EASA regulation ref |
|--------------------|---------------------|
| ATPL D — Air Law (010.01–010.06) | Part-FCL + ICAO Annex 2 / SERA |
| ATPL D — Personnel Licensing (010.04.02) | Part-FCL Reg 1178/2011, Annex I |
| ATPL D — Personnel Licensing (010.04.03) | Part-MED Reg 1178/2011, Annex IV |
| ATPL D — Aircraft Operations (010.06) | Part-CAT, Part-NCC, Part-NCO |
| ATPL A — Student Progress | Part-ORA ATO requirements |
| ATPL B — All Subjects KSA | Part-FCL Subpart FCL.725 |
| ATPL F — KSA Area 100 | Part-FCL Appendix 3 (CBT, competency-based) |
| TM Theory Manual | Part-FCL + Part-ORA + CS-FSTD(A) |

---

## 9. Edge Functions & Backend Pipeline

All Edge Functions run in the Supabase Deno runtime. Common imports:

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import Anthropic from "npm:@anthropic-ai/sdk";
```

### 9.1 `rss-ingest` ✅ Exists — extend

**Changes needed:** read org-specific `schedules.run_times_utc`; write pipeline_run step status; handle per-org source lists.

### 9.2 `html-scrape` ← Phase 1

- Input: list of HTML source URLs from `sources` table (type = `html`)
- Fetch page, extract readable text (strip nav/footer boilerplate)
- Compute `SHA-256` hash of extracted text
- If hash unchanged vs. latest snapshot: skip (idempotent)
- Store raw HTML to `snapshots/{source_id}/{timestamp}.html` in Storage
- Write `source_snapshots` record
- Retry logic: 3 attempts with 5s / 15s / 60s back-off

### 9.3 `pdf-parse` ← Phase 1

- Triggered by Storage `snapshots/` insert event (or called from pipeline)
- Download PDF from Storage; extract text by page
- Split into sections using heading detection heuristics
- Write `document_sections` rows
- Update `source_snapshots.status` → `parsed`

### 9.4 `diff-worker` ← Phase 1

- For each new `source_snapshot`, find previous snapshot for same source
- Run unified diff on `extracted_text` (or section-by-section comparison)
- Classify each change: `added` | `modified` | `deleted`
- Write `reg_changes` rows with diff_text
- Write `pipeline_runs` step status

### 9.5 `relevance-engine` ← Phase 2

- For each new `reg_change`, fetch linked `flightbook_mappings` → `flightbook_sections`
- Build classification prompt (see §10.2)
- Call Claude API: classify each section as `must_update` | `likely` | `watchlist` | `not_relevant`
- Write `proposed_updates` rows with `classification`, `risk_level`, `ai_rationale`, `confidence_score`
- Fallback: keyword matching if Claude unavailable

### 9.6 `patch-generator` ← Phase 2

- For each `proposed_update` with `must_update` or `likely` classification
- Build patch prompt (see §10.3)
- Call Claude API: generate `ai_suggested_text`
- Update `proposed_updates.ai_suggested_text`, `ai_model`, `ai_generated_at`

### 9.7 `apply-update` ← Phase 3

- Input: `{ proposed_update_id, approver_id, comment? }`
- Validate: check `flightbook_sections.body` matches when patch was created; if not, reject with `conflict_detected`
- Transaction:
  1. `INSERT flightbook_section_versions` (current body as prior version)
  2. `UPDATE flightbook_sections SET body = ai_suggested_text`
  3. `UPDATE proposed_updates SET status = 'approved'`
  4. `INSERT approvals`
  5. `INSERT audit_log`
- Post-commit: trigger `notifications` function

### 9.8 `rollback` ← Phase 5

- Input: `{ flightbook_section_id, target_version_number, actor_id, reason }`
- Fetch target `flightbook_section_versions.body`
- Transaction:
  1. `INSERT flightbook_section_versions` (current body as checkpoint)
  2. `UPDATE flightbook_sections SET body = target_body`
  3. `INSERT audit_log` with rollback metadata
- Post-commit: trigger `notifications` function

### 9.9 `notifications` ← Phase 4

- Input: `{ trigger_type, entity_type, entity_id, organization_id }`
- Fetch all `org_users` for the org
- For each user: write `notifications` row (respects per-user in-app preference)
- For each user with `notification_email = true`: send email via Resend API
- Digest users queued: collated into daily digest cron

### 9.10 `export-generator` ← Phase 6

- Input: `{ type: "section" | "document" | "change_list" | "update_item", id, format: "pdf" | "docx", organization_id }`
- Fetch all required data (section body, notes, approval trail, AI rationale)
- Generate PDF using `jsPDF` or headless render (EASA brand styling)
- Generate DOCX using `docx` npm package (section structure, tracked-change markup for diffs)
- Upload output to `exports/{organization_id}/{timestamp}.{ext}` in Storage
- Return signed URL (24-hour expiry)

### 9.11 `ai-analyze` ✅ Exists — migrate to Claude

- Replace OpenAI `gpt-4o-mini` calls with Claude `claude-sonnet-4-6`
- Same heuristic fallback retained

---

## 10. AI Integration

### 10.1 Model

```typescript
const anthropic = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
});

const response = await anthropic.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 4096,
  messages: [{ role: "user", content: prompt }],
});
```

All AI calls include the organisation's name in the system prompt for context. Responses are parsed as JSON; malformed responses fall back to heuristics. Every AI call records `model`, `prompt_tokens`, `completion_tokens`, and `generated_at` for cost tracking.

### 10.2 Relevance Engine Prompt Template

```
You are a flight school compliance analyst for {{org_name}}.

REGULATION CHANGE:
  Regulation: {{reg_number}} — {{part}}
  Section: {{section_ref}}
  Change type: {{change_type}}
  Before: """{{old_text}}"""
  After:  """{{new_text}}"""

INTERNAL FLIGHT BOOK SECTIONS (may be affected):
{{#each sections}}
  ID: {{id}}
  Number: {{section_number}} — {{title}}
  Content: """{{body}}"""
{{/each}}

For each section, return a JSON array with:
  - section_id
  - classification: "must_update" | "likely" | "watchlist" | "not_relevant"
  - risk_level: "high" | "medium" | "low"
  - confidence_score: 0–100
  - rationale: one sentence explaining why

Return only valid JSON, no commentary.
```

### 10.3 Patch Generator Prompt Template

```
You are a compliance writer for {{org_name}}, a EASA-approved flight school.

CURRENT SECTION ({{section_number}} — {{title}}):
"""{{current_body}}"""

REGULATORY CHANGE REQUIRING THIS UPDATE:
  Regulation: {{reg_number}}
  Diff: """{{diff_text}}"""

REASON FOR UPDATE: {{ai_rationale}}

{{#if editor_note}}
ADDITIONAL CONTEXT FROM REVIEWER: {{editor_note}}
{{/if}}

Write the updated section text to bring this manual section into compliance.
Rules:
- Match the existing writing style, tone, and structure exactly
- Do not add legal interpretation beyond what the regulation states
- Do not remove content unrelated to this regulation change
- Output only the updated section text, no preamble or commentary
```

### 10.4 Cost Controls

- Skip AI calls for `not_relevant` candidates (pre-filtered by keyword)
- Chunk large regulation texts (> 4000 tokens) into overlapping windows
- Cache: if identical `reg_change` + `flightbook_section` combo was processed before, reuse result
- Hard limit: max 100 Claude calls per pipeline run; queue overflow for next run

---

## 11. Screen Inventory

### 11.1 Login (`/login`)

- Email + password fields
- Forgot password link
- Organisation selection on first login if user belongs to multiple orgs
- Redirect to dashboard on success
- Design: full-screen dark with brand gradient background; centred card with logo

### 11.2 Dashboard (`/dashboard`)

The command centre. Replaces current mock data with live Supabase queries.

**Sections:**
- **Stats row** — New changes, Pending approvals, Approved this week, Sources healthy (animated count-up)
- **Update Queue preview** — Top 5 pending `proposed_updates` with risk badges; filter chips (All / High risk / Ready)
- **AI RSS Ingestion card** — Current feed URLs; trigger manual run; last run timestamp
- **Schedule card** — Next run countdown; runs/day setting
- **Diff Viewer preview** — Live example of before/after for the most recent change
- **Flight Book Mapping** — Quick status of each document's link coverage
- **Compliance Highlights** — Progress bars for high/medium/low risk mix
- **Pipeline status** — Live step-by-step run status (Supabase Realtime)
- **Time Machine preview** — Last 3 entries with restore shortcut

### 11.3 Update Queue (`/updates`)

The primary daily workflow screen.

- Full list of `proposed_updates` with join to `reg_changes` and `flightbook_sections`
- **Filters:** classification (Must update / Likely / Watchlist), risk level, document, status, date range
- **Sort:** Newest | Highest risk | Confidence
- **Columns:** Change title, regulation, affected section, risk badge, confidence, status, date
- **Row actions:** View diff, Approve (admin only), Reject (admin only), Request revision (editor+)
- **Bulk select** — approve or reject multiple low-risk items at once (admin only)
- Export this list as PDF or DOCX

### 11.4 Diff Viewer (`/updates/[id]`)

The core review screen.

**Left panel — EASA diff:**
- Regulation metadata header (number, part, effective date, amendment)
- Before / After text with colour-coded line-level diff
- Toggle: inline diff ↔ side-by-side
- Jump-to-clause anchor links

**Right panel — Proposed manual patch:**
- Flight book section title + number
- Current section body (greyed)
- AI-suggested replacement text (highlighted, copyable)
- AI rationale block (purple badge)
- Confidence score + model attribution

**Notes thread** (below both panels):
- All notes from all org users, newest first (Supabase Realtime)
- Compose new note (any role)
- "Request re-generation" button triggers `patch-generator` with notes as context

**Action bar:**
- Request Revision (editor+) → opens comment input, sets status = `revision_requested`
- Reject (admin only) → opens reason input, sets status = `rejected`
- Approve (admin only) → triggers `apply-update` Edge Function; shows success animation

### 11.5 Change List (`/changes`)

Aggregated compliance view.

- All `reg_changes` for the org, grouped by regulation part (Part-FCL, Part-MED, etc.)
- Each row: regulation reference, section, change type, detected date, linked flight book section(s)
- Filter by: date range, regulation family, change type, relevance classification
- Export full list as PDF or DOCX compliance report

### 11.6 Flight Book Viewer (`/flightbooks`)

The manual browser.

- **Document list** — cards for each imported flight book; version label; document type chip; last updated timestamp
- **Section tree** — collapsible hierarchical section tree (section numbers as nodes)
- **Section body** — rendered content; linked EASA regulation chips; pending update badge if a `proposed_update` is in queue
- **Manual edit** — admin/editor can click any section to edit directly (inline editor); saves as `change_source = manual_edit` version
- **History button** — shows `flightbook_section_versions` list for that section; opens Time Machine view filtered to that section
- **Export** — export section or full document

### 11.7 Flight Book Upload (`/flightbooks/upload`)

Admin-only import flow.

- Drag-and-drop zone for `.doc`, `.docx`, `.pdf`
- Triggers `pdf-parse` Edge Function
- Progress bar: uploading → extracting → parsing sections → confirming structure
- Section preview table: section number | title | body preview
- Admin confirms (publishes to `flightbook_sections`) or edits section structure before saving

### 11.8 Time Machine (`/history`)

Version history and rollback.

- **Timeline chart** — horizontal scrollable by day/week/month; each node = an approved batch
- **Date picker** — select any past date → preview the full flight book state at that point (read-only)
- **Restore panel:**
  - Entire document restore
  - Single section restore (select section from tree)
  - Batch restore (select an approval batch)
- **Version compare** — pick two versions; renders side-by-side diff
- All restores require admin role; show confirmation modal; trigger `rollback` Edge Function

### 11.9 Notifications (`/notifications`)

- Bell icon in top bar with unread count badge (real-time)
- Notification drawer (slide-in panel) listing all notifications, newest first
- Types with icons: new update (blue), approval needed (orange), approved (green), rejected (red), rollback (teal), auto-approve scheduled (yellow)
- Mark as read (individual + mark all)
- Click notification → navigates to related entity

### 11.10 Settings (`/settings`) — Admin only

**Tabs:**
1. **Scrape schedule** — runs/day slider (1–4), time pickers per run (UTC), active toggle per source
2. **Approval preferences** — approval mode (manual / semi-auto); auto-approve delay (hours); notify before auto-approve toggle
3. **Export** — default format (PDF / DOCX / both); include notes toggle; include AI rationale toggle
4. **Sources** — add/edit/disable EASA source URLs; source type (RSS / HTML / PDF); test scrape button
5. **Users** — invite user (email); role assignment; deactivate user
6. **Notifications** — org-wide defaults for email / in-app

### 11.11 User Profile (`/profile`)

- Display name + avatar upload
- Notification preferences: email toggle, in-app toggle, digest frequency (immediate / daily)
- Password change
- Organisation membership list (read-only)

---

## 12. Implementation Phases

### Current State

| Status | Item |
|--------|------|
| ✅ Built | Supabase schema (migrations 001–002) |
| ✅ Built | `rss-ingest` Edge Function |
| ✅ Built | `ai-analyze` Edge Function (OpenAI — migrate to Claude) |
| ✅ Built | Dashboard UI (static mock data — wire to live data) |
| ✅ Built | Results page (reads from Supabase) |
| ✅ Built | Login page + middleware auth guard |
| ✅ Built | Design tokens in `globals.css` |
| ✅ Built | Demo org seed + 3 RSS source URLs |

---

### Phase 0 — Foundation (Weeks 1–2)

**Goal:** All database structures in place; ATPL flight books imported; dashboard shows live data.

**Tasks:**

- [ ] Run migrations 003–008
- [ ] Add RLS policies for all new tables (migration `002_extended_rls.sql`)
- [ ] Add audit trigger: auto-insert `audit_log` on `flightbook_sections` update/delete
- [ ] Write `scripts/import-flightbooks.mjs` — one-time script to parse all 6 ATPL documents into `flightbooks` + `flightbook_sections`
- [ ] Seed `flightbook_mappings` with EASA section links (seed 003)
- [ ] Add HTML source URLs to `sources` table: Part-FCL, Part-MED, Part-ORA, Part-DTO, Part-ORO, Part-CAT, Part-NCC, Part-NCO, Part-SPA, CS-FSTD(A), CS-FTL.1 (seed 002)
- [ ] Create Supabase Storage buckets: `snapshots`, `flightbooks`, `exports`
- [ ] Create `pipeline_runs` table + Supabase database views (`v_dashboard_stats`, `v_update_queue`)
- [ ] Wire dashboard stats cards to real Supabase queries (replace all mock data)
- [ ] Create `user_profiles` row for existing admin user on login
- [ ] Migrate `ai-analyze` from OpenAI to Claude API
- [ ] Set `ANTHROPIC_API_KEY` environment variable in Supabase project

**Deliverable:** Live dashboard with real data; all ATPL sections in DB; ready to build pipeline.

---

### Phase 1 — Monitoring Pipeline (Weeks 3–6)

**Goal:** Daily regulation monitoring pipeline runs end-to-end and detects changes.

**Tasks:**

- [ ] Build `html-scrape` Edge Function (hash-based idempotency; Storage upload; retry logic)
- [ ] Build `pdf-parse` Edge Function (text extraction; section splitting; Storage trigger)
- [ ] Build `diff-worker` Edge Function (unified diff; `reg_changes` rows; section-level granularity)
- [ ] Extend `rss-ingest` to write `pipeline_runs` step status
- [ ] Wire all functions into sequential pipeline (each function reads/writes step status in `pipeline_runs`)
- [ ] Configure Supabase pg_cron jobs respecting `schedules.run_times_utc` + `runs_per_day` per org
- [ ] Wire dashboard Pipeline card to `pipeline_runs` via Supabase Realtime (live step status)
- [ ] Update Schedule card in Settings to be fully functional (read/write `schedules`)
- [ ] Add "Run now" manual trigger button (calls pipeline API route)

**Deliverable:** Changes detected automatically; stored in DB; pipeline status visible live on dashboard.

---

### Phase 2 — AI Analysis (Weeks 7–10)

**Goal:** Every detected change is classified for relevance and has AI-drafted replacement text.

**Tasks:**

- [ ] Build `relevance-engine` Edge Function (Claude API; keyword fallback; writes `proposed_updates`)
- [ ] Build `patch-generator` Edge Function (Claude API; writes `ai_suggested_text`)
- [ ] Build Update Queue screen (`/updates`) — live data, filters, sort, risk badges
- [ ] Build Change List screen (`/changes`) — grouped by regulation part, filterable, exportable placeholder
- [ ] Add confidence score visualisation (ring or progress bar) to Update Queue rows
- [ ] Add AI cost tracking: log `prompt_tokens + completion_tokens` to `pipeline_runs` metadata
- [ ] Implement AI call chunking and caching (identical change × section reuse)
- [ ] Surface `classification = not_relevant` items in a collapsible "Dismissed" section of the queue

**Deliverable:** Admin can see every change with classification, rationale, and AI-drafted text ready to review.

---

### Phase 3 — Approval Workflow (Weeks 11–13)

**Goal:** Full review and approve cycle works; changes applied to flight book DB transactionally.

**Tasks:**

- [ ] Build Diff Viewer screen (`/updates/[id]`) — EASA diff panel + patch panel + notes thread
- [ ] Build `apply-update` Edge Function (transactional apply; conflict detection; audit log)
- [ ] Build notes thread component (Supabase Realtime; any-role write; visible to all)
- [ ] Implement Approve action (admin only) with success animation
- [ ] Implement Reject action (admin only) with reason input
- [ ] Implement Request Revision action (editor+) with comment input
- [ ] Implement "Re-generate" button — re-triggers `patch-generator` with editor note as context
- [ ] Implement auto-approve scheduling (set `auto_approve_at` when Low risk + setting enabled)
- [ ] Implement auto-approve cron job (check `proposed_updates` with `auto_approve_at < now()`)
- [ ] Implement conflict detection (body changed since patch generated → block + flag)
- [ ] Bulk approve / reject for admin (multi-select on Update Queue)

**Deliverable:** Complete review-to-approve loop; changes applied; audit trail created.

---

### Phase 4 — Notifications & Profiles (Weeks 14–15)

**Goal:** All users notified in real time; personalised profiles.

**Tasks:**

- [ ] Build `notifications` Edge Function (write notification rows + Resend email)
- [ ] Hook `notifications` trigger to: `diff-worker` completion, `apply-update` completion, `rollback` completion, auto-approve scheduled
- [ ] Build notification bell component (unread count badge, real-time via Supabase Realtime)
- [ ] Build notification drawer (slide-in panel; mark read; click-to-navigate)
- [ ] Build Notifications screen (`/notifications`) — full list
- [ ] Build User Profile screen (`/profile`) — display name, avatar, notification preferences, password change
- [ ] Build Settings → Users tab (invite, role assign, deactivate)
- [ ] Add daily digest cron: collate `notifications` for digest-preference users, send one email at 07:00 UTC

**Deliverable:** Every user notified of changes; profiles personalised.

---

### Phase 5 — Flight Book Viewer & Time Machine (Weeks 16–18)

**Goal:** Users can browse manuals and admins can roll back any change.

**Tasks:**

- [ ] Build Flight Book Viewer (`/flightbooks`) — document cards; section tree; section body; regulation chips
- [ ] Build inline section editor (admin/editor) with manual-edit version tracking
- [ ] Build Flight Book Upload screen (`/flightbooks/upload`) — drag-drop, parse progress, section preview, confirm
- [ ] Build Time Machine screen (`/history`) — timeline chart; date-picker preview; restore panel; compare mode
- [ ] Build `rollback` Edge Function (transactional; audit log; notification)
- [ ] Add "Version history" popover to each section in Flight Book Viewer
- [ ] Add pending-update badge to flight book sections with queued proposed updates

**Deliverable:** Full manual browsing with compliance links; complete version history and rollback.

---

### Phase 6 — Export, Settings & Polish (Weeks 19–21)

**Goal:** Export any content to PDF or DOCX; settings fully functional; app production-ready.

**Tasks:**

- [ ] Build `export-generator` Edge Function (PDF via jsPDF; DOCX via docx npm)
- [ ] Add Export buttons to: Diff Viewer, Flight Book Viewer, Change List, Time Machine
- [ ] Build Settings screen (`/settings`) — all 6 tabs fully functional
- [ ] Complete mobile layout pass:
  - Bottom navigation bar for mobile
  - Swipe-to-toggle diff viewer (inline ↔ side-by-side)
  - Collapsible section tree for small screens
  - Touch-friendly approve / reject actions
- [ ] Dark/light theme toggle in top bar (default dark)
- [ ] Performance:
  - Paginate Update Queue (25 per page)
  - Cache `v_dashboard_stats` view (5-minute TTL)
  - Lazy-load flight book section bodies (virtualised list)
- [ ] Skeleton loading states for all data-fetching screens
- [ ] Empty-state illustrations for: no updates, no flight books, no changes
- [ ] Error boundary + fallback UI for Edge Function failures
- [ ] Input validation on all forms (Settings, notes, upload)

**Deliverable:** App is production-ready, fully responsive, exportable.

---

### Phase 7 — Hardening & Scale (Post-launch, Ongoing)

**Goal:** Multi-tenant production hardening; advanced features.

- [ ] Multi-org support — strict RLS tenant isolation; org selection on login for multi-org users
- [ ] pgvector semantic embedding (Phase 2 relevance engine) — embed sections; similarity search for better mapping suggestions
- [ ] SSO — Google / Microsoft via Supabase Auth OAuth providers
- [ ] Audit log export — admin downloads full `audit_log` as PDF for CAA authority audits
- [ ] Weekly digest summary email — compliance snapshot delivered to admin every Monday
- [ ] Additional EASA source coverage — as new regulation families are added
- [ ] Third-party API — REST endpoints for LMS or document-management system integration
- [ ] Rate-limit and quota management for Claude API calls across orgs

---

## 13. Environment Variables

```env
# ─── Supabase ───────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# ─── AI ─────────────────────────────────────────────
ANTHROPIC_API_KEY=              # Primary — all new AI functions
OPENAI_API_KEY=                 # Legacy only — ai-analyze function (can be removed after migration)

# ─── Email ───────────────────────────────────────────
RESEND_API_KEY=                 # Transactional notification emails

# ─── Scraping ────────────────────────────────────────
EASA_RSS_FEEDS=                 # Comma-separated (defaults in rss-ingest)
EASA_HTML_SOURCES=              # Comma-separated EASA regulation page URLs

# ─── Feature flags ───────────────────────────────────
NEXT_PUBLIC_ENABLE_DARK_MODE_DEFAULT=true
NEXT_PUBLIC_MAX_PIPELINE_RUNS_PER_DAY=4
```

---

## 14. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| EASA website structure changes break scraper | Medium | Medium | Per-source modular scrapers; raw snapshot always stored for forensic recovery; alert on parse errors |
| AI generates incorrect or misleading manual text | Low | High | Text is always a *suggestion*; admin must approve before applying; original text always visible; AI model + timestamp recorded |
| Approved change conflicts with concurrent manual edit | Low | Medium | Conflict detection in `apply-update`; block apply; require re-review |
| Claude API token costs exceed budget on large regulation docs | Medium | Low | Chunk large docs; cache identical change × section results; keyword fallback; hard limit per run |
| Tenant data leakage between organisations | Low | Critical | RLS on every table; `organization_id` on all rows; service role key only used in Edge Functions; no cross-org joins |
| `.doc` (legacy Word) parsing fails | Medium | Low | Convert to `.docx` via LibreOffice in Edge Function before parsing; flag conversion errors |
| Scrape failure during critical regulatory period | Low | High | Retry with back-off; failure surfaced immediately on dashboard; manual run always available |
| User accidentally approves high-risk change | Low | High | Confirmation modal for High risk approvals; all changes reversible via Time Machine |

---

## 15. Definition of Done

The app is complete when every item below is checked:

**Pipeline**
- [ ] Daily pipeline runs automatically; detects EASA regulation changes; stores snapshots
- [ ] HTML, PDF, and RSS sources all supported
- [ ] Idempotent: re-running produces no duplicates

**AI Analysis**
- [ ] Every detected change classified for relevance against ATPL flight book sections
- [ ] AI-drafted replacement text generated for all `must_update` and `likely` items
- [ ] Keyword fallback active when Claude API unavailable

**Flight Books**
- [ ] All 6 ATPL documents (A, B, C, D, F, TM) imported and section-structured in DB
- [ ] All sections linked to corresponding EASA regulation families

**Workflow**
- [ ] All users notified before any change is applied
- [ ] Users (all roles) can write notes visible to entire organisation
- [ ] Editors can request revisions; only admins can give final approval
- [ ] Auto-approve works for Low risk items with configurable lead time and notification
- [ ] Conflict detection blocks stale patches

**History & Rollback**
- [ ] Every approved update and manual edit creates a version snapshot
- [ ] Admin can roll back any section to any prior version
- [ ] Time Machine shows full history timeline and compare mode

**Export**
- [ ] PDF and DOCX export available on Diff Viewer, Flight Book Viewer, Change List, Time Machine

**Settings & Profiles**
- [ ] Admin can configure scrape schedule (1–4 runs/day, specific UTC times)
- [ ] Admin can set approval mode (manual / semi-automatic) and auto-approve delay
- [ ] Every user has a profile with personalised notification preferences

**Quality**
- [ ] App fully responsive on mobile (375px–1440px)
- [ ] Dark theme as default; light theme available
- [ ] All data-fetching screens have skeleton loading and empty states
- [ ] Full audit trail in `audit_log` for every significant action
- [ ] Accessibility: 4.5:1 contrast ratios; keyboard navigable; ARIA live regions

---

*This document is the single source of truth. All implementation decisions should reference it. Update the relevant section when requirements change.*
