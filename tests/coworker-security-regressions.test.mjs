import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const conversations = fs.readFileSync("src/lib/coworker/conversations.ts", "utf8");
const conversationsRoute = fs.readFileSync("src/app/api/coworker/conversations/route.ts", "utf8");
const messagesRoute = fs.readFileSync(
  "src/app/api/coworker/conversations/[id]/messages/route.ts",
  "utf8",
);
const migration = fs.readFileSync(
  "supabase/migrations/20260602120000_coworker_conversations.sql",
  "utf8",
);
const schemaMigration = fs.readFileSync(
  "supabase/migrations/schema/037_coworker_conversations.sql",
  "utf8",
);
const proposedUpdates = fs.readFileSync("src/lib/ai/proposed-updates.ts", "utf8");
const coworkerTools = fs.existsSync("src/lib/coworker/tools.ts")
  ? fs.readFileSync("src/lib/coworker/tools.ts", "utf8")
  : "";

function functionBody(source, name, nextName) {
  const start = source.indexOf(`export async function ${name}`);
  assert.notEqual(start, -1, `${name} export is missing`);
  const end = nextName ? source.indexOf(`export async function ${nextName}`, start) : source.length;
  return source.slice(start, end === -1 ? source.length : end);
}

test("conversation reads scope organization and user ownership", () => {
  for (const name of ["listConversations", "loadOwnedConversation"]) {
    const body = functionBody(
      conversations,
      name,
      name === "listConversations" ? "createConversation" : "listMessages",
    );
    assert.match(body, /\.eq\("organization_id", ctx\.orgId\)/);
    assert.match(body, /\.eq\("user_id", ctx\.userId\)/);
  }
});

test("conversation list uses most recently updated ordering", () => {
  const body = functionBody(conversations, "listConversations", "createConversation");
  assert.match(body, /\.order\("updated_at", \{ ascending: false \}\)/);
  assert.match(body, /\.limit\(50\)/);
});

test("message access verifies the caller owns the conversation first", () => {
  for (const name of ["listMessages", "insertMessage"]) {
    const body = functionBody(conversations, name, name === "listMessages" ? "insertMessage" : null);
    assert.match(body, /await loadOwnedConversation\(ctx, conversationId\)/);
  }
});

test("message insert derives ownership and default metadata from context", () => {
  const body = functionBody(conversations, "insertMessage");
  assert.match(body, /organization_id: ctx\.orgId/);
  assert.match(body, /user_id: ctx\.userId/);
  assert.match(body, /metadata: input\.metadata \?\? \{\}/);
  assert.doesNotMatch(body, /\.update\(\{ updated_at:/);
});

test("repository uses explicit projections and caps message history", () => {
  assert.doesNotMatch(conversations, /\.select\("\*"\)/);
  const body = functionBody(conversations, "listMessages", "insertMessage");
  assert.match(body, /\.limit\(200\)/);
});

test("migration touches conversation updated_at after message insert", () => {
  assert.match(migration, /create or replace function touch_coworker_conversation_updated_at\(\)/i);
  assert.match(migration, /returns trigger/i);
  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path\s*=\s*public/i);
  assert.match(migration, /update coworker_conversations\s+set updated_at\s*=\s*now\(\)/i);
  assert.match(migration, /create trigger touch_coworker_conversation_updated_at/i);
  assert.match(migration, /after insert on coworker_messages/i);
  assert.match(migration, /execute function touch_coworker_conversation_updated_at\(\)/i);
});

test("migration stores trimmed conversation titles with bounded length and copies stay identical", () => {
  assert.match(
    migration,
    /title text not null default 'New conversation'\s+check\s*\(\s*title\s*=\s*btrim\(title\)\s+and\s+char_length\(title\)\s+between\s+1\s+and\s+120\s*\)/i,
  );
  assert.equal(schemaMigration, migration);
});

test("conversation routes authenticate, report server errors, and preserve message 404", () => {
  assert.match(conversationsRoute, /await getOrgAccessContext\(\)/);
  assert.match(conversationsRoute, /status: 401/);
  assert.match(conversationsRoute, /status: 201/);
  assert.match(conversationsRoute, /status: 500/);
  assert.match(conversationsRoute, /console\.error/);
  assert.match(conversationsRoute, /\{ error: "Internal server error" \}/);
  assert.doesNotMatch(conversationsRoute, /error\.message/);
  assert.match(conversationsRoute, /await request\.text\(\)/);
  assert.match(conversationsRoute, /parseConversationRequestBody/);
  assert.match(conversationsRoute, /parseConversationTitle/);

  assert.match(messagesRoute, /await getOrgAccessContext\(\)/);
  assert.match(messagesRoute, /const \{ id \} = await params/);
  assert.match(messagesRoute, /if \(!isUuid\(id\)\)/);
  assert.match(messagesRoute, /status: 401/);
  assert.match(messagesRoute, /status: 404/);
  assert.match(messagesRoute, /status: 500/);
  assert.match(messagesRoute, /console\.error/);
  assert.match(messagesRoute, /\{ error: "Internal server error" \}/);
  assert.doesNotMatch(messagesRoute, /error\.message/);
  assert.doesNotMatch(messagesRoute, /export async function POST/);
});

test("coworker draft previews use the preview-only helper", () => {
  const previewRegionStart = proposedUpdates.indexOf("async function generateDraftPreview(");
  const previewRegionEnd = proposedUpdates.indexOf(
    "export async function generateDraftForProposedUpdate",
    previewRegionStart,
  );
  assert.notEqual(previewRegionStart, -1, "generateDraftPreview helper is missing");
  assert.notEqual(previewRegionEnd, -1, "generateDraftForProposedUpdate export is missing");
  const previewOnlyRegion = proposedUpdates.slice(previewRegionStart, previewRegionEnd);

  assert.match(proposedUpdates, /export async function generateDraftPreviewForFinding/);
  assert.doesNotMatch(previewOnlyRegion, /\.from\("proposed_updates"\)/);
  assert.doesNotMatch(previewOnlyRegion, /updateProposedDraftWithFallback/);
  assert.doesNotMatch(previewOnlyRegion, /insertProposedUpdateWithFallback/);
  assert.match(coworkerTools, /generateDraftPreviewForFinding/);
  assert.doesNotMatch(coworkerTools, /insertProposedUpdateWithFallback/);
  assert.doesNotMatch(coworkerTools, /updateProposedDraftWithFallback/);
});

test("pending coworker findings filter nested organization ownership and tolerate schema drift", () => {
  const body = functionBody(coworkerTools, "listPendingFindings", "explainFinding");

  assert.match(body, /ai_findings\s*\(\s*id,\s*organization_id,\s*summary,/);
  assert.match(body, /finding\?\.organization_id !== ctx\.orgId/);
  assert.match(coworkerTools, /function isMissingSchemaError/);
  assert.match(body, /if \(isMissingSchemaError\(error\)\)/);
  assert.match(body, /content: MISSING_EVIDENCE,\s*citations: \[\],\s*cards: \[\]/);
});

test("persisted proposal draft generation keeps queue persistence", () => {
  const body = functionBody(proposedUpdates, "generateDraftForProposedUpdate", "generateDraftsForOrg");
  assert.match(body, /updateProposedDraftWithFallback/);
});
