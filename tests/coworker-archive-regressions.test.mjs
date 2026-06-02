import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync(
  "supabase/migrations/20260602143000_coworker_conversation_archive.sql",
  "utf8",
);
const schemaMigration = fs.readFileSync(
  "supabase/migrations/schema/038_coworker_conversation_archive.sql",
  "utf8",
);

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
