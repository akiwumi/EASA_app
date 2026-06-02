import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const archiveRoute = fs.readFileSync(
  "src/app/api/coworker/conversations/archive/route.ts",
  "utf8",
);
const lifecycleRoute = fs.readFileSync(
  "src/app/api/coworker/conversations/[id]/route.ts",
  "utf8",
);

test("archive list route authenticates and returns private archived conversations", () => {
  assert.match(archiveRoute, /export async function GET/);
  assert.match(archiveRoute, /await getOrgAccessContext\(\)/);
  assert.match(archiveRoute, /status: 401/);
  assert.match(archiveRoute, /await listArchivedConversations\(ctx\)/);
  assert.match(archiveRoute, /NextResponse\.json\(\{ conversations \}\)/);
});

test("archive list route uses a stable server error response", () => {
  assert.match(archiveRoute, /console\.error/);
  assert.match(archiveRoute, /\{ error: "Internal server error" \}/);
  assert.match(archiveRoute, /status: 500/);
  assert.doesNotMatch(archiveRoute, /error\.message/);
});

test("conversation lifecycle PATCH authenticates and validates UUID params", () => {
  assert.match(lifecycleRoute, /export async function PATCH/);
  assert.match(lifecycleRoute, /await getOrgAccessContext\(\)/);
  assert.match(lifecycleRoute, /status: 401/);
  assert.match(lifecycleRoute, /const \{ id \} = await params/);
  assert.match(lifecycleRoute, /if \(!isUuid\(id\)\) return notFound\(\)/);
});

test("conversation lifecycle PATCH only accepts archive and restore actions", () => {
  assert.match(lifecycleRoute, /JSON\.parse\(await request\.text\(\)\)/);
  assert.match(lifecycleRoute, /action === "archive" \|\| action === "restore"/);
  assert.match(lifecycleRoute, /\{ error: "Invalid action" \}/);
  assert.match(lifecycleRoute, /status: 400/);
});

test("conversation lifecycle PATCH wires archive and restore and hides invalid state", () => {
  assert.match(lifecycleRoute, /action === "archive"/);
  assert.match(lifecycleRoute, /await archiveOwnedConversation\(ctx, id\)/);
  assert.match(lifecycleRoute, /await restoreOwnedConversation\(ctx, id\)/);
  assert.match(lifecycleRoute, /if \(!conversation\) return notFound\(\)/);
  assert.match(lifecycleRoute, /\{ error: "Not found" \}/);
  assert.match(lifecycleRoute, /status: 404/);
});

test("conversation lifecycle DELETE permanently deletes archived owned conversations only", () => {
  assert.match(lifecycleRoute, /export async function DELETE/);
  assert.match(lifecycleRoute, /await deleteArchivedOwnedConversation\(ctx, id\)/);
  assert.match(lifecycleRoute, /if \(!conversation\) return notFound\(\)/);
  assert.match(lifecycleRoute, /NextResponse\.json\(\{ ok: true, id: conversation\.id \}\)/);
});

test("conversation lifecycle route uses a stable server error response", () => {
  assert.match(lifecycleRoute, /console\.error/);
  assert.match(lifecycleRoute, /\{ error: "Internal server error" \}/);
  assert.match(lifecycleRoute, /status: 500/);
  assert.doesNotMatch(lifecycleRoute, /error\.message/);
});
