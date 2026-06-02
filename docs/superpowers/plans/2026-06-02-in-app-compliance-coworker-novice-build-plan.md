# In-App Compliance Coworker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private, saved, in-app compliance coworker that answers grounded manual questions, summarizes pending findings, explains findings, previews draft updates, and creates review items only after an explicit user click.

**Architecture:** Add a persistent right-hand drawer to the authenticated app shell. A controlled server-side intent router invokes a small allowlist of existing compliance services. Saved chats live in two Supabase tables protected by user-private RLS. Approval remains in the existing `/updates` review flow.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Postgres and RLS, existing OpenAI-compatible provider settings, Node test runner, Playwright browser verification.

---

## Read This First

This plan is written for a novice coder. Follow tasks in order. Do not skip the verification commands.

The codebase already contains the difficult compliance pieces:

- grounded search in `src/services/search.ts`
- retrieval in `src/lib/ai/retrieval.ts`
- finding review context in `src/lib/ai/review-preview.ts`
- draft generation in `src/lib/ai/proposed-updates.ts`
- queue creation in `src/app/api/findings/add-to-queue/route.ts`
- authenticated shell in `src/components/navigation/AppShell.tsx`

The new feature should wrap these pieces. Do not create a second compliance engine.

### How To Use This Plan

There are two kinds of steps:

- **Coding steps:** ask Codex to execute one task at a time. Example: `Please execute Task 1 from the in-app compliance coworker plan, run the checks, and stop for review.`
- **Manual steps:** perform these yourself in Supabase, Vercel, or the browser. The plan labels these sections clearly.

Recommended path for a novice:

1. Ask Codex to execute Tasks 1 to 8 one at a time.
2. Review the reported checks after each task.
3. Perform `Manual Supabase Setup`.
4. Perform `Manual Local Test`.
5. Ask Codex to run the final automated checks.
6. Perform `Manual Vercel Deployment`.

## Manual Preparation

- [ ] **Step 1: Open Terminal and enter the project folder**

```bash
cd "/Users/eugene/WebDev Archive/EASA_app"
```

- [ ] **Step 2: Confirm the project is healthy before changing code**

```bash
npm run test:unit
npm run build
git status --short
```

Expected:

- unit tests pass
- production build passes
- `docs/viktor_ai_coworker_slack_build_plan.md` may appear as an untracked file; leave it untouched

- [ ] **Step 3: Create a working branch**

```bash
git checkout -b codex/in-app-compliance-coworker
```

- [ ] **Step 4: Check your local environment file**

Open `.env.local`. It must contain:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

Never commit `.env.local`. Never paste `SUPABASE_SERVICE_ROLE_KEY` into browser-side code.

---

## File Map

Create:

```text
supabase/migrations/schema/037_coworker_conversations.sql
supabase/migrations/20260602120000_coworker_conversations.sql
src/lib/coworker/response-types.ts
src/lib/coworker/classify-intent.ts
src/lib/coworker/conversations.ts
src/lib/coworker/tools.ts
src/lib/coworker/orchestrate-message.ts
src/lib/findings/queue-finding.ts
src/app/api/coworker/conversations/route.ts
src/app/api/coworker/conversations/[id]/messages/route.ts
src/app/api/coworker/actions/create-review-item/route.ts
src/components/coworker/CoworkerProvider.tsx
src/components/coworker/CoworkerDrawer.tsx
src/components/coworker/CoworkerLauncher.tsx
src/components/coworker/ConversationList.tsx
src/components/coworker/MessageTimeline.tsx
src/components/coworker/Composer.tsx
src/components/coworker/SourceLinks.tsx
src/components/coworker/FindingCard.tsx
src/components/coworker/DraftPreviewCard.tsx
tests/coworker-intent.test.mjs
tests/coworker-security-regressions.test.mjs
scripts/check-coworker-flow.mjs
```

Modify:

```text
src/lib/ai/proposed-updates.ts
src/app/api/findings/add-to-queue/route.ts
src/components/navigation/AppShell.tsx
```

---

## Task 1: Add Private Conversation Storage

**Files:**

- Create: `supabase/migrations/schema/037_coworker_conversations.sql`
- Create: `supabase/migrations/20260602120000_coworker_conversations.sql`
- Test: run SQL manually in Supabase after code review

- [ ] **Step 1: Create the schema migration**

Put this SQL into both migration files:

```sql
create table if not exists coworker_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists coworker_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references coworker_conversations(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  intent text,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists coworker_conversations_user_updated_idx
  on coworker_conversations (organization_id, user_id, updated_at desc);

create index if not exists coworker_messages_conversation_created_idx
  on coworker_messages (conversation_id, created_at asc);

alter table coworker_conversations enable row level security;
alter table coworker_messages enable row level security;

drop policy if exists "coworker conversations own select" on coworker_conversations;
create policy "coworker conversations own select" on coworker_conversations
  for select using (
    user_id = auth.uid()
    and exists (
      select 1 from org_users ou
      where ou.organization_id = coworker_conversations.organization_id
        and ou.user_id = auth.uid()
    )
  );

drop policy if exists "coworker conversations own insert" on coworker_conversations;
create policy "coworker conversations own insert" on coworker_conversations
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from org_users ou
      where ou.organization_id = coworker_conversations.organization_id
        and ou.user_id = auth.uid()
    )
  );

drop policy if exists "coworker conversations own update" on coworker_conversations;
create policy "coworker conversations own update" on coworker_conversations
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "coworker messages own select" on coworker_messages;
create policy "coworker messages own select" on coworker_messages
  for select using (
    user_id = auth.uid()
    and exists (
      select 1 from coworker_conversations c
      where c.id = coworker_messages.conversation_id
        and c.user_id = auth.uid()
        and c.organization_id = coworker_messages.organization_id
    )
  );

drop policy if exists "coworker messages own insert" on coworker_messages;
create policy "coworker messages own insert" on coworker_messages
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from coworker_conversations c
      where c.id = coworker_messages.conversation_id
        and c.user_id = auth.uid()
        and c.organization_id = coworker_messages.organization_id
    )
  );

grant select, insert, update, delete on coworker_conversations to authenticated, service_role;
grant select, insert, update, delete on coworker_messages to authenticated, service_role;

notify pgrst, 'reload schema';
```

- [ ] **Step 2: Check the migration file exists**

```bash
ls supabase/migrations/schema/037_coworker_conversations.sql
ls supabase/migrations/20260602120000_coworker_conversations.sql
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/schema/037_coworker_conversations.sql supabase/migrations/20260602120000_coworker_conversations.sql
git commit -m "feat: add private coworker conversation storage"
```

---

## Task 2: Define Responses And Controlled Intents

**Files:**

- Create: `src/lib/coworker/response-types.ts`
- Create: `src/lib/coworker/classify-intent.ts`
- Test: `tests/coworker-intent.test.mjs`

- [ ] **Step 1: Write failing classifier tests**

Create `tests/coworker-intent.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { classifyCoworkerIntent } from "../src/lib/coworker/classify-intent.ts";

test("routes queue questions to pending findings", () => {
  assert.equal(classifyCoworkerIntent("Which pending findings need attention?").intent, "list_pending_findings");
});

test("routes finding explanations when a finding id is supplied", () => {
  assert.equal(classifyCoworkerIntent("Explain why this affects our manual", { findingId: "finding-1" }).intent, "explain_finding");
});

test("routes draft requests when a finding id is supplied", () => {
  assert.equal(classifyCoworkerIntent("Draft wording for this section", { findingId: "finding-1" }).intent, "preview_draft_update");
});

test("never treats approval text as a chat mutation", () => {
  assert.equal(classifyCoworkerIntent("Approve this update now").intent, "unsupported");
});

test("routes ordinary questions to grounded manual search", () => {
  assert.equal(classifyCoworkerIntent("What does our PPL manual say about solo flights?").intent, "manual_question");
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
npm run test:unit
```

Expected: failure because `src/lib/coworker/classify-intent.ts` does not exist.

- [ ] **Step 3: Add response types**

Create `src/lib/coworker/response-types.ts`:

```ts
export type CoworkerIntent =
  | "manual_question"
  | "list_pending_findings"
  | "explain_finding"
  | "preview_draft_update"
  | "unsupported";

export type CoworkerCitation = {
  label: string;
  href: string;
  excerpt: string;
};

export type CoworkerCard =
  | { type: "finding"; findingId: string; title: string; summary: string; href: string }
  | { type: "draft"; findingId: string; sectionId: string; title: string; currentText: string; proposedText: string; rationale: string };

export type CoworkerResponse = {
  conversationId: string;
  messageId: string;
  intent: CoworkerIntent;
  content: string;
  citations: CoworkerCitation[];
  cards: CoworkerCard[];
};
```

- [ ] **Step 4: Add a deterministic classifier**

Create `src/lib/coworker/classify-intent.ts`:

```ts
import type { CoworkerIntent } from "@/lib/coworker/response-types";

export function classifyCoworkerIntent(
  text: string,
  context?: { findingId?: string | null },
): { intent: CoworkerIntent } {
  const value = text.toLowerCase();
  if (/\b(approve|reject|apply|publish|delete)\b/.test(value)) return { intent: "unsupported" };
  if (context?.findingId && /\b(draft|wording|rewrite|revise)\b/.test(value)) return { intent: "preview_draft_update" };
  if (context?.findingId && /\b(explain|why|affect|impact)\b/.test(value)) return { intent: "explain_finding" };
  if (/\b(pending|queue|findings|attention|review items)\b/.test(value)) return { intent: "list_pending_findings" };
  if (text.trim().length >= 2) return { intent: "manual_question" };
  return { intent: "unsupported" };
}
```

- [ ] **Step 5: Run tests**

```bash
npm run test:unit
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/coworker tests/coworker-intent.test.mjs
git commit -m "feat: add controlled coworker intent routing"
```

---

## Task 3: Add Conversation Repository And API

**Files:**

- Create: `src/lib/coworker/conversations.ts`
- Create: `src/app/api/coworker/conversations/route.ts`
- Create: `src/app/api/coworker/conversations/[id]/messages/route.ts`
- Test: `tests/coworker-security-regressions.test.mjs`

- [ ] **Step 1: Add static regression tests first**

Create `tests/coworker-security-regressions.test.mjs`:

```js
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const conversations = fs.readFileSync("src/lib/coworker/conversations.ts", "utf8");

test("conversation reads are scoped to org and user", () => {
  assert.match(conversations, /\.eq\\("organization_id", ctx\\.orgId\\)/);
  assert.match(conversations, /\.eq\\("user_id", ctx\\.userId\\)/);
});

test("messages are scoped through an owned conversation", () => {
  assert.match(conversations, /loadOwnedConversation/);
});
```

- [ ] **Step 2: Implement the repository**

Create `src/lib/coworker/conversations.ts` with these exports:

```ts
export async function listConversations(ctx: OrgAccessContext)
export async function createConversation(ctx: OrgAccessContext, title = "New conversation")
export async function loadOwnedConversation(ctx: OrgAccessContext, conversationId: string)
export async function listMessages(ctx: OrgAccessContext, conversationId: string)
export async function insertMessage(ctx: OrgAccessContext, input: {
  conversationId: string;
  role: "user" | "assistant";
  intent?: string | null;
  content: string;
  metadata?: Record<string, unknown>;
})
```

Implementation requirements:

1. Use `getSupabaseAdminClient()` internally.
2. Apply both ownership filters to every conversation read:

```ts
.eq("organization_id", ctx.orgId)
.eq("user_id", ctx.userId)
```

3. Return `null` from `loadOwnedConversation()` when ownership does not match. This allows API routes to return `404` without leaking IDs.
4. Call `loadOwnedConversation()` before reading or inserting messages.
5. Update `coworker_conversations.updated_at` after inserting each message.

- [ ] **Step 3: Add conversation collection route**

Create `src/app/api/coworker/conversations/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createConversation, listConversations } from "@/lib/coworker/conversations";
import { getOrgAccessContext } from "@/lib/supabase/access";

export async function GET() {
  const ctx = await getOrgAccessContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ conversations: await listConversations(ctx) });
}

export async function POST() {
  const ctx = await getOrgAccessContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ conversation: await createConversation(ctx) }, { status: 201 });
}
```

- [ ] **Step 4: Add message-list route placeholder**

Create `src/app/api/coworker/conversations/[id]/messages/route.ts` with `GET`. Add `POST` in Task 6 after orchestration exists.

- [ ] **Step 5: Run tests and build**

```bash
npm run test:unit
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/coworker/conversations.ts src/app/api/coworker tests/coworker-security-regressions.test.mjs
git commit -m "feat: add private coworker conversation api"
```

---

## Task 4: Add Read-Only Coworker Tools

**Files:**

- Create: `src/lib/coworker/tools.ts`
- Modify: `src/lib/ai/proposed-updates.ts`
- Reuse: `src/services/search.ts`
- Reuse: `src/lib/ai/review-preview.ts`

- [ ] **Step 1: Implement approved tools only**

Create `src/lib/coworker/tools.ts` with these exports:

```ts
export async function answerManualQuestion(query: string)
export async function listPendingFindings(ctx: OrgAccessContext)
export async function explainFinding(ctx: OrgAccessContext, findingId: string)
export async function previewDraftUpdate(ctx: OrgAccessContext, findingId: string)
```

Implementation requirements:

1. `answerManualQuestion()` calls `runSearch({ query, includeAnswer: true })`.
2. `listPendingFindings()` queries `proposed_updates` for `ctx.orgId` with `status = "pending"` and returns at most eight compact finding cards.
3. `explainFinding()` confirms `ai_findings.organization_id === ctx.orgId`, calls `buildReviewPreview()`, and returns rationale, citations, and an internal `/results/<findingId>` link.
4. `previewDraftUpdate()` confirms finding ownership, calls `buildReviewPreview()`, generates proposed wording through a new read-only helper in `src/lib/ai/proposed-updates.ts`, and returns a card labelled `Draft only`.

Important:

- These functions may read data and preview drafts.
- They must not approve, reject, or apply manual text.
- Draft preview must not insert or update `proposed_updates`. That table is the existing review queue.
- They must filter by `ctx.orgId`.
- Missing evidence returns `I could not find enough stored evidence to answer that.`

- [ ] **Step 2: Split draft generation from queue persistence**

Refactor `src/lib/ai/proposed-updates.ts`:

1. Extract the retrieval, prompt, provider call, parsed draft, citations, and returned preview data from `generateDraftForProposedUpdate()`.
2. Add a new export:

```ts
export async function generateDraftPreviewForFinding(
  admin: SupabaseClient,
  input: {
    organizationId: string;
    findingId: string;
    notes?: string[];
    flightbookId?: string | null;
  },
)
```

3. Keep `generateDraftForProposedUpdate()` working for the existing review queue. It should call shared draft-generation internals and then persist its payload to `proposed_updates`.
4. Make `previewDraftUpdate()` call `generateDraftPreviewForFinding()`. It must not call `insertProposedUpdateWithFallback()` or `updateProposedDraftWithFallback()`.

- [ ] **Step 3: Add a regression test for preview-only behavior**

Append to `tests/coworker-security-regressions.test.mjs`:

```js
const coworkerTools = fs.readFileSync("src/lib/coworker/tools.ts", "utf8");

test("chat draft preview uses read-only generation", () => {
  assert.match(coworkerTools, /generateDraftPreviewForFinding/);
  assert.doesNotMatch(coworkerTools, /insertProposedUpdateWithFallback/);
});
```

- [ ] **Step 4: Run build**

```bash
npm run test:unit
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/coworker/tools.ts src/lib/ai/proposed-updates.ts tests/coworker-security-regressions.test.mjs
git commit -m "feat: add read-only compliance coworker tools"
```

---

## Task 5: Extract Safe Queue Creation

**Files:**

- Create: `src/lib/findings/queue-finding.ts`
- Modify: `src/app/api/findings/add-to-queue/route.ts`
- Create: `src/app/api/coworker/actions/create-review-item/route.ts`
- Test: `tests/coworker-security-regressions.test.mjs`

- [ ] **Step 1: Add failing permission regression tests**

Append:

```js
const queueFinding = fs.readFileSync("src/lib/findings/queue-finding.ts", "utf8");
const coworkerAction = fs.readFileSync("src/app/api/coworker/actions/create-review-item/route.ts", "utf8");

test("queue creation enforces approver roles", () => {
  assert.match(queueFinding, /ORG_APPROVER_ROLES/);
  assert.match(queueFinding, /includes\\(ctx\\.role/);
});

test("coworker queue action writes conversation provenance", () => {
  assert.match(coworkerAction, /conversationId/);
  assert.match(coworkerAction, /sourceMessageId/);
});
```

- [ ] **Step 2: Move queue logic into a shared service**

Move `queueFinding()` from `src/app/api/findings/add-to-queue/route.ts` into `src/lib/findings/queue-finding.ts`.

Add this guard at the top:

```ts
import { ORG_APPROVER_ROLES } from "@/lib/supabase/access";

if (!ORG_APPROVER_ROLES.includes(ctx.role as (typeof ORG_APPROVER_ROLES)[number])) {
  return { findingId, error: "Forbidden" };
}
```

Add optional provenance:

```ts
provenance?: {
  conversationId: string;
  sourceMessageId: string;
}
```

After a queue item is created or reused, insert:

```ts
await admin.from("audit_log").insert({
  organization_id: ctx.orgId,
  actor_id: ctx.userId,
  action: "coworker_review_item_created",
  entity_type: "proposed_update",
  entity_id: result.id,
  payload: provenance ?? {},
});
```

Only write this audit event when provenance exists.

- [ ] **Step 3: Make the existing add-to-queue route a thin adapter**

Import and call the shared service. Keep existing batch support.

- [ ] **Step 4: Add coworker action route**

Create `src/app/api/coworker/actions/create-review-item/route.ts`:

```ts
import { NextResponse } from "next/server";
import { queueFinding } from "@/lib/findings/queue-finding";
import { getOrgAccessContext, getSupabaseAdminClient } from "@/lib/supabase/access";

export async function POST(request: Request) {
  const ctx = await getOrgAccessContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { findingId?: string; conversationId?: string; sourceMessageId?: string };
  if (!body.findingId || !body.conversationId || !body.sourceMessageId) {
    return NextResponse.json({ error: "findingId, conversationId and sourceMessageId are required" }, { status: 400 });
  }
  const result = await queueFinding(getSupabaseAdminClient(), ctx, body.findingId, true, {
    conversationId: body.conversationId,
    sourceMessageId: body.sourceMessageId,
  });
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.error === "Forbidden" ? 403 : 400 });
  return NextResponse.json({ ok: true, ...result });
}
```

- [ ] **Step 5: Run tests**

```bash
npm run test:unit
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/findings src/app/api/findings/add-to-queue/route.ts src/app/api/coworker/actions tests/coworker-security-regressions.test.mjs
git commit -m "feat: enforce safe coworker review item creation"
```

---

## Task 6: Orchestrate Saved Chat Messages

**Files:**

- Create: `src/lib/coworker/orchestrate-message.ts`
- Modify: `src/app/api/coworker/conversations/[id]/messages/route.ts`

- [ ] **Step 1: Implement orchestration**

Create `src/lib/coworker/orchestrate-message.ts`.

Required flow:

```ts
1. Load owned conversation.
2. Save user message.
3. Classify intent.
4. Call exactly one approved tool.
5. Save assistant response with citations and cards in metadata.
6. Update conversation.updated_at.
7. Return structured CoworkerResponse.
```

Do not expose an approve or reject tool. For unsupported mutation requests, return:

```text
I can research, explain, and prepare a draft. Open the review item to approve or reject a change.
```

- [ ] **Step 2: Add POST handler**

Update `src/app/api/coworker/conversations/[id]/messages/route.ts`:

```ts
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getOrgAccessContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json() as { content?: string; findingId?: string | null };
  if (!body.content?.trim()) return NextResponse.json({ error: "content required" }, { status: 400 });
  const result = await orchestrateCoworkerMessage(ctx, id, body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.response);
}
```

- [ ] **Step 3: Run tests and build**

```bash
npm run test:unit
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/coworker/orchestrate-message.ts src/app/api/coworker/conversations
git commit -m "feat: orchestrate saved coworker messages"
```

---

## Task 7: Build The Drawer UI

**Files:**

- Create: `src/components/coworker/CoworkerProvider.tsx`
- Create: `src/components/coworker/CoworkerLauncher.tsx`
- Create: `src/components/coworker/CoworkerDrawer.tsx`
- Create: `src/components/coworker/ConversationList.tsx`
- Create: `src/components/coworker/MessageTimeline.tsx`
- Create: `src/components/coworker/Composer.tsx`
- Create: `src/components/coworker/SourceLinks.tsx`
- Create: `src/components/coworker/FindingCard.tsx`
- Create: `src/components/coworker/DraftPreviewCard.tsx`
- Modify: `src/components/navigation/AppShell.tsx`

- [ ] **Step 1: Build provider state**

`CoworkerProvider.tsx` should own:

```ts
open
conversations
activeConversationId
messages
loading
sendMessage(content, findingId?)
createConversation()
createReviewItem(findingId, sourceMessageId)
```

Fetch from the new `/api/coworker/*` routes. Keep drawer state above page content so navigation does not close it.

- [ ] **Step 2: Build drawer components**

Use the notification drawer as the visual precedent:

```text
src/components/notifications/NotificationDrawer.tsx
```

Desktop:

- fixed right drawer
- `max-w-md`
- close button
- conversation list toggle
- message timeline
- composer at bottom

Mobile:

- full-width drawer
- same chat behavior
- close button always visible

- [ ] **Step 3: Render safe structured cards**

`FindingCard.tsx`:

- title
- summary
- `Explain` button
- internal result link

`DraftPreviewCard.tsx`:

- visible `Draft only` label
- current wording
- proposed wording
- rationale
- citations
- `Create review item` button
- no approve or reject button

- [ ] **Step 4: Integrate into AppShell**

Modify `src/components/navigation/AppShell.tsx`:

```ts
import { Bot } from "lucide-react";
import CoworkerLauncher from "@/components/coworker/CoworkerLauncher";
import { CoworkerProvider } from "@/components/coworker/CoworkerProvider";
```

Wrap shell content in `CoworkerProvider`. Add:

- desktop sidebar `Coworker` button near Notifications
- mobile top-header launcher beside the bell
- drawer render near `NotificationDrawer`

- [ ] **Step 5: Run lint and build**

```bash
npm run lint
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/components/coworker src/components/navigation/AppShell.tsx
git commit -m "feat: add persistent compliance coworker drawer"
```

---

## Task 8: Add Browser Smoke Check

**Files:**

- Create: `scripts/check-coworker-flow.mjs`

- [ ] **Step 1: Write a Playwright smoke script**

Follow the existing browser scripts in `scripts/`. The script should:

```text
1. Open the authenticated dashboard.
2. Click Coworker.
3. Create New chat.
4. Send: What does our PPL manual say about solo flights?
5. Confirm an assistant response appears.
6. Confirm citation links appear when stored evidence exists.
7. Navigate to Flight books without closing the drawer.
8. Confirm the drawer remains visible.
```

- [ ] **Step 2: Start local app**

```bash
npm run dev
```

Leave that Terminal window running.

- [ ] **Step 3: Run smoke script in a second Terminal window**

```bash
node scripts/check-coworker-flow.mjs
```

- [ ] **Step 4: Commit**

```bash
git add scripts/check-coworker-flow.mjs
git commit -m "test: add coworker browser smoke check"
```

---

## Manual Supabase Setup

Do this after Tasks 1 to 8 are implemented locally.

- [ ] **Step 1: Open Supabase**

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Select the Flight Lyceum project.
3. Open `SQL Editor`.
4. Click `New query`.

- [ ] **Step 2: Apply the new migration**

1. Open `supabase/migrations/schema/037_coworker_conversations.sql` locally.
2. Copy the full SQL contents.
3. Paste into Supabase SQL Editor.
4. Click `Run`.

Expected: `Success. No rows returned`.

- [ ] **Step 3: Verify the tables**

Run in Supabase SQL Editor:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('coworker_conversations', 'coworker_messages')
order by table_name;
```

Expected:

```text
coworker_conversations
coworker_messages
```

- [ ] **Step 4: Verify RLS is enabled**

Run:

```sql
select relname, relrowsecurity
from pg_class
where relname in ('coworker_conversations', 'coworker_messages')
order by relname;
```

Expected: both rows show `true`.

---

## Manual Local Test

- [ ] **Step 1: Start the app**

```bash
cd "/Users/eugene/WebDev Archive/EASA_app"
npm run dev
```

- [ ] **Step 2: Open the app**

Visit:

```text
http://localhost:3000
```

- [ ] **Step 3: Sign in as an admin**

Use your existing demo or admin account.

- [ ] **Step 4: Test conversational search**

1. Click `Coworker`.
2. Click `New chat`.
3. Ask: `What does our PPL manual say about solo flights?`
4. Confirm a grounded answer appears.
5. Confirm source links appear.
6. Reload the browser.
7. Reopen `Coworker`.
8. Confirm the conversation is still present.

- [ ] **Step 5: Test navigation persistence**

1. Leave the drawer open.
2. Click `Flight books`.
3. Confirm the drawer remains open.

- [ ] **Step 6: Test pending findings**

Ask:

```text
Which pending findings need attention?
```

Expected: compact finding cards with internal links.

- [ ] **Step 7: Test draft preview**

1. Open a finding card.
2. Ask: `Explain why this affects our manual.`
3. Ask: `Draft wording for this section.`
4. Confirm a card labelled `Draft only`.
5. Confirm there is no approve button.
6. Open `Today's work` in another tab and confirm the exploratory draft did not create a new review item.
7. Return to the coworker drawer and click `Create review item`.
8. Click `Open review item`.
9. Confirm approval happens on the existing review screen.

---

## Manual Vercel Deployment

Do this only after local tests pass.

- [ ] **Step 1: Push branch**

```bash
git push -u origin codex/in-app-compliance-coworker
```

- [ ] **Step 2: Open Vercel**

1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard).
2. Open the Flight Lyceum project.
3. Open `Settings`.
4. Open `Environment Variables`.

- [ ] **Step 3: Confirm environment variables**

Confirm these already exist for Production and Preview:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
OPENAI_EMBEDDING_MODEL
```

Do not expose `SUPABASE_SERVICE_ROLE_KEY` as a `NEXT_PUBLIC_*` variable.

- [ ] **Step 4: Deploy**

1. Merge the branch after review.
2. Open Vercel `Deployments`.
3. Wait for the deployment status to become `Ready`.

- [ ] **Step 5: Production smoke test**

Repeat the manual local test against the production URL.

---

## Final Verification Checklist

- [ ] `npm run test:unit` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] conversations survive refresh
- [ ] conversations are private per user
- [ ] manual answers display citations
- [ ] pending findings display as cards
- [ ] draft preview is labelled `Draft only`
- [ ] exploratory draft preview does not create a queue item
- [ ] normal chat cannot approve or reject
- [ ] queue creation requires explicit click
- [ ] queue creation rejects unauthorized roles
- [ ] approval still happens in `/updates`
- [ ] drawer remains open during signed-in navigation
- [ ] Supabase RLS is enabled on both coworker tables
- [ ] production smoke test passes
