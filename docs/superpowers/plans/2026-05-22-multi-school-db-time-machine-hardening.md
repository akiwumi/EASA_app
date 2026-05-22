# Multi-School DB and Time Machine Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make school registration and sub-accounts production-safe, add explicit multi-school switching, harden Supabase schema/index/RLS behavior for many schools and uploaded books, and repair the Time Machine compare/rollback/history flow.

**Architecture:** Keep Supabase as the system of record. Introduce explicit active-organization selection in the app layer, preserve `org_users` as membership authority, add DB constraints/indexes through idempotent migrations, and make Time Machine read/write paths org-scoped end to end. Verification uses unit tests for pure helpers, API-level tests for access checks, and a manual smoke path against local/dev Supabase.

**Tech Stack:** Next.js App Router, TypeScript, Supabase Auth/Postgres/Storage/RLS, pgvector, Node test scripts, Playwright/UI smoke checks where useful.

---

## Current Findings

- School registration exists in `src/app/api/auth/register-school/route.ts`; it creates a Supabase auth user, `organizations` row, `org_users` admin membership, subscription/default pipeline rows, and branding.
- Sub-accounts exist in `src/app/api/admin/users/route.ts` and `src/components/admin/UsersTab.tsx`; admins can invite staff and create student logins.
- Multi-org membership is structurally possible, but `src/lib/supabase/access.ts` calls `pickPreferredOrgMembership()` and silently chooses one org. There is no active school selector.
- Time Machine exists at `src/app/(app)/history/page.tsx`; `src/app/(app)/dashboard/time-machine/page.tsx` is only a small dashboard panel, not the full Time Machine.
- `src/app/api/history/compare/route.ts` authenticates the user but does not check that both compared versions belong to the user's active organization.
- `src/app/api/rollback/route.ts` checks role, but reads the target version before verifying the section belongs to `ctx.orgId`. It should scope the target version lookup by organization too.
- Version history is likely fragile if migrations were not run in order. `supabase/migrations/schema/024_flightbook_section_version_repair.sql` adds repair/backfill behavior, but app code should also handle missing rows and provide diagnostics.
- Scale indexes exist for some hot paths, but membership, book listing, section lookup, version history, and exports should get explicit composite indexes and uniqueness constraints for many schools/books.

## Files to Modify

- `src/lib/supabase/org-membership.ts`: add membership normalization and active-org selection helper.
- `src/lib/supabase/access.ts`: respect an active organization cookie/query choice instead of always auto-picking.
- `src/app/api/orgs/route.ts`: new API for listing memberships and selecting active org.
- `src/components/navigation/AppShell.tsx`: add school selector when user belongs to multiple schools.
- `src/app/api/admin/users/route.ts`: tighten membership creation, duplicate handling, and errors.
- `src/app/(app)/history/page.tsx`: make history load clearer, add empty-state diagnostics, use active org.
- `src/app/api/history/compare/route.ts`: require both versions to belong to active org and preferably same section unless cross-section compare is intentionally supported.
- `src/app/api/rollback/route.ts`: scope target lookup by org, prevent no-op rollbacks, refresh embeddings after rollback, make export failure visible without losing rollback.
- `src/components/history/HistoryClient.tsx`: label section/book clearly and block invalid compare selections.
- `src/components/history/ComparePanel.tsx`: surface API errors with actionable text.
- `src/components/history/RollbackButton.tsx`: show rollback/export result.
- `supabase/migrations/schema/031_multi_school_scale_hardening.sql`: new idempotent constraints/indexes/RLS adjustments.
- `tests/org-membership.test.mjs`: new tests for active-org choice.
- `tests/time-machine-access.test.mjs`: new tests for route helper behavior if helpers are extracted.
- `docs/SUPABASE_SQL_NOVICE_GUIDE.md`: add migration checklist and repair/diagnostic queries.

---

### Task 1: Add Active Organization Selection

**Files:**
- Modify: `src/lib/supabase/org-membership.ts`
- Modify: `src/lib/supabase/access.ts`
- Create: `src/app/api/orgs/route.ts`
- Test: `tests/org-membership.test.mjs`

- [ ] **Step 1: Write membership helper tests**

Create `tests/org-membership.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_ORG_ID, pickPreferredOrgMembership } from "../src/lib/supabase/org-membership.ts";

test("pickPreferredOrgMembership prefers active org when present", () => {
  const rows = [
    { organization_id: DEFAULT_ORG_ID, role: "admin" },
    { organization_id: "11111111-1111-4111-8111-111111111111", role: "viewer" },
  ];
  assert.equal(
    pickPreferredOrgMembership(rows, "11111111-1111-4111-8111-111111111111")?.organization_id,
    "11111111-1111-4111-8111-111111111111",
  );
});

test("pickPreferredOrgMembership ignores active org when user is not a member", () => {
  const rows = [{ organization_id: "22222222-2222-4222-8222-222222222222", role: "admin" }];
  assert.equal(
    pickPreferredOrgMembership(rows, "33333333-3333-4333-8333-333333333333")?.organization_id,
    "22222222-2222-4222-8222-222222222222",
  );
});
```

- [ ] **Step 2: Update helper signature**

Change `src/lib/supabase/org-membership.ts` to accept an optional active org:

```ts
export function pickPreferredOrgMembership<T extends OrgMembershipLike>(
  rows: T[] | null | undefined,
  activeOrganizationId?: string | null,
): T | null {
  if (!rows?.length) return null;

  if (activeOrganizationId) {
    const active = rows.find((row) => row.organization_id === activeOrganizationId);
    if (active) return active;
  }

  return rows.find((row) => row.organization_id && row.organization_id !== DEFAULT_ORG_ID) ?? rows[0] ?? null;
}
```

- [ ] **Step 3: Read active org from cookie**

In `src/lib/supabase/access.ts`, import `cookies` from `next/headers`, read `active_org_id`, and pass it into `pickPreferredOrgMembership(orgUsers, activeOrgId)`. If the cookie points to an org the user is not in, ignore it.

- [ ] **Step 4: Add org listing/select API**

Create `src/app/api/orgs/route.ts`:

```ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/access";

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase?.auth.getUser() ?? { data: { user: null } };
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("org_users")
    .select("organization_id, role, organizations(id, name, created_at)")
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ memberships: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase?.auth.getUser() ?? { data: { user: null } };
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { organizationId } = await request.json() as { organizationId?: string };
  if (!organizationId) return NextResponse.json({ error: "organizationId required" }, { status: 400 });

  const admin = getSupabaseAdminClient();
  const { data: membership, error } = await admin
    .from("org_users")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!membership) return NextResponse.json({ error: "Not a member of that school." }, { status: 403 });

  const jar = await cookies();
  jar.set("active_org_id", organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Run tests**

Run: `npm test -- --runInBand` if configured, otherwise `node --test tests/org-membership.test.mjs`.

Expected: helper tests pass.

---

### Task 2: Add School Switcher UI

**Files:**
- Modify: `src/components/navigation/AppShell.tsx`
- Optionally create: `src/components/navigation/SchoolSwitcher.tsx`

- [ ] **Step 1: Create a focused client component**

Create `src/components/navigation/SchoolSwitcher.tsx` that fetches `/api/orgs`, shows a compact `<select>` only when there are two or more memberships, posts selected `organizationId` to `/api/orgs`, then reloads.

- [ ] **Step 2: Mount it in AppShell**

Add the switcher near the existing organization name in `src/components/navigation/AppShell.tsx`. Keep single-school users unchanged.

- [ ] **Step 3: Verify behavior**

Manual check:

1. Log in as a user with two `org_users` rows.
2. Switch school.
3. Confirm dashboard, flightbooks, settings, and history all show the selected school's data.

---

### Task 3: Harden DB Constraints and Indexes for Growth

**Files:**
- Create: `supabase/migrations/schema/031_multi_school_scale_hardening.sql`
- Modify: `docs/SUPABASE_SQL_NOVICE_GUIDE.md`

- [ ] **Step 1: Add idempotent migration**

Create `supabase/migrations/schema/031_multi_school_scale_hardening.sql`:

```sql
-- Multi-school scale hardening: memberships, manuals, versions, and exports.

create unique index if not exists org_users_org_user_unique
  on org_users (organization_id, user_id);

create index if not exists org_users_user_org_idx
  on org_users (user_id, organization_id);

create index if not exists organizations_created_idx
  on organizations (created_at desc);

create index if not exists flightbooks_org_active_created_idx
  on flightbooks (organization_id, active, created_at desc);

create index if not exists flightbooks_org_name_idx
  on flightbooks (organization_id, lower(name));

create index if not exists flightbook_sections_org_book_sort_idx
  on flightbook_sections (organization_id, flightbook_id, sort_order);

create index if not exists flightbook_sections_org_updated_idx
  on flightbook_sections (organization_id, updated_at desc);

create index if not exists flightbook_section_versions_org_created_idx
  on flightbook_section_versions (organization_id, created_at desc);

create index if not exists flightbook_section_versions_section_version_idx
  on flightbook_section_versions (flightbook_section_id, version_number desc);

create index if not exists flightbook_exports_org_book_created_idx
  on flightbook_exports (organization_id, flightbook_id, created_at desc);

create index if not exists proposed_updates_org_status_created_idx
  on proposed_updates (organization_id, status, created_at desc);
```

- [ ] **Step 2: Add diagnostic SQL to docs**

Add a section to `docs/SUPABASE_SQL_NOVICE_GUIDE.md`:

```sql
select organization_id, count(*) as users
from org_users
group by organization_id
order by users desc;

select organization_id, count(*) as books
from flightbooks
group by organization_id
order by books desc;

select organization_id, count(*) as sections
from flightbook_sections
group by organization_id
order by sections desc;

select organization_id, count(*) as versions
from flightbook_section_versions
group by organization_id
order by versions desc;
```

- [ ] **Step 3: Apply migration in dev**

Run: `supabase db push`.

Expected: migration applies cleanly; no duplicate membership rows block the unique index. If duplicates exist, inspect and merge them before retrying.

---

### Task 4: Repair Time Machine Access and Compare

**Files:**
- Modify: `src/app/api/history/compare/route.ts`
- Modify: `src/components/history/HistoryClient.tsx`
- Modify: `src/components/history/ComparePanel.tsx`

- [ ] **Step 1: Scope compare API by active org**

In `src/app/api/history/compare/route.ts`, replace raw user auth with `getOrgAccessContext()`. Query versions with `.eq("organization_id", ctx.orgId)`. Return `404` if either version is outside the active school.

- [ ] **Step 2: Enforce same-section compare**

After loading both versions, check:

```ts
if (data[0].flightbook_section_id !== data[1].flightbook_section_id) {
  return NextResponse.json(
    { error: "Select two versions of the same section to compare." },
    { status: 400 },
  );
}
```

- [ ] **Step 3: Disable invalid UI selections**

In `src/components/history/HistoryClient.tsx`, when compare mode has one selected version, disable rows where `flightbook_section_id` differs from the selected row. Show helper text: `Select another version of the same section.`

- [ ] **Step 4: Improve error display**

In `src/components/history/ComparePanel.tsx`, display API `json.error` verbatim in the modal body, so users know whether the issue is permissions, missing versions, or cross-section selection.

- [ ] **Step 5: Manual smoke test**

1. Open `/history`.
2. Select two versions for the same section.
3. Confirm diff loads.
4. Select versions from different sections.
5. Confirm UI blocks it, or API returns clear `400`.

---

### Task 5: Repair Rollback Safety

**Files:**
- Modify: `src/app/api/rollback/route.ts`
- Modify: `src/components/history/RollbackButton.tsx`
- Modify: `src/lib/ai/embeddings.ts` only if existing helper cannot refresh one section cleanly.

- [ ] **Step 1: Scope target version by org**

Change target lookup:

```ts
const { data: targetVersion, error: tvErr } = await admin
  .from("flightbook_section_versions")
  .select("body, version_number, organization_id")
  .eq("organization_id", ctx.orgId)
  .eq("flightbook_section_id", sectionId)
  .eq("version_number", targetVersionNumber)
  .maybeSingle();
```

- [ ] **Step 2: Prevent no-op rollback**

After current section load:

```ts
if ((section.body as string) === (targetVersion.body as string)) {
  return NextResponse.json({ error: "Section already matches that version." }, { status: 409 });
}
```

- [ ] **Step 3: Update section with org scope**

Change update to:

```ts
const { error: updateErr } = await admin
  .from("flightbook_sections")
  .update({ body: targetVersion.body, updated_at: new Date().toISOString() })
  .eq("id", sectionId)
  .eq("organization_id", ctx.orgId);
```

- [ ] **Step 4: Refresh embeddings after rollback**

Call the existing section embedding helper after update so search/RAG sees the restored text.

- [ ] **Step 5: Expose export warnings**

Store the result of `createFlightbookExport()`. If it fails, return `{ ok: true, exportWarning: result.error }` so the UI can show that rollback succeeded but export retention failed.

---

### Task 6: Make Version History Reliable

**Files:**
- Modify: `supabase/migrations/schema/024_flightbook_section_version_repair.sql`
- Create: `supabase/migrations/schema/032_time_machine_diagnostics.sql` if SQL functions are useful
- Modify: `src/app/(app)/history/page.tsx`

- [ ] **Step 1: Confirm trigger exists in migration**

Keep `trg_snapshot_flightbook_section_version` before update of `flightbook_sections.body`. Confirm it does not double-insert when app code already snapshots.

- [ ] **Step 2: Add history diagnostics to UI empty state**

In `src/app/(app)/history/page.tsx`, distinguish:

- no flightbooks uploaded
- flightbooks uploaded but no section rows
- sections exist but no version rows

Use existing admin queries scoped by `ctx.orgId`.

- [ ] **Step 3: Add repair command to docs**

Document running `supabase/sql/repair_flightbook_section_versions.sql` in Supabase SQL Editor for existing projects with missing history.

---

### Task 7: Harden Uploads for Many Books

**Files:**
- Modify: `src/app/api/flightbooks/upload/route.ts`
- Modify: `src/components/flightbooks/FlightbookUpload.tsx`
- Optional create: `src/lib/flightbooks/import-limits.ts`

- [ ] **Step 1: Add explicit upload limits**

Set a max parsed section count per upload and max section body length before DB insert. Return a clear `413` or `400` with section counts.

- [ ] **Step 2: Insert sections in batches**

Replace one large `.insert(rows)` call with batches of 250 rows. Keep embeddings batched too.

- [ ] **Step 3: Make partial failure impossible**

If storage succeeds but DB insert fails, delete the uploaded storage object, or mark `flightbooks.import_status = 'failed'` in a new migration. Prefer cleanup for now to avoid schema sprawl.

- [ ] **Step 4: Verify upload smoke**

Upload:

- small `.md`
- PDF
- large multi-section `.md`

Expected: no request timeout, book row created, sections created, original stored in `flightbooks` bucket, embeddings best-effort.

---

### Task 8: Regression Tests and Smoke Checks

**Files:**
- Modify: `package.json`
- Create: `tests/time-machine-smoke.test.mjs` if local Supabase test env is available
- Modify: `scripts/ui-audit.mjs`

- [ ] **Step 1: Add test scripts**

Add scripts:

```json
{
  "test:unit": "node --test tests/*.test.mjs",
  "test:build": "npm run build"
}
```

- [ ] **Step 2: Add Time Machine route to UI audit**

Ensure `scripts/ui-audit.mjs` visits:

- `/history`
- `/dashboard/time-machine`
- `/flightbooks`
- `/settings?tab=users`

- [ ] **Step 3: Run verification**

Run:

```bash
npm run test:unit
npm run build
npm run dev
```

Then open `/history` and verify the smoke path manually.

---

## Rollout Order

1. DB migration `031_multi_school_scale_hardening.sql`.
2. Active-org helper and `/api/orgs`.
3. School switcher UI.
4. Time Machine compare and rollback security fixes.
5. History diagnostics and upload scale hardening.
6. Test/build/UI audit.

## Risks

- Existing duplicate `org_users` rows may block the unique index. Resolve duplicates before applying migration.
- Existing databases may be missing `flightbook_section_versions` rows. Run repair/backfill SQL before expecting Time Machine to show old history.
- Compare/rollback currently use service-role admin clients; every route must scope by `ctx.orgId` because RLS is bypassed by service role.
- Direct student account creation requires service-role key. Production deploy must protect admin routes and avoid exposing service-role credentials client-side.

## Done Criteria

- A user in two schools can switch active school and sees data change everywhere.
- Users cannot compare or roll back versions outside their active school.
- Time Machine shows clear diagnostics instead of a generic empty/failure state.
- Rollback creates a new version snapshot, updates body, refreshes embeddings, writes audit/notifications, and creates/export-warns full-book export.
- Uploading many books/sections remains fast enough and does not leave orphaned storage objects on failure.
- `npm run build` and unit tests pass.
