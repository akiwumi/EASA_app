# Current App Audit Against Flight School Roadmap

Last updated: 2026-05-01
Related brief: [1. flightschool-product-build-roadmap.md](/Users/eugene/WebDev%20Archive/EASA_app/docs/1.%20flightschool-product-build-roadmap.md:1)

## Purpose

This file captures the current app state before the flight-school expansion work continues. It is intended to satisfy the roadmap's Phase 1 audit requirement and give later phases a stable reference point.

## What Already Exists

### Public and auth routes

- `/` landing page exists and already uses flight-school-oriented messaging, but it is still a compact single-page marketing surface rather than the fuller public site described in the roadmap.
- `/login` exists.

### App routes

- `/dashboard`
- `/updates`
- `/updates/[id]`
- `/results`
- `/results/[id]`
- `/history`
- `/notifications`
- `/profile`
- `/settings`
- `/flightbooks`
- `/flightbooks/[id]`
- `/flightbooks/upload`
- `/changes`

### Existing admin surface

The app currently uses a tabbed admin/settings page instead of dedicated admin routes:

- `setup`
- `users`
- `flightbooks`
- `sources`
- `ai`
- `automation`

### Existing API surface

- notifications
- rollback
- scrape / pipeline triggers
- updates queue
- history compare
- profile
- notes
- schedule
- admin users
- admin sources
- admin AI settings
- admin flightbooks
- admin setup status

### Existing backend / Supabase foundations

- organizations and org_users
- role membership
- sources and RSS ingestion
- AI findings and proposed updates
- schedules and pipeline runs
- flightbooks and flightbook sections
- history / rollback
- notifications
- RAG / retrieval pieces
- storage buckets
- edge functions for ingest, AI analysis, notifications, rollback, and update application

## What Is Already Aligned With The Roadmap

### Sections 1 to 5

- The app is already an extension candidate, not a greenfield build.
- Compliance, manual control, AI-assisted review, and flightbook storage all exist.
- The landing page already points toward a flight-school product story.

### Sections 6 to 9

- Organization tenancy already exists.
- Role-based access already exists in a basic form with `admin` and `viewer`.
- Manual approval is already central to the compliance workflow.
- Existing working screens can be extended rather than replaced.

## Gaps Against The Roadmap

### Missing public routes

- `/pricing`
- `/how-it-works`
- `/book-demo`

### Missing training routes

- `/training/programmes`
- `/training/programmes/[id]`
- `/training/phases/[id]`
- `/training/lessons/[id]`
- `/training/assignments`
- `/training/acknowledgements`
- `/training/signoffs`
- `/training/forms`

### Missing data model areas

The following roadmap entities do not yet appear in the current migrations:

- training_programmes
- training_phases
- training_lessons
- lesson_documents or equivalent lesson-linked document join table
- document_assignments
- acknowledgements
- training_signoffs
- training_forms
- training_form_submissions
- organization_branding
- onboarding_checklists

### Missing role model expansion

The current app recognizes `admin` and `viewer`, but the roadmap's target product roles are not implemented yet:

- Super Admin
- School Admin
- Compliance Manager
- Head of Training / Chief Flight Instructor
- Instructor
- Student

### Missing admin route split

The roadmap targets explicit `/admin/*` routes, while the current app keeps most admin operations under `/settings?tab=*`.

## Phase Status

### Phase 1: Stabilise and reorganise

Status: in progress

Already true:

- the current app has a coherent route foundation
- the current app has shared service-level logic in dashboard and Supabase helpers
- the app already separates public, auth, and app route groups

Completed in this pass:

- current route map documented in this file
- shared domain types added for organizations, users, flightbooks, updates, and future training entities

Still deferred:

- broader cleanup of duplicated UI helpers
- explicit route-level admin route split
- typed Supabase client generation

### Phase 2: Landing page upgrade

Status: partially started

- the homepage already includes flight-school positioning
- the fuller multi-page public marketing surface is not built yet

### Phase 3 onward

Status: not started

- training schema, training UI, role-specific UX, search expansion, exports, onboarding UI, branding settings, and public pricing/how-it-works pages still need implementation

## Suggested Next Build Target

After this audit and type consolidation, the next missing phase in roadmap order is the landing-page/public-site expansion from Phase 2.
