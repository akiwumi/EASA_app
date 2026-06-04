import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  buildFallbackSectionMemories,
  isMissingMemorySchemaError,
} from "../src/lib/ai/memory.ts";

const migrationPath = "supabase/migrations/20260604120000_henry_flightbook_memory.sql";
const schemaPath = "supabase/migrations/schema/039_henry_flightbook_memory.sql";
const migration = fs.readFileSync(migrationPath, "utf8");
const schema = fs.readFileSync(schemaPath, "utf8");
const memoryService = fs.readFileSync("src/lib/ai/memory.ts", "utf8");
const coworkerTools = fs.readFileSync("src/lib/coworker/tools.ts", "utf8");
const orchestration = fs.readFileSync("src/lib/coworker/orchestrate-message.ts", "utf8");
const memoryRoute = fs.readFileSync("src/app/api/flightbooks/[id]/memory/route.ts", "utf8");

test("Henry memory migration creates read-only advisory tables", () => {
  assert.equal(schema, migration);
  assert.match(schema, /create table if not exists ai_memory_runs/);
  assert.match(schema, /create table if not exists ai_memories/);
  assert.match(schema, /memory_type text not null check/);
  assert.match(schema, /stale_at timestamptz/);
  assert.match(schema, /ai_memories_active_section_idx/);
  assert.match(schema, /alter table ai_memories enable row level security/);
  assert.match(schema, /grant select on ai_memories to authenticated/);
  assert.match(schema, /revoke insert, update, delete on ai_memories from authenticated/);
});

test("fallback memory generation stores summaries, obligations, and update hints", () => {
  const memories = buildFallbackSectionMemories({
    id: "section-1",
    organization_id: "org-1",
    flightbook_id: "book-1",
    section_number: "1.2",
    title: "Instructor records",
    body: "The ATO must maintain instructor records and ensure EASA Part-FCL compliance. Records shall be reviewed after regulation changes.",
    chunk_hash: "hash-1",
    metadata: { part: "Part-FCL" },
  });

  assert.equal(memories.some((memory) => memory.memory_type === "section_summary"), true);
  assert.equal(memories.some((memory) => memory.memory_type === "obligation"), true);
  assert.equal(memories.some((memory) => memory.memory_type === "update_hint"), true);
  assert.equal(memories.every((memory) => memory.organization_id === "org-1"), true);
  assert.equal(memories.every((memory) => memory.flightbook_section_id === "section-1"), true);
});

test("memory service tolerates rollout schema drift and excludes stale retrieval", () => {
  assert.equal(isMissingMemorySchemaError({ code: "42P01", message: "relation ai_memories does not exist" }), true);
  assert.match(memoryService, /\.is\("stale_at", null\)/);
  assert.match(memoryService, /neq\("source_chunk_hash"/);
  assert.match(memoryService, /skippedUnchanged/);
  assert.match(memoryService, /sectionsNeedingMemory/);
  assert.match(memoryService, /export async function retrieveFlightbookMemories/);
  assert.match(memoryService, /export async function summarizeMemoryStatus/);
  assert.match(memoryService, /export async function runFlightbookMemoryAnalysis/);
});

test("Henry manual questions retrieve organization-scoped memory", () => {
  assert.match(coworkerTools, /import \{ retrieveFlightbookMemories \} from "@\/lib\/ai\/memory"/);
  assert.match(coworkerTools, /answerManualQuestion\(\s*ctx: OrgAccessContext,\s*query: string/s);
  assert.match(coworkerTools, /organizationId: ctx\.orgId/);
  assert.match(coworkerTools, /Stored flight book memory/);
  assert.match(orchestration, /answerManualQuestion: \(ctx: CoworkerContext, content: string\)/);
  assert.match(orchestration, /deps\.answerManualQuestion\(ctx, input\.content\)/);
});

test("Henry memory route authenticates, scopes flightbook ownership, and hides raw errors", () => {
  assert.match(memoryRoute, /await getOrgAccessContext\(\)/);
  assert.match(memoryRoute, /status: 401/);
  assert.match(memoryRoute, /if \(!isUuid\(id\)\)/);
  assert.match(memoryRoute, /\.from\("flightbooks"\)/);
  assert.match(memoryRoute, /\.eq\("organization_id", orgId\)/);
  assert.match(memoryRoute, /summarizeMemoryStatus/);
  assert.match(memoryRoute, /runFlightbookMemoryAnalysis/);
  assert.match(memoryRoute, /\{ error: "Internal server error" \}/);
  assert.doesNotMatch(memoryRoute, /error\.message/);
});

test("memory implementation stays advisory and cannot write proposed update queue items", () => {
  for (const source of [memoryService, coworkerTools, orchestration, memoryRoute]) {
    assert.doesNotMatch(source, /insertProposedUpdateWithFallback|updateProposedDraftWithFallback|queueFinding/);
    assert.doesNotMatch(source, /\.from\("proposed_updates"\)[\s\S]{0,160}\.(?:insert|update)\(/);
  }
});
