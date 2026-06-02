import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const conversations = fs.readFileSync("src/lib/coworker/conversations.ts", "utf8");
const migration = fs.readFileSync(
  "supabase/migrations/20260602143000_coworker_conversation_archive.sql",
  "utf8",
);
const schemaMigration = fs.readFileSync(
  "supabase/migrations/schema/038_coworker_conversation_archive.sql",
  "utf8",
);

function functionBody(source, name, nextName) {
  const start = source.indexOf(`export async function ${name}`);
  assert.notEqual(start, -1, `${name} export is missing`);
  const end = nextName ? source.indexOf(`export async function ${nextName}`, start) : source.length;
  return source.slice(start, end === -1 ? source.length : end);
}

test("archive migration adds archived_at and partial ordering indexes", () => {
  assert.match(migration, /add column if not exists archived_at timestamptz/);
  assert.match(
    migration,
    /create index if not exists coworker_conversations_active_user_updated_idx\s+on coworker_conversations \(organization_id, user_id, updated_at desc\)\s+where archived_at is null/,
  );
  assert.match(
    migration,
    /create index if not exists coworker_conversations_archived_user_updated_idx\s+on coworker_conversations \(organization_id, user_id, archived_at desc\)\s+where archived_at is not null/,
  );
  assert.match(migration, /notify pgrst, 'reload schema'/);
  assert.equal(schemaMigration, migration);
});

test("database rejects new messages after a conversation is archived", () => {
  assert.match(migration, /create or replace function assert_active_coworker_conversation\(/);
  assert.match(migration, /and archived_at is null\s+for update/);
  assert.match(migration, /create or replace function reject_archived_coworker_message\(\)/);
  assert.match(migration, /perform assert_active_coworker_conversation\(\s*new\.conversation_id,\s*new\.organization_id,\s*new\.user_id\s*\)/);
  assert.match(migration, /create trigger reject_archived_coworker_message\s+before insert on coworker_messages/);
});

test("database rejects coworker review audits after a conversation is archived", () => {
  assert.match(migration, /create or replace function reject_archived_coworker_review_audit\(\)/);
  assert.match(migration, /if new\.action = 'coworker_review_item_created' then/);
  assert.match(migration, /perform assert_active_coworker_conversation\(\s*\(new\.payload->>'conversationId'\)::uuid,\s*new\.organization_id,\s*new\.actor_id\s*\)/);
  assert.match(migration, /where id = \(new\.payload->>'sourceMessageId'\)::uuid/);
  assert.match(migration, /and role = 'assistant'/);
  assert.match(migration, /create trigger reject_archived_coworker_review_audit\s+before insert on audit_log/);
});

test("archive guard functions are trigger-only database internals", () => {
  assert.match(migration, /revoke execute on function assert_active_coworker_conversation\(uuid, uuid, uuid\) from public/);
  assert.match(migration, /revoke execute on function reject_archived_coworker_message\(\) from public/);
  assert.match(migration, /revoke execute on function reject_archived_coworker_review_audit\(\) from public/);
});

test("conversation projection includes archive state", () => {
  assert.match(
    conversations,
    /const CONVERSATION_PROJECTION = "id, organization_id, user_id, title, created_at, updated_at, archived_at"/,
  );
});

test("active conversation reads exclude archived conversations", () => {
  for (const [name, nextName] of [
    ["listConversations", "listArchivedConversations"],
    ["loadOwnedConversation", "loadOwnedMessage"],
  ]) {
    const body = functionBody(conversations, name, nextName);
    assert.match(body, /\.eq\("organization_id", ctx\.orgId\)/);
    assert.match(body, /\.eq\("user_id", ctx\.userId\)/);
    assert.match(body, /\.is\("archived_at", null\)/);
  }
});

test("archived conversation list is private, newest-first, and capped", () => {
  const body = functionBody(conversations, "listArchivedConversations", "createConversation");
  assert.match(body, /\.select\(CONVERSATION_PROJECTION\)/);
  assert.match(body, /\.eq\("organization_id", ctx\.orgId\)/);
  assert.match(body, /\.eq\("user_id", ctx\.userId\)/);
  assert.match(body, /\.not\("archived_at", "is", null\)/);
  assert.match(body, /\.order\("archived_at", \{ ascending: false \}\)/);
  assert.match(body, /\.limit\(50\)/);
});

test("archive mutations are private and state-specific", () => {
  const cases = [
    ["archiveOwnedConversation", "restoreOwnedConversation", /\.is\("archived_at", null\)/],
    ["restoreOwnedConversation", "deleteArchivedOwnedConversation", /\.not\("archived_at", "is", null\)/],
    ["deleteArchivedOwnedConversation", "loadOwnedConversation", /\.not\("archived_at", "is", null\)/],
  ];

  for (const [name, nextName, statePredicate] of cases) {
    const body = functionBody(conversations, name, nextName);
    assert.match(body, /\.eq\("id", conversationId\)/);
    assert.match(body, /\.eq\("organization_id", ctx\.orgId\)/);
    assert.match(body, /\.eq\("user_id", ctx\.userId\)/);
    assert.match(body, statePredicate);
    assert.match(body, /\.maybeSingle\(\)/);
  }

  const archive = functionBody(conversations, "archiveOwnedConversation", "restoreOwnedConversation");
  assert.match(archive, /const archivedAt = new Date\(\)\.toISOString\(\)/);
  assert.match(archive, /\.update\(\{ archived_at: archivedAt \}\)/);
  assert.match(archive, /\.select\(CONVERSATION_PROJECTION\)/);

  const restore = functionBody(conversations, "restoreOwnedConversation", "deleteArchivedOwnedConversation");
  assert.match(restore, /\.update\(\{ archived_at: null \}\)/);
  assert.match(restore, /\.select\(CONVERSATION_PROJECTION\)/);

  const remove = functionBody(conversations, "deleteArchivedOwnedConversation", "loadOwnedConversation");
  assert.match(remove, /\.delete\(\)/);
  assert.match(remove, /\.select\("id"\)/);
});

test("archived conversations cannot expose message history or review provenance", () => {
  for (const [name, nextName] of [
    ["listMessages", "insertMessage"],
    ["insertMessage", null],
    ["loadOwnedMessage", "listMessages"],
  ]) {
    const body = functionBody(conversations, name, nextName);
    assert.match(body, /await loadOwnedConversation\(ctx, conversationId\)/);
    assert.match(body, /if \(!conversation\) return null/);
  }
});
