# EASA Compliance App — UX Simplicity Build Plan
**For use in Cursor. Written May 2026.**
**Stack: Next.js 15 + React 19 + Tailwind v4 + Supabase (Postgres, Auth, Edge Functions, Storage)**

---

## Why This Document Exists

The app's core pipeline works. Deduplication is solid. Flight book versioning works. Multi-tenant isolation is correct. But the user experience has grown in layers and the daily compliance workflow — the reason this app exists — is buried under admin tools, historical clutter, and an AI whose reasoning is invisible.

This plan brings the experience back to one simple truth: **a compliance manager should be able to open the app, action what is new, and download an updated flight book in under five minutes.** Everything in this plan serves that goal.

This document is the authoritative build guide. It supersedes all prior phase plans for UX and workflow work. It does not replace the database hardening work in `docs/ROADMAP.md` Phase 0 — that work is a prerequisite and should be completed first.

---

## The Three Simplicity Rules

These rules govern every decision in this build. Before implementing any feature, ask all three questions. If a feature fails one, simplify or cut it.

### Rule 1 — The 5-Minute Daily Workflow
> Can the compliance manager complete the main job — see what is new, review the AI draft, approve or dismiss, download the updated book — in under 5 minutes?

If any step requires more than one click to reach, it is too many. The main queue page is the app. Everything else is secondary.

### Rule 2 — Show Only What Needs Action
> Does this screen show only items that require a decision right now?

Approved items, dismissed items, and items older than 90 days with no action belong in an archive — not the main view. The default state of every list is: short, current, actionable.

### Rule 3 — The AI Is a Tool, Not a Mystery
> Does every AI output show: where it came from, why this section was matched, and what confidence level it carries?

The compliance manager signs off on changes to legal documents. They must be able to explain every approved change to a CAA inspector. If the AI's reasoning is hidden, the manager cannot do their job. Every draft shows its source, its match rationale, and its confidence. Every draft is editable before approval.

---

## How the Three Rules Connect

The rules are not independent. They form a single loop:

**Rule 2 creates Rule 1.** If the queue shows only what needs action, it is always short. A short queue is what makes a 5-minute workflow possible. A long queue full of old items makes every visit feel like a chore.

**Rule 3 creates Rule 1.** If the AI explains its reasoning, the reviewer can make a decision quickly and confidently. Opaque AI output forces the reviewer to do their own research before they can approve — doubling the time.

**Rule 1 enforces Rules 2 and 3.** If you are building something and it would make the daily workflow take longer, it violates Rule 1. This is the test. Rules 2 and 3 are the mechanisms; Rule 1 is the measure.

In practice: every day the compliance manager logs in, they should see a short list with clear explanations, make fast decisions, and leave. The app's job is to compress hours of manual regulatory tracking into minutes of focused review.

---

## Current State: What to Fix Before Building New Things

These are issues in the existing code that must be addressed in Phase 1. They are not new features — they are corrections.

### Fix 1 — The Download Labels Are Confusing
**File:** `src/components/flightbooks/FlightbooksBrowser.tsx`

Current labels:
- "Created flight books" — means versioned exports after approved updates
- "Original flight books" — means the uploaded source documents

These labels mean nothing to a first-time user. Change them to:
- **"Revised copies — approved updates applied"** with a subheading: "Date-stamped versions generated each time an update was approved."
- **"Source documents"** with a subheading: "Your uploaded training manuals, parsed into indexed sections."

Also: the revised copies grid grows with every approval. After six months it will show dozens of cards for the same book. Show only the **most recent export per book** by default. Add an "View all versions" expand link that shows the full list. The most recent copy is the one the user actually wants to download.

### Fix 2 — The Fake Word Doc Export
**File:** `src/app/api/flightbooks/[id]/download/route.ts`

The `.doc` download is an HTML file sent with `Content-Type: application/msword`. Microsoft Word will open it, but it is not a real DOCX. For a compliance document that a CAA inspector may examine, this is unacceptable.

Replace `buildWordDoc` (which produces HTML) with a real DOCX builder using the `docx` npm package. The output should include:
- Document title as the DOCX title property
- Revision label, date, and approver name in the document properties
- Each section as a properly styled Heading 2 with body paragraphs
- Updated sections highlighted with a yellow background and a "UPDATED" prefix in the heading

This is one contained change to one file and one new utility function. It has a significant compliance impact.

### Fix 3 — The Results Page Shows Historical Clutter
**File:** `src/app/(app)/updates/` (update queue page and components)

The queue currently shows all `proposed_updates` for the org. Approved items, rejected items, and weeks-old pending items appear alongside today's new findings.

Apply this filter as the hard default on the main queue page:
```
WHERE status = 'pending'
  AND ai_suggested_text IS NOT NULL
  AND created_at > NOW() - INTERVAL '90 days'
ORDER BY
  CASE risk_level WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
  created_at DESC
```

"Generating" items (`status = pending`, `ai_suggested_text IS NULL`) get a separate small section below the main list labelled "Preparing drafts…" with a spinner. They are not actionable yet.

Done and archived items are only visible via an explicit "View history" link that opens a separate archive view.

### Fix 4 — Training Forms Is in the Wrong Navigation Group
**File:** `src/components/navigation/AppShell.tsx` (and wherever nav links are defined)

Training forms, programmes, assignments, signoffs, and lessons are training management tools — not compliance tools. They should not share navigation space with the EASA update queue, flight books, and history.

Split the navigation into two explicit groups:

**Regulation Compliance** (primary group)
- Dashboard / Today's Work
- Update Queue
- Flight Books
- History (Time Machine)

**Training Management** (secondary group, collapsed by default on first visit)
- Programmes
- Lessons
- Forms
- Assignments
- Signoffs

Admin tools (Sources, AI Settings, Users, Billing, Automation) go into a third "Admin" group, accessible only to admin-role users.

### Fix 5 — No "Not Relevant to Us" Classification
**Files:** `src/app/api/findings/trash/route.ts`, new migration needed

Right now the only way to dismiss a finding is to trash it (soft-delete). There is no way to tell the system "our school never needs to see Part-CAT findings." So if Part-CAT changes, the pipeline creates a new finding for this org on every scan — even though the school told you last week it is not relevant.

Add an `org_finding_filters` table (see Phase 1 database changes below). Add a "Mark as not relevant to us" action on each finding card that lets the admin select a reason: "This regulation part does not apply to our school." Store the `category` and `reg_part` in the filter table. The pipeline checks this table before creating new findings for an org and skips matching categories.

---

## Phase 1 — Clean the Core Workflow

**Goal:** Fix what is broken or misleading. No new features yet. After Phase 1, the daily workflow exists as a coherent path from login to download.

**Rule check:** Every change in this phase directly serves Rule 1 (5-minute workflow) by removing friction, or Rule 2 (show only what needs action) by removing clutter.

---

### 1.1 — Redesign the Update Queue Page as the Primary Entry Point

**What to build:**
The Update Queue (`/updates`) becomes the default landing page after login for all non-admin roles. For admin roles, the dashboard remains the entry point but has a prominent card at the top: "N items need your review" with a direct link to the queue.

The queue page has three visible states:

**State A — Items to action** (the normal state)
A list of cards, one per pending proposed update with a generated draft. Sorted: high risk first, then medium, then low. Within each risk group, newest first. Each card shows:
- Risk badge (red HIGH / amber MEDIUM / green LOW)
- The regulation that changed (e.g., "Part-FCL AMC1 FCL.725 — Instrument Rating Recurrency")
- The matched section (e.g., "Section 4.3 of Manual D — Instrument Rating")
- AI confidence badge (High / Medium / Low)
- Two action buttons: "Review & Approve" and "Not relevant — dismiss"
- No other information on the card. Clicking "Review & Approve" opens the review panel.

**State B — All caught up** (queue is empty)
A clean, calm screen: "All caught up. No items need review." Below it, a small note: "Last scan: [timestamp]." Nothing else. No stats, no prompts to run another scan. The manager can log out.

**State C — Preparing** (pipeline just ran, drafts being generated)
A small section at the bottom of the page labelled "Preparing drafts for [N] new items…" with a progress indicator. These are not clickable yet.

**What to change in existing files:**
- Move the default redirect after login from `/dashboard` to `/updates` for non-admin users
- Add the "N items need your review" card to the dashboard for admin users
- Filter the queue query as described in Fix 3 above

---

### 1.2 — The Review Panel (Three-Part Structure)

**What to build:**
Every proposed update review panel must show exactly three sections, in this order. This implements Rule 3 directly.

**Section 1 — The Trigger**
What happened in the real world that caused this.
- A one-sentence plain-language summary: "EASA published an amendment to [regulation] on [date] modifying [what]."
- The original RSS or regulatory source title, with a clickable link to the source URL.
- The publication date.
- The full summary text from the RSS item or regulation snapshot, in a collapsible "Read more" block.

**Section 2 — The Match**
Why the AI chose this section of this flight book.
- The matched flight book name and section number/title.
- A short explanation: the `whyThisSection` field that already comes back from `generateDraftForProposedUpdate`.
- Confidence badge (High / Medium / Low) derived from the existing `confidence` value.
- The top 2–3 source citations (regulation chunks and flight book chunks) that the AI retrieved — shown as quoted excerpts with their section references. These already exist in `source_citations` on the proposed update row.
- If confidence is Low: a prominent amber banner reading "Low confidence match — please verify this section is the correct one before approving."

**Section 3 — The Draft**
The AI's proposed replacement text, compared to the current text.
- Side-by-side diff: current text on the left, proposed text on the right.
- Changed words or sentences highlighted.
- An "Edit before approving" button that converts the right panel into an editable text area.
- If the manager edits the text, the edited version is what gets written to the flight book — not the original AI output. The edit is stored and shown in the audit trail.
- Three action buttons: **Approve** (primary, green), **Not relevant — dismiss** (secondary, grey), **Request new draft** (tertiary, text link).

"Request new draft" re-runs the AI generation for this proposed update. It is for cases where the draft is clearly wrong and needs a fresh attempt. The manager can optionally add a note before requesting: "Focus on the recurrency hours, not the skill test requirement."

**What to change in existing files:**
- `src/components/results/ReviewPanel.tsx` — restructure to the three-section layout
- `src/app/api/findings/review-context/route.ts` — ensure it returns `whyThisSection`, `source_citations`, the RSS item's source URL, and the full RSS summary
- `src/components/updates/DiffViewer.tsx` — integrate into the review panel as Section 3, add editable mode

---

### 1.3 — The "Not Relevant" Action and Org Filters

**Database migration needed (new file):**
```sql
-- supabase/migrations/schema/032_org_finding_filters.sql

create table if not exists org_finding_filters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  filter_type text not null default 'category',  -- 'category' | 'reg_part' | 'source_id'
  filter_value text not null,                    -- e.g. 'Part-CAT', 'commercial_ops'
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists org_finding_filters_org_type_value_unique
  on org_finding_filters (organization_id, filter_type, filter_value);

alter table org_finding_filters enable row level security;

create policy "org_finding_filters read own" on org_finding_filters
  for select using (
    exists (
      select 1 from org_users
      where org_users.organization_id = org_finding_filters.organization_id
        and org_users.user_id = auth.uid()
    )
  );
```

**What to build:**
- New API route: `POST /api/findings/mark-not-relevant` — takes `findingId` and optional `filterCategory` / `filterRegPart`. Soft-deletes the finding AND optionally creates an `org_finding_filters` row.
- On each finding card in the queue: a "Not relevant — dismiss" button. When clicked, a small inline panel asks: "Dismiss this item only, or also hide future [Part-CAT] findings for your school?" Two radio options. Confirm button. No modal — inline only.
- The pipeline's `ai-analyze` Edge Function and `ensureQueuedUpdatesForOrg` must check `org_finding_filters` before creating new findings or proposed updates for an org.

---

### 1.4 — Flight Books Page Cleanup

**What to change in `src/components/flightbooks/FlightbooksBrowser.tsx`:**

Change section labels as described in Fix 1.

For the "Revised copies" section: instead of showing all exports in a grid, show one card per flight book — the most recent export. The card shows:
- Book name and doc type
- "Rev [version number] — [date]"
- "Updated sections: [N]" (count of sections that changed in this revision)
- Download button (primary)
- "View all versions ([N])" as a small link below the download button

Clicking "View all versions" expands an inline list of older exports for that book, oldest first, each with its own download button. This list is collapsed by default.

For the "Source documents" section: remove the delete button from the main card view. Delete is a destructive action and should only be accessible from inside the book's detail page, behind a confirmation step.

---

### Phase 1 Completion Checklist

Before moving to Phase 2, verify all four of these are true:

- [ ] Log in as a non-admin user → land on the Update Queue, not the dashboard
- [ ] Queue shows only pending items with drafts — no approved, no rejected, no items over 90 days
- [ ] Open a review item → see Trigger, Match, and Draft sections clearly
- [ ] Approve an item → download the revised copy → it is a proper DOCX with the update highlighted
- [ ] Dismiss an item as "not relevant to our school" → it does not reappear on the next pipeline run
- [ ] Navigation shows Compliance and Training as separate groups

---

## Phase 2 — Make the AI Smarter and More Transparent

**Goal:** The AI tells the user what it knows and why. The user controls what the AI pays attention to. The deduplication is bulletproof.

**Rule check:** Every change in this phase serves Rule 3 (AI is a tool, not a mystery) by making the AI's reasoning visible and controllable.

---

### 2.1 — Pipeline Scan Summary Card

**What to build:**
After every pipeline run (manual or scheduled), show a summary card at the top of the Update Queue page. It persists until the manager dismisses it.

The card shows:
- "Scan completed [time ago]"
- "[N] sources checked"
- "[N] were new findings — [N] added to your queue"
- "[N] were already known — skipped"
- "[N] were filtered by your school's exclusion rules"
- If any step failed: "[Step name] encountered an error — [plain English description]"

This makes the deduplication visible. "12 already known — skipped" is the app saying: "We did our job. We checked everything and found that most of it is old news." This builds trust.

**Where to get the data:**
The `pipeline_runs` table already tracks `items_processed`, `changes_found`, and per-step status in the `steps` JSONB column. Add two new fields to the pipeline result: `skipped_known` (items that matched the dedup constraint and were not re-inserted) and `skipped_filtered` (items blocked by `org_finding_filters`). Return these in the `runPipelineForOrganization` result and store them in `pipeline_runs`.

---

### 2.2 — Per-Org Regulatory Scope Settings

**What to build:**
In Admin → Settings, add a "Regulatory scope" section. A checklist of EASA regulation families:
- Part-FCL (Pilot licensing) — checked by default
- Part-MED (Medical certificates) — checked by default
- Part-ORA (Approved Training Organisations) — checked by default
- Part-DTO (Declared Training Organisations)
- Part-ARA (Authority requirements for aircrew)
- Part-ORO (Organisation requirements — operations)
- Part-CAT (Commercial air transport)
- Part-NCC (Non-commercial complex aircraft)
- Part-NCO (Non-commercial other aircraft)
- CS-FSTD(A) (Simulator certification)
- CS-FTL.1 (Flight time limitations)

Store the selected parts in the `org_finding_filters` table using `filter_type = 'reg_part'` for each excluded part. The pipeline skips findings whose `category` maps to an excluded regulation part before running AI analysis — saving AI API cost and keeping the queue clean.

Add a save button and a clear explanation: "Uncheck regulation parts that do not apply to your school. Future scans will ignore changes in those areas."

---

### 2.3 — Stable Deduplication Hash

**What to fix:**
The current fallback deduplication in `ensureQueuedUpdatesForOrg` matches on `ai_rationale` text — a string the AI wrote. If the AI slightly rephrases its summary between runs, the match fails and a duplicate proposed update is created.

**The fix:**
Add a `dedup_key` column to `proposed_updates`:
```sql
-- supabase/migrations/schema/033_proposed_updates_dedup_key.sql

alter table proposed_updates
  add column if not exists dedup_key text;

create unique index if not exists proposed_updates_org_dedup_key_unique
  on proposed_updates (organization_id, dedup_key)
  where dedup_key is not null;
```

When creating a new proposed update, compute:
```
dedup_key = sha256(org_id + ':' + rss_item_id + ':' + mapped_section)
```
This is stable across pipeline runs regardless of how the AI words its rationale. The unique index prevents the duplicate from being inserted. Use this as the primary dedup check; fall back to `ai_rationale` text match only if `rss_item_id` is not available.

---

### 2.4 — "Last Checked" Status Per Regulation Part

**What to build:**
On the dashboard, replace the current pipeline status card with a "Regulation monitoring" table. Each row is a regulation part that is in scope for this school. Columns:
- Regulation part name (e.g., "Part-FCL")
- Last checked timestamp
- Result: "No changes" (green) / "[N] new items" (amber) / "Error" (red)
- Next scheduled scan time

This tells the manager the system is running and covers their specific regulations. The current pipeline status card shows raw step names (`rss-ingest`, `ai-analyze`) that mean nothing to a non-technical user. This replaces it with information the user cares about.

**Where to get the data:**
The `pipeline_runs` table has step-level data. Extend it to store a per-regulation-part result breakdown in the `steps` JSONB. The `ai_findings.category` field already maps to regulation parts via `categoryToPart` in `src/lib/ai/retrieval.ts` — use this to group results.

---

### 2.5 — Confidence Score Standardisation

**What to fix:**
The AI currently returns confidence as a percentage string ("85%"), a text label ("high"), or sometimes null. The UI needs a stable three-level signal.

Add a computed display function used everywhere:
```
High (green):   confidence_score >= 70, or confidence text = 'high'
Medium (amber): confidence_score >= 40, or confidence text = 'medium'
Low (red):      confidence_score < 40, or confidence text = 'low', or null
```

Low confidence items in the queue get a red border on their card. In the review panel they show the amber banner: "Low confidence — please verify this is the correct section before approving." Low confidence items are never eligible for auto-approval, regardless of risk level.

---

### Phase 2 Completion Checklist

- [ ] After a pipeline run, the scan summary card appears showing new vs skipped counts
- [ ] Admin can set regulatory scope in Settings — Part-CAT deselected → no Part-CAT findings appear
- [ ] Running the pipeline twice in a row produces zero new findings on the second run (dedup works)
- [ ] Dashboard shows a per-regulation-part status table, not raw step names
- [ ] Low confidence findings have a red border and amber warning in the review panel

---

## Phase 3 — Polish for Real-World Use

**Goal:** The app is something you could hand to a CAA inspector as evidence of a compliant review process. The notifications close the loop. The audit report exists.

**Rule check:** Every change in this phase serves Rule 1 (5-minute workflow) by making the output trustworthy enough that no extra documentation is needed, and Rule 3 (AI is a tool) by preserving the human decision trail.

---

### 3.1 — The "Confirm No Action Needed" Dismissal

**What to build:**
Change the dismissal flow so that when a manager dismisses a finding, they are making an explicit compliance statement — not just clicking away something annoying.

When "Not relevant — dismiss" is clicked:
1. An inline confirmation appears (not a modal — inline, on the card).
2. It shows: "Confirm: I have reviewed this change and confirm no update to our manuals is required."
3. A text field: "Reason (optional)" — pre-filled with "This regulation part does not apply to our operation."
4. A "Confirm dismissal" button.

Store the dismissal with: `dismissed_by` (user ID), `dismissed_at` (timestamp), `dismissal_reason` (text). These fields are added to `ai_findings`:
```sql
-- supabase/migrations/schema/034_ai_findings_dismissal_audit.sql

alter table ai_findings
  add column if not exists dismissed_by uuid references auth.users(id) on delete set null,
  add column if not exists dismissal_reason text;
```

In the archive view, dismissed items show: "Dismissed by [name] on [date] — [reason]." This is audit trail evidence that every finding was reviewed, not ignored.

---

### 3.2 — The Compliance Audit Report

**What to build:**
A new page: `/reports` (visible to admin and compliance_manager roles).

The page has a simple form: date range selector (default: last 90 days), and a "Generate report" button.

The report is a PDF that contains:
1. Cover page: school name, reporting period, generated date, generated by.
2. Summary table: total regulation changes monitored, total findings generated, total approved, total dismissed with reason, total pending.
3. Approved changes section: for each approved update — the regulation that changed, the section updated, the previous text, the approved text, who approved it, when.
4. Dismissed with reason section: for each explicitly dismissed finding — the regulation, who dismissed it, when, and the stated reason.
5. Pending section: items currently awaiting review (as of report date).

This is exactly what a CAA inspector asks for during an audit: "Show me that you have a process for tracking regulatory changes and acting on them."

**How to build it:**
The data all exists across `ai_findings`, `proposed_updates`, `approvals`, `flightbook_section_versions`, and `org_users`. Use `jsPDF` (client-side, no new Edge Function needed for the initial version) or the existing PDF builder in the download route as a base. The report downloads as a PDF.

---

### 3.3 — Email Digest Notifications

**What to build:**
After every pipeline run that finds new items, send an email to all admin and compliance_manager users in the org. The email contains:
- Subject: "[School name] — [N] EASA regulation changes need your review"
- Body: a plain-text list of the new findings, each with: regulation part, section matched, risk level.
- A single call-to-action link: "Review now →" linking directly to the Update Queue.

If the pipeline finds nothing new: send no email. Do not send "all clear" emails on every scan — that trains users to ignore them.

Send a weekly summary email every Monday at 07:00 UTC regardless of whether there are new items, listing: items reviewed last week, items still pending, next scheduled scan.

**Where to add this:**
Extend `runPipelineForOrganization` in `src/lib/pipeline/run-org-pipeline.ts`. It already calls `insertAdminPipelineNotification` at the end of a run. Add an email send alongside the in-app notification. Use the existing Resend integration or Supabase built-in SMTP.

---

### 3.4 — Revised Copy — Proper Version Label and Approver Name

**What to fix:**
The generated DOCX export currently shows "Revision: Rev 0003 — 2026-05-25 14:32 UTC" as the only metadata. For a compliance document this is not enough.

The DOCX cover page should include:
- Document name and type
- Revision number and date
- "Approved by: [approver display name]"
- "Sections updated in this revision: [list of section numbers and titles]"
- "Based on EASA change: [regulation reference and publication date]"

The `flightbook_exports` table already stores `created_by` (user ID) and `proposed_update_id`. The proposed update links back to the finding, which links back to the RSS item. All the data for this metadata exists — it just needs to be assembled when generating the DOCX.

---

### 3.5 — Stale Item Auto-Archive

**What to build:**
Add a Supabase scheduled function (or extend the existing cron route) that runs once daily and sets `deleted_at = NOW()` on any `ai_findings` row where:
- `deleted_at IS NULL`
- `created_at < NOW() - INTERVAL '90 days'`
- No linked `proposed_updates` row with `status = 'approved'`

These are findings that were created, never actioned, and have sat for 90 days. They are auto-archived with `deleted_at` set and a `dismissal_reason` of `'auto-archived: no action after 90 days'`.

Add a notification to org admins when items are auto-archived: "3 findings were auto-archived after 90 days with no review. [View archived items]" — so nothing disappears silently.

---

### 3.6 — Mobile: Bottom Navigation and Swipe Review

**What to build:**
The daily compliance workflow is short enough to do on a phone. The two changes that make this work:

**Bottom navigation bar** for mobile viewports (below 768px): shows four items only — Today's Work (queue), Flight Books, History, and a "More" overflow for everything else. The current side navigation is hidden on mobile and replaced with this bar.

**Swipe gestures on review cards**: on mobile, swipe right to approve, swipe left to dismiss. A subtle visual indicator shows the swipe direction as the user drags. A "confirm" tap is still required — swipe reveals the confirm button, a second tap commits. This prevents accidental approvals.

---

### Phase 3 Completion Checklist

- [ ] Dismissing a finding shows the inline confirmation with reason text
- [ ] Archive shows dismissed items with dismisser name, date, and reason
- [ ] Generate a compliance report for the last 90 days — it is a properly formatted PDF
- [ ] Run the pipeline with new findings — admins receive an email with the queue link
- [ ] Download a revised copy — DOCX shows approver name and list of updated sections
- [ ] Items over 90 days with no action are auto-archived — admins notified
- [ ] On mobile: bottom nav visible, swipe-to-approve works with confirmation tap

---

## Database Migrations Summary

All new migrations for this build plan, in order:

| File | Purpose |
|------|---------|
| `032_org_finding_filters.sql` | Per-org exclusion rules for regulation parts and categories |
| `033_proposed_updates_dedup_key.sql` | Stable SHA-256 dedup key on proposed_updates |
| `034_ai_findings_dismissal_audit.sql` | dismissed_by and dismissal_reason on ai_findings |

These are additive — no existing columns or tables are removed.

---

## API Routes Summary

New and changed routes for this build plan:

| Route | Change |
|-------|--------|
| `POST /api/findings/mark-not-relevant` | New. Soft-deletes finding + optionally creates org_finding_filter. |
| `GET /api/findings/review-context` | Change. Add `whyThisSection`, `source_citations`, and full RSS summary to response. |
| `POST /api/findings/approve-update` | Change. Accept `editedText` — if present, use it instead of `approvedText` from AI. Store edit flag in version. |
| `GET /api/flightbooks/[id]/download` | Change. Replace `buildWordDoc` (HTML) with real DOCX using `docx` package. |
| `GET /api/reports/compliance` | New. Generates compliance audit PDF for a date range. |
| `GET /api/pipeline/summary` | New. Returns the most recent pipeline run summary formatted for the scan summary card. |
| `POST /api/org-filters` | New. CRUD for org_finding_filters (regulatory scope settings). |

---

## Component Changes Summary

| Component | Change |
|-----------|--------|
| `src/components/results/ReviewPanel.tsx` | Restructure to three-section layout: Trigger, Match, Draft. |
| `src/components/updates/DiffViewer.tsx` | Add editable mode for Section 3. |
| `src/components/flightbooks/FlightbooksBrowser.tsx` | Show one revised copy per book. Rename sections. Remove delete button from card view. |
| `src/components/navigation/AppShell.tsx` | Split nav into Compliance, Training, Admin groups. Add mobile bottom nav. |
| `src/components/dashboard/PipelineStatusCard.tsx` | Replace raw step names with per-regulation-part status table. |
| `src/app/(app)/updates/page.tsx` | Default filter to pending+drafted only. Add scan summary card. Add State B (all caught up). |

---

## New Pages

| Route | Purpose |
|-------|---------|
| `/reports` | Compliance audit report generator. Admin and compliance_manager roles only. |
| `/settings/scope` | Regulatory scope selector (which EASA parts apply to this school). |

---

## The Non-Negotiables

These constraints apply to every change in this build plan. Do not override them without a very specific reason.

1. **Never show an approved or dismissed item in the main queue.** Once actioned, it is archived. The queue is always short.
2. **Never auto-approve a low-confidence finding.** Confidence Low items always require a human decision, regardless of risk level or auto-approve settings.
3. **Every dismissal creates an audit record.** The manager's name, timestamp, and reason are always stored. Silent dismissal is not allowed after Phase 3.
4. **Every AI draft shows its source.** The review panel always shows the regulation reference and the matched section — never just a text block with no context.
5. **The download is always a real file.** The DOCX download is a real DOCX. The PDF download is a real PDF. HTML-disguised-as-doc is not acceptable for compliance documents.

---

## Immediate Next Steps (Start Here)

Work through these in order. Do not move to the next item until the current one is verified in the browser.

1. **Fix the navigation split** — separate Compliance and Training groups in AppShell. Verify on screen. (Phase 1, Fix 4)
2. **Fix the queue filter** — pending + drafted only, sorted by risk. Verify the queue shows only actionable items. (Phase 1, Fix 3)
3. **Fix the flight books labels** — rename sections, collapse old exports. Verify the page is readable. (Phase 1, Fix 1)
4. **Add the migration for org_finding_filters** — run in Supabase SQL Editor. (Phase 1, 1.3)
5. **Build the "Not relevant" dismissal action** — inline confirmation, reason text, filter creation. (Phase 1, 1.3)
6. **Restructure the review panel** — Trigger, Match, Draft sections. (Phase 1, 1.2)
7. **Replace the fake DOCX** — real docx package output with approver metadata. (Phase 1, Fix 2)
8. **Add the scan summary card** — after pipeline run, shows new vs skipped. (Phase 2, 2.1)
9. **Add regulatory scope settings** — checklist in Admin Settings. (Phase 2, 2.2)
10. **Add the dedup key migration and logic** — stable hash, not text match. (Phase 2, 2.3)
11. **Build the compliance audit report** — date range PDF export. (Phase 3, 3.2)
12. **Add dismissal audit fields and confirmation flow** — inline confirm, stored reason. (Phase 3, 3.1)
13. **Add email digest notifications** — triggered by pipeline run with new items. (Phase 3, 3.3)
14. **Add stale item auto-archive** — daily cron, 90-day threshold. (Phase 3, 3.5)
15. **Mobile navigation and swipe review** — bottom nav, swipe gestures. (Phase 3, 3.6)

---

## Cursor Technical Reference

> **Read this section before writing any code.** It defines the patterns every file in this codebase follows. Deviating from these patterns will break auth, multi-tenancy, or type safety.

---

### Auth and Org Context — How Every API Route Must Start

Every API route that reads or writes org-scoped data must begin with one of these context helpers from `src/lib/supabase/access.ts`. Do not invent an alternative.

```typescript
// Read-only access for any authenticated user in the org:
const ctx = await getOrgAccessContext();
if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// Write access for editors and admins only (ORG_APPROVER_ROLES = ["admin", "editor", "compliance_manager"]):
const ctx = await getOrgScopedContext(ORG_APPROVER_ROLES);
if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

// Admin-only actions:
const ctx = await getOrgAdminContext();
if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
```

`ctx` returns `{ userId: string, orgId: string, role: string }`. Use `ctx.orgId` on every DB query.

### Database Client — Always Use the Admin Client in API Routes

All API routes use the Supabase service-role client — not the browser anon client. This bypasses RLS at the server layer (RLS is enforced for browser-direct queries only).

```typescript
// Always import and use this in API routes:
import { getSupabaseAdminClient } from "@/lib/supabase/access";
const admin = getSupabaseAdminClient();

// Never use the browser client in API routes:
// import { createBrowserClient } from "@supabase/ssr"; // ← WRONG in API routes
```

### Role Constants

```typescript
// From src/lib/supabase/access.ts:
export const ORG_ADMIN_ROLES = ["admin"] as const;
export const ORG_APPROVER_ROLES = ["admin", "editor", "compliance_manager"] as const;
export const ORG_ROLLBACK_ROLES = ["admin", "compliance_manager"] as const;
```

The `compliance_manager` role has the same write access as `editor` plus rollback access. Both are in `ORG_APPROVER_ROLES`.

### DEFAULT_ORG_ID

```typescript
// From src/lib/supabase/org-membership.ts (re-exported by access.ts):
export const DEFAULT_ORG_ID = "00000000-0000-4000-8000-000000000001";
```

Used as a fallback when a user has no org membership yet. Flight book sections in the default org are visible to all orgs (shared seed data). When checking section ownership, allow access if `section.organization_id === ctx.orgId || section.organization_id === DEFAULT_ORG_ID`.

---

### Key Type Shapes

These are the exact TypeScript types from `src/lib/types/domain.ts` that Cursor must use for any component or API response involving these entities.

```typescript
// The full domain types file is at: src/lib/types/domain.ts
// Key types for this build plan:

type UpdateQueueItem = {
  id: string;
  classification: string;         // 'mandatory' | 'recommended' | 'watchlist'
  risk_level: string;              // 'high' | 'medium' | 'low'
  confidence_score: number | null; // 0–100 numeric, or null
  status: string;                  // 'pending' | 'approved' | 'rejected'
  ai_rationale: string | null;
  created_at: string;
  updated_at?: string;
  reg_changes: RegulationChangeSummary | null;
  flightbook_sections: FlightbookSectionSummary | null;
};

type FlightbookSummary = {
  id: string;
  name: string;
  doc_type: string;
  version_label: string | null;
  aircraft: string | null;
  manual_group: string | null;
  tags: string[];
  active: boolean;
  created_at: string;
  sectionCount: number;
  pendingUpdateCount?: number;
  generatedCopies?: FlightbookExportSummary[];   // versioned exports post-approval
};

type FlightbookExportSummary = {
  id: string;
  version_number: number;
  change_source: string;
  created_at: string;
  note: string | null;
};
```

For new types added in this build plan, add them to `src/lib/types/domain.ts` — do not define ad-hoc types inline in components.

---

### Review Context Shape

The `POST /api/findings/review-context` route calls `buildReviewPreview` in `src/lib/ai/review-preview.ts` and returns:

```typescript
// Current return shape (what exists today):
{
  ok: true,
  sectionId: string,
  sectionTitle: string | null,
  sectionNumber: string | null,
  flightbookName: string,
  currentBody: string,
  whyThisSection: string,   // currently hardcoded — Phase 1 fix: make dynamic
  citations: Array<{
    kind: "regulation_chunk" | "flightbook_section",
    id: string,
    score: number,
    section_number: string | null,
    title: string | null,
    flightbook_name: string | null,
    quote: string             // first 280 chars of the chunk body
  }>
}

// Missing fields to add in Phase 1 (changes to buildReviewPreview):
// — rssTitle: string | null        (from rss_items.title)
// — rssSummary: string | null      (from rss_items.summary)
// — rssLink: string | null         (from rss_items.link)
// — rssPublishedAt: string | null  (from rss_items.published_at)
// — regPart: string | null         (mapped from category via categoryToPart())
```

To add these: update the `buildReviewPreview` select query in `src/lib/ai/review-preview.ts` to also fetch `link` and `published_at` from `rss_items`, then include them in the return object.

---

### Installed Packages

```json
// From package.json — what is already installed:
"@supabase/ssr": "^0.8.0",
"@supabase/supabase-js": "^2.91.1",
"lucide-react": "^0.544.0",
"next": "16.1.4",
"openai": "^6.38.0",
"pdf-parse": "^1.1.1",
"resend": "^6.12.3",
"stripe": "^18.5.0",
"zod": "^4.4.3"
```

**Packages that need to be installed for this build plan:**
```bash
npm install docx           # real DOCX generation (Phase 1, Fix 2)
npm install jspdf          # compliance report PDF (Phase 3, 3.2)
```

Do not install `mammoth`, `html-docx-js`, or any other DOCX library — use `docx` only. Do not use `puppeteer` server-side — it is not available in the Next.js API route runtime.

---

### Styling Conventions

All UI uses the `--easa-*` CSS custom property token system defined in `docs/DESIGN_SYS.md`. Do not use hardcoded hex colours. Examples:

```
--easa-color-brand-primary      (primary brand blue)
--easa-color-accent-green       (success / approved)
--easa-color-accent-orange      (warning / medium risk)
--easa-color-accent-pink        (error / high risk / destructive)
--easa-color-accent-blue        (info / badges)
--easa-color-text-primary
--easa-color-text-muted
--easa-color-surface            (page background)
--easa-color-surface-2          (card / elevated surface)
--easa-color-border
```

Shared utility classes defined in global CSS:
- `easa-card` — standard card container
- `easa-btn primary` / `easa-btn secondary` — button variants
- `easa-badge` / `easa-badge is-green` / `is-orange` / `is-blue` / `is-muted` — status chips
- `easa-input` — form input

---

### Do Not Touch List

These files and systems must not be modified unless the task explicitly requires it. If Cursor identifies a reason to change one of these, stop and ask before proceeding.

| File / System | Reason to leave alone |
|---|---|
| `src/app/api/stripe/webhook/route.ts` | Live billing webhook — any break stops subscriptions |
| `supabase/migrations/rls/` | RLS policies protect tenant isolation — changes require testing with two separate logins |
| `src/lib/billing/subscription.ts` | Stripe subscription logic |
| `supabase/functions/` (Edge Functions) | Deployed separately via Supabase CLI — do not edit unless the task is specifically an Edge Function task |
| `src/app/api/auth/register-school/route.ts` | School registration — changes affect new customer onboarding |
| `src/lib/supabase/access.ts` | Core auth/org context — any change affects every route in the app |
| Any existing migration file | Migrations are immutable once applied — only add new migration files, never edit existing ones |

---

### Confidence Score Display Function

Add this utility to `src/lib/utils/` (new file `confidence.ts`) and use it everywhere a confidence level is displayed. Do not re-implement this logic inline in components.

```typescript
// src/lib/utils/confidence.ts

export type ConfidenceLevel = "high" | "medium" | "low";

export function getConfidenceLevel(score: number | null | undefined, label?: string | null): ConfidenceLevel {
  if (label) {
    const l = label.toLowerCase();
    if (l === "high") return "high";
    if (l === "low") return "low";
    if (l === "medium") return "medium";
  }
  if (score == null) return "low";
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export const confidenceConfig: Record<ConfidenceLevel, { label: string; badgeClass: string; borderClass: string }> = {
  high:   { label: "High confidence",   badgeClass: "easa-badge is-green",  borderClass: "" },
  medium: { label: "Medium confidence", badgeClass: "easa-badge is-orange", borderClass: "" },
  low:    { label: "Low confidence",    badgeClass: "easa-badge is-pink",   borderClass: "border-2 border-[var(--easa-color-accent-pink)]" },
};
```

---

### Navigation Structure — Current vs Target

**Current nav links** (in `AppShell.tsx`):
Dashboard, Updates, Flight Books, History, Search, Training (sub: Programmes, Lessons, Forms, Assignments, Signoffs, Acknowledgements), Admin (sub: Setup, Sources, AI, Automation, Users, Exports, Onboarding, Billing, Branding)

**Target nav structure after Phase 1, Fix 4:**

```
Regulation Compliance
  ├── Today's Work          (/updates)         — renamed from "Updates"
  ├── Flight Books          (/flightbooks)
  └── History               (/history)

Training Management                             — collapsed by default
  ├── Programmes            (/training/programmes)
  ├── Lessons               (/training/lessons)
  ├── Forms                 (/training/forms)
  ├── Assignments           (/training/assignments)
  └── Signoffs              (/training/signoffs)

Admin                                           — visible to admin role only
  ├── Setup                 (/admin#setup)
  ├── Sources               (/admin#sources)
  ├── AI Settings           (/admin#ai)
  ├── Regulatory Scope      (/settings/scope)   — new in Phase 2
  ├── Automation            (/admin#automation)
  ├── Users                 (/admin#users)
  ├── Exports               (/admin#exports)
  └── Billing               (/admin#billing)

Reports                                         — visible to admin + compliance_manager
  └── Compliance Report     (/reports)          — new in Phase 3
```

Mobile bottom nav (below 768px, 4 items only):
`Today's Work | Flight Books | History | ··· More`
