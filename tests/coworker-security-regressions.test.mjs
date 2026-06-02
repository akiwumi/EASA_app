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
