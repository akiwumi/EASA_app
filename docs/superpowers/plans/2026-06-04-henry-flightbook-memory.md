# Henry Flight Book Memory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build read-only Henry flight book memory so uploaded manuals can store reusable analysis, answer Henry questions with memory context, and flag likely update needs without mutating the review queue.

**Architecture:** Add Supabase memory tables, a focused `src/lib/ai/memory.ts` service, and wire active memory retrieval into Henry's manual-question tool. Keep generation best-effort and advisory; no queue mutation imports or automatic proposed update writes.

**Tech Stack:** Next.js 16, TypeScript, Supabase/Postgres, pgvector-compatible existing embeddings, Node test runner.

---

## File Structure

- Create `supabase/migrations/20260604120000_henry_flightbook_memory.sql`: executable migration for memory runs and memories.
- Create `supabase/migrations/schema/039_henry_flightbook_memory.sql`: schema copy used by regression tests.
- Create `src/lib/ai/memory.ts`: memory types, schema-drift guard, stale detection, status, retrieval, and deterministic fallback memory generation helpers.
- Modify `src/lib/coworker/tools.ts`: pass org context into manual-question retrieval and include memory context in answers.
- Create `src/app/api/flightbooks/[id]/memory/route.ts`: authenticated status and manual re-analysis endpoint.
- Create `tests/henry-flightbook-memory.test.mjs`: schema, service, route, and read-only boundary regressions.
- Modify `tests/coworker-security-regressions.test.mjs`: ensure coworker memory graph cannot reach queue mutation helpers.

## Task 1: Memory Schema

**Files:**
- Create: `supabase/migrations/20260604120000_henry_flightbook_memory.sql`
- Create: `supabase/migrations/schema/039_henry_flightbook_memory.sql`
- Test: `tests/henry-flightbook-memory.test.mjs`

- [ ] **Step 1: Write failing schema tests**

Add tests that read both SQL files and assert:

```js
assert.match(schema, /create table if not exists ai_memory_runs/);
assert.match(schema, /create table if not exists ai_memories/);
assert.match(schema, /memory_type text not null check/);
assert.match(schema, /stale_at timestamptz/);
assert.match(schema, /ai_memories_active_section_idx/);
assert.match(schema, /alter table ai_memories enable row level security/);
assert.equal(schemaCopy, migration);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/henry-flightbook-memory.test.mjs`

Expected: fail because migration files do not exist.

- [ ] **Step 3: Add migration and schema copy**

Create identical SQL files with `ai_memory_runs`, `ai_memories`, constraints, indexes, RLS enabled, authenticated select grants, and no authenticated insert/update/delete grants.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/henry-flightbook-memory.test.mjs`

Expected: memory schema tests pass.

## Task 2: Memory Service

**Files:**
- Create: `src/lib/ai/memory.ts`
- Test: `tests/henry-flightbook-memory.test.mjs`

- [ ] **Step 1: Write failing service tests**

Add tests that import `markStaleMemoriesForSections`, `retrieveFlightbookMemories`, `summarizeMemoryStatus`, and `buildFallbackSectionMemories`.

Assert:

```js
assert.equal(staleUpdates[0].stale_at instanceof Date, true);
assert.equal(activeMemories.every((m) => !m.stale_at), true);
assert.equal(status.state, "stale");
assert.equal(generated.some((m) => m.memory_type === "section_summary"), true);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/henry-flightbook-memory.test.mjs`

Expected: fail because `src/lib/ai/memory.ts` does not exist.

- [ ] **Step 3: Add service**

Implement:

```ts
export type FlightbookMemoryType = "section_summary" | "obligation" | "update_hint" | "risk_note" | "training_link";
export type MemoryStatusState = "none" | "learned" | "analyzing" | "stale" | "failed";
export function isMissingMemorySchemaError(error: { code?: string | null; message?: string | null } | null | undefined): boolean;
export function buildFallbackSectionMemories(section: MemorySectionInput): NewMemoryInput[];
export async function markStaleMemoriesForSections(admin, input): Promise<{ staleCount: number }>;
export async function retrieveFlightbookMemories(admin, input): Promise<RetrievedMemory[]>;
export async function summarizeMemoryStatus(admin, input): Promise<MemoryStatus>;
export async function runFlightbookMemoryAnalysis(admin, input): Promise<MemoryAnalysisResult>;
```

Use scoped organization filters on every query. Exclude stale memories from retrieval. Use deterministic local fallback summaries so the first slice works without adding a new AI prompt path.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/henry-flightbook-memory.test.mjs`

Expected: service tests pass.

## Task 3: Henry Retrieval Integration

**Files:**
- Modify: `src/lib/coworker/tools.ts`
- Test: `tests/henry-flightbook-memory.test.mjs`
- Test: `tests/coworker-security-regressions.test.mjs`

- [ ] **Step 1: Write failing Henry tests**

Assert `answerManualQuestion` accepts `OrgAccessContext`, imports `retrieveFlightbookMemories`, includes memory text in its answer path, and the reachable coworker graph still cannot write to `proposed_updates`.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test:unit -- tests/henry-flightbook-memory.test.mjs tests/coworker-security-regressions.test.mjs`

Expected: fail because Henry does not use memory retrieval.

- [ ] **Step 3: Modify Henry tool boundary**

Change `answerManualQuestion(query)` to `answerManualQuestion(ctx, query)`. Retrieve memories with the admin client and append a compact "Stored memory" advisory section when memory exists. Preserve existing RAG answer and citations.

- [ ] **Step 4: Update orchestration dependency signature**

Change `answerManualQuestion` dependency in `src/lib/coworker/orchestrate-message.ts` to accept `ctx` and pass it from `runApprovedTool`.

- [ ] **Step 5: Run tests to verify pass**

Run: `npm run test:unit -- tests/henry-flightbook-memory.test.mjs tests/coworker-orchestration.test.mjs tests/coworker-security-regressions.test.mjs`

Expected: pass.

## Task 4: Memory API

**Files:**
- Create: `src/app/api/flightbooks/[id]/memory/route.ts`
- Test: `tests/henry-flightbook-memory.test.mjs`

- [ ] **Step 1: Write failing route tests**

Assert the route authenticates with `getOrgAccessContext`, validates UUID `id`, uses `summarizeMemoryStatus` for `GET`, uses `runFlightbookMemoryAnalysis` for `POST`, returns generic 500 errors, and does not expose raw exception messages.

- [ ] **Step 2: Run test to verify failure**

Run: `npm run test:unit -- tests/henry-flightbook-memory.test.mjs`

Expected: fail because route does not exist.

- [ ] **Step 3: Add route**

Implement authenticated `GET` and `POST`, org-scoped flight book lookup, `404` for missing book, and graceful JSON responses.

- [ ] **Step 4: Run test to verify pass**

Run: `npm run test:unit -- tests/henry-flightbook-memory.test.mjs`

Expected: pass.

## Task 5: Verification

**Files:**
- No new files unless tests expose a defect.

- [ ] **Step 1: Run focused tests**

Run: `npm run test:unit -- tests/henry-flightbook-memory.test.mjs tests/coworker-orchestration.test.mjs tests/coworker-security-regressions.test.mjs`

Expected: pass.

- [ ] **Step 2: Run full unit suite**

Run: `npm run test:unit`

Expected: pass.

- [ ] **Step 3: Review diff**

Run: `git diff --stat`

Expected: only memory schema, service, Henry wiring, route, tests, and docs are changed by this work.
