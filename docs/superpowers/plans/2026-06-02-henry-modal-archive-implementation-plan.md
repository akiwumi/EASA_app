# Henry Modal And Conversation Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the compliance drawer with Henry, a persistent draggable and resizable dashboard-style modal, add a once-per-login welcome bubble, and add private archive, restore, and permanent-delete conversation workflows.

**Architecture:** Extend `coworker_conversations` with `archived_at`, keep lifecycle operations inside the existing private repository, and expose a bounded conversation lifecycle route. Keep Henry mounted in `AppShell` so open state and loaded history survive authenticated navigation. Isolate desktop geometry in a small hook and use a separate authenticated archive page for restore and confirmed permanent deletion.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Supabase Postgres and RLS, Tailwind dashboard tokens, Node test runner, Playwright.

---

## File Map

Create:

```text
supabase/migrations/20260602143000_coworker_conversation_archive.sql
supabase/migrations/schema/038_coworker_conversation_archive.sql
src/app/api/coworker/conversations/[id]/route.ts
src/app/api/coworker/conversations/archive/route.ts
src/app/(app)/coworker/archive/page.tsx
src/components/coworker/CoworkerArchiveClient.tsx
src/components/coworker/HenryWelcomeBubble.tsx
src/components/coworker/useHenryModalGeometry.ts
tests/coworker-archive-regressions.test.mjs
scripts/check-henry-modal-flow.mjs
```

Modify:

```text
src/lib/coworker/conversations.ts
src/app/api/coworker/conversations/[id]/messages/route.ts
src/components/coworker/CoworkerProvider.tsx
src/components/coworker/CoworkerDrawer.tsx
src/components/coworker/CoworkerLauncher.tsx
src/components/coworker/ConversationList.tsx
src/components/navigation/AppShell.tsx
src/proxy.ts
```

## Task 1: Add Archive Storage

**Files:**
- Create: `supabase/migrations/20260602143000_coworker_conversation_archive.sql`
- Create: `supabase/migrations/schema/038_coworker_conversation_archive.sql`
- Test: `tests/coworker-archive-regressions.test.mjs`

- [ ] **Step 1: Write failing migration checks**

Create `tests/coworker-archive-regressions.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/20260602143000_coworker_conversation_archive.sql", "utf8");
const schemaMigration = fs.readFileSync("supabase/migrations/schema/038_coworker_conversation_archive.sql", "utf8");

test("archive migration adds archived_at and an active ordering index", () => {
  assert.match(migration, /add column if not exists archived_at timestamptz/);
  assert.match(migration, /coworker_conversations_active_user_updated_idx/);
  assert.match(migration, /where archived_at is null/);
  assert.equal(schemaMigration, migration);
});
```

- [ ] **Step 2: Run the failing check**

```bash
npm run test:unit
```

Expected: FAIL because the two archive migration files do not exist.

- [ ] **Step 3: Create both identical migration files**

Put this SQL into both migration files:

```sql
alter table coworker_conversations
  add column if not exists archived_at timestamptz;

create index if not exists coworker_conversations_active_user_updated_idx
  on coworker_conversations (organization_id, user_id, updated_at desc)
  where archived_at is null;

create index if not exists coworker_conversations_archived_user_updated_idx
  on coworker_conversations (organization_id, user_id, archived_at desc)
  where archived_at is not null;

notify pgrst, 'reload schema';
```

- [ ] **Step 4: Verify and commit**

```bash
npm run test:unit
git diff --check
git add supabase/migrations/20260602143000_coworker_conversation_archive.sql supabase/migrations/schema/038_coworker_conversation_archive.sql tests/coworker-archive-regressions.test.mjs
git commit -m "feat: add coworker conversation archive storage"
```

Expected: PASS.

## Task 2: Add Owned Archive Repository Operations

**Files:**
- Modify: `src/lib/coworker/conversations.ts`
- Modify: `tests/coworker-archive-regressions.test.mjs`

- [ ] **Step 1: Add failing repository assertions**

Append checks requiring:

```js
const conversations = fs.readFileSync("src/lib/coworker/conversations.ts", "utf8");

test("active and archived conversation reads stay private", () => {
  assert.match(conversations, /export async function listArchivedConversations/);
  assert.match(conversations, /\.is\("archived_at", null\)/);
  assert.match(conversations, /\.not\("archived_at", "is", null\)/);
  assert.match(conversations, /\.eq\("organization_id", ctx\.orgId\)/);
  assert.match(conversations, /\.eq\("user_id", ctx\.userId\)/);
});

test("archive lifecycle operations scope organization user and archive state", () => {
  assert.match(conversations, /export async function archiveOwnedConversation/);
  assert.match(conversations, /export async function restoreOwnedConversation/);
  assert.match(conversations, /export async function deleteArchivedOwnedConversation/);
  assert.match(conversations, /\.update\(\{ archived_at: new Date\(\)\.toISOString\(\) \}\)/);
  assert.match(conversations, /\.update\(\{ archived_at: null \}\)/);
  assert.match(conversations, /\.delete\(\)/);
});
```

- [ ] **Step 2: Run tests and confirm RED**

```bash
npm run test:unit
```

- [ ] **Step 3: Implement private repository functions**

Update `CONVERSATION_PROJECTION` to include `archived_at`. Filter `listConversations()` with:

```ts
.is("archived_at", null)
```

Add:

```ts
export async function listArchivedConversations(ctx: OrgAccessContext) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("coworker_conversations")
    .select(CONVERSATION_PROJECTION)
    .eq("organization_id", ctx.orgId)
    .eq("user_id", ctx.userId)
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function archiveOwnedConversation(ctx: OrgAccessContext, conversationId: string) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("coworker_conversations")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("organization_id", ctx.orgId)
    .eq("user_id", ctx.userId)
    .is("archived_at", null)
    .select(CONVERSATION_PROJECTION)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function restoreOwnedConversation(ctx: OrgAccessContext, conversationId: string) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("coworker_conversations")
    .update({ archived_at: null })
    .eq("id", conversationId)
    .eq("organization_id", ctx.orgId)
    .eq("user_id", ctx.userId)
    .not("archived_at", "is", null)
    .select(CONVERSATION_PROJECTION)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function deleteArchivedOwnedConversation(ctx: OrgAccessContext, conversationId: string) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("coworker_conversations")
    .delete()
    .eq("id", conversationId)
    .eq("organization_id", ctx.orgId)
    .eq("user_id", ctx.userId)
    .not("archived_at", "is", null)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}
```

Every query must scope:

```ts
.eq("id", conversationId)
.eq("organization_id", ctx.orgId)
.eq("user_id", ctx.userId)
```

Archive requires `.is("archived_at", null)`. Restore and delete require `.not("archived_at", "is", null)`.

Update `loadOwnedConversation()` with:

```ts
.is("archived_at", null)
```

This prevents archived chats from receiving messages or creating review provenance.

- [ ] **Step 4: Verify and commit**

```bash
npm run test:unit
git diff --check
git add src/lib/coworker/conversations.ts tests/coworker-archive-regressions.test.mjs
git commit -m "feat: add private coworker archive repository"
```

## Task 3: Add Conversation Lifecycle APIs

**Files:**
- Create: `src/app/api/coworker/conversations/[id]/route.ts`
- Create: `src/app/api/coworker/conversations/archive/route.ts`
- Modify: `tests/coworker-archive-regressions.test.mjs`

- [ ] **Step 1: Add failing route assertions**

Require:

```js
const archiveRoute = fs.readFileSync("src/app/api/coworker/conversations/archive/route.ts", "utf8");
const lifecycleRoute = fs.readFileSync("src/app/api/coworker/conversations/[id]/route.ts", "utf8");

test("archive routes authenticate validate and call owned repository operations", () => {
  assert.match(archiveRoute, /getOrgAccessContext/);
  assert.match(archiveRoute, /listArchivedConversations/);
  assert.match(lifecycleRoute, /isUuid\(id\)/);
  assert.match(lifecycleRoute, /archiveOwnedConversation/);
  assert.match(lifecycleRoute, /restoreOwnedConversation/);
  assert.match(lifecycleRoute, /deleteArchivedOwnedConversation/);
  assert.match(lifecycleRoute, /Invalid action/);
});
```

- [ ] **Step 2: Run tests and confirm RED**

```bash
npm run test:unit
```

- [ ] **Step 3: Implement routes**

`GET /api/coworker/conversations/archive` returns `{ conversations }`.

`PATCH /api/coworker/conversations/[id]` accepts:

```ts
{ action: "archive" | "restore" }
```

`DELETE /api/coworker/conversations/[id]` permanently deletes an archived owned chat.

Return `404` for invalid UUIDs, foreign chats, and invalid state transitions. Return generic `500` errors with server-side logging.

- [ ] **Step 4: Verify and commit**

```bash
npm run test:unit
git diff --check
git add src/app/api/coworker/conversations tests/coworker-archive-regressions.test.mjs
git commit -m "feat: add coworker archive lifecycle api"
```

## Task 4: Persist Henry State And Add Archive Actions

**Files:**
- Modify: `src/components/coworker/CoworkerProvider.tsx`
- Modify: `src/components/coworker/ConversationList.tsx`
- Test: `tests/coworker-archive-regressions.test.mjs`

- [ ] **Step 1: Add provider contract assertions**

Require the provider to expose:

```ts
archiveConversation(id: string)
restoreConversation(id: string)
deleteArchivedConversation(id: string)
```

Persist `activeConversationId` under:

```text
henry-active-conversation-id
```

- [ ] **Step 2: Run tests and confirm RED**

```bash
npm run test:unit
```

- [ ] **Step 3: Implement provider actions**

Add `archivedAt?: string | null` to `CoworkerConversation`.

After archiving:

1. reload active conversations
2. select newest active conversation
3. clear messages when none remain

Store selected active ID with:

```ts
window.localStorage.setItem("henry-active-conversation-id", id)
```

Remove stale IDs when the active list no longer contains them.

Update `ConversationList` labels to `Henry`, `Active conversations`, and `Archive conversation`.

- [ ] **Step 4: Verify and commit**

```bash
npm run test:unit
npx tsc --noEmit
git diff --check
git add src/components/coworker/CoworkerProvider.tsx src/components/coworker/ConversationList.tsx tests/coworker-archive-regressions.test.mjs
git commit -m "feat: add Henry conversation archive state"
```

## Task 5: Replace Drawer With Draggable Resizable Henry Modal

**Files:**
- Create: `src/components/coworker/useHenryModalGeometry.ts`
- Modify: `src/components/coworker/CoworkerDrawer.tsx`
- Modify: `src/components/coworker/CoworkerLauncher.tsx`
- Modify: `src/components/navigation/AppShell.tsx`
- Test: `tests/coworker-archive-regressions.test.mjs`

- [ ] **Step 1: Add static modal checks**

Require:

```js
const modal = fs.readFileSync("src/components/coworker/CoworkerDrawer.tsx", "utf8");
const geometry = fs.readFileSync("src/components/coworker/useHenryModalGeometry.ts", "utf8");

test("Henry modal supports saved desktop drag and resize", () => {
  assert.match(modal, /Henry/);
  assert.match(modal, /onPointerDown/);
  assert.match(geometry, /henry-modal-geometry/);
  assert.match(geometry, /localStorage/);
  assert.match(geometry, /resize/);
});
```

- [ ] **Step 2: Run tests and confirm RED**

```bash
npm run test:unit
```

- [ ] **Step 3: Create geometry hook**

Create `useHenryModalGeometry.ts` with:

```ts
type HenryGeometry = { x: number; y: number; width: number; height: number };
```

The hook must:

- load and save `henry-modal-geometry`
- clamp geometry to viewport
- use pointer events for drag and bottom-right resize
- expose header and resize-handle pointer callbacks
- disable desktop geometry below the dashboard mobile breakpoint

- [ ] **Step 4: Convert drawer markup into Henry modal**

Use the screenshot style:

- white rounded container
- soft shadow
- warm neutral inner surfaces
- circular close button
- subtle separators
- terracotta selected and action accents
- deep green primary buttons
- pill controls

Rename visible text and accessibility labels from compliance coworker to Henry.

Add:

```tsx
<Link href="/coworker/archive">Archive</Link>
```

Add bottom-right resize handle on desktop.

- [ ] **Step 5: Verify and commit**

```bash
npm run test:unit
npx tsc --noEmit
npm run build
git diff --check
git add src/components/coworker src/components/navigation/AppShell.tsx tests/coworker-archive-regressions.test.mjs
git commit -m "feat: replace coworker drawer with Henry modal"
```

## Task 6: Add Once-Per-Login Henry Welcome Bubble

**Files:**
- Create: `src/components/coworker/HenryWelcomeBubble.tsx`
- Modify: `src/components/navigation/AppShell.tsx`
- Modify: `tests/coworker-archive-regressions.test.mjs`

- [ ] **Step 1: Add failing welcome-bubble checks**

Require:

```js
const welcome = fs.readFileSync("src/components/coworker/HenryWelcomeBubble.tsx", "utf8");

test("Henry welcome bubble appears once per login session", () => {
  assert.match(welcome, /Hello, how can I help you\?/);
  assert.match(welcome, /sessionStorage/);
  assert.match(welcome, /openCoworker/);
});
```

- [ ] **Step 2: Run tests and confirm RED**

```bash
npm run test:unit
```

- [ ] **Step 3: Implement bubble**

Use session-storage key:

```text
henry-welcome-dismissed
```

Render near the persistent Henry launcher. Clicking the bubble opens Henry and stores dismissal. Clicking its close control stores dismissal without opening Henry.

- [ ] **Step 4: Verify and commit**

```bash
npm run test:unit
npx tsc --noEmit
git diff --check
git add src/components/coworker/HenryWelcomeBubble.tsx src/components/navigation/AppShell.tsx tests/coworker-archive-regressions.test.mjs
git commit -m "feat: add Henry login welcome bubble"
```

## Task 7: Add Archive Page

**Files:**
- Create: `src/app/(app)/coworker/archive/page.tsx`
- Create: `src/components/coworker/CoworkerArchiveClient.tsx`
- Modify: `src/proxy.ts`
- Modify: `tests/coworker-archive-regressions.test.mjs`

- [ ] **Step 1: Add failing archive-page checks**

Require:

```js
const archivePage = fs.readFileSync("src/components/coworker/CoworkerArchiveClient.tsx", "utf8");
const proxy = fs.readFileSync("src/proxy.ts", "utf8");

test("archive page restores and confirmation-gates permanent deletion", () => {
  assert.match(archivePage, /Restore/);
  assert.match(archivePage, /Delete permanently/);
  assert.match(archivePage, /confirm\(/);
  assert.match(proxy, /"\/coworker"/);
});
```

- [ ] **Step 2: Run tests and confirm RED**

```bash
npm run test:unit
```

- [ ] **Step 3: Implement archive page**

Create an authenticated page at:

```text
/coworker/archive
```

Use dashboard-style white rounded cards with:

- title
- archived timestamp
- restore button
- permanent delete button
- confirmation prompt before DELETE

Add `"/coworker"` to `PROTECTED_PREFIXES` in `src/proxy.ts`.

- [ ] **Step 4: Verify and commit**

```bash
npm run test:unit
npx tsc --noEmit
npm run build
git diff --check
git add src/app/'(app)'/coworker src/components/coworker/CoworkerArchiveClient.tsx src/proxy.ts tests/coworker-archive-regressions.test.mjs
git commit -m "feat: add Henry conversation archive page"
```

## Task 8: Extend Browser Smoke Verification

**Files:**
- Create: `scripts/check-henry-modal-flow.mjs`

- [ ] **Step 1: Add Playwright flow**

Follow `scripts/check-coworker-flow.mjs`. Verify:

```text
1. Login.
2. Confirm welcome bubble text.
3. Click bubble and confirm Henry opens.
4. Create and send a chat message.
5. Navigate to Flight books and confirm Henry stays open.
6. Drag Henry and confirm its bounding box changes.
7. Resize Henry and confirm its bounding box changes.
8. Archive the open conversation.
9. Open /coworker/archive.
10. Restore the conversation.
11. Confirm it returns to Henry active conversations.
```

- [ ] **Step 2: Run local verification**

```bash
npm run dev
node scripts/check-henry-modal-flow.mjs
```

Expected: all steps PASS after applying the archive migration.

- [ ] **Step 3: Commit**

```bash
git add scripts/check-henry-modal-flow.mjs
git commit -m "test: add Henry modal archive smoke flow"
```

## Task 9: Final Verification And Manual SQL Step

- [ ] **Step 1: Run automated checks**

```bash
npm run test:unit
npx tsc --noEmit
npm run build
git diff --check
npm run lint -- --quiet
```

Expected:

- unit tests pass
- TypeScript passes
- build passes
- diff check passes
- lint may still report the existing unrelated `src/components/home/FeaturesSection.tsx:59` issue

- [ ] **Step 2: Apply archive migration manually**

Paste this file into Supabase SQL Editor and click `Run`:

```text
supabase/migrations/schema/038_coworker_conversation_archive.sql
```

- [ ] **Step 3: Rerun browser flow**

```bash
node scripts/check-henry-modal-flow.mjs
```

Expected: all steps PASS.
