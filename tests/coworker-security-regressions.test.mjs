import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

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
const proposedUpdatePreview = fs.existsSync("src/lib/ai/proposed-update-preview.ts")
  ? fs.readFileSync("src/lib/ai/proposed-update-preview.ts", "utf8")
  : "";
const coworkerTools = fs.existsSync("src/lib/coworker/tools.ts")
  ? fs.readFileSync("src/lib/coworker/tools.ts", "utf8")
  : "";
const coworkerOrchestration = fs.existsSync("src/lib/coworker/orchestrate-message.ts")
  ? fs.readFileSync("src/lib/coworker/orchestrate-message.ts", "utf8")
  : "";
const queueFindingService = fs.existsSync("src/lib/findings/queue-finding.ts")
  ? fs.readFileSync("src/lib/findings/queue-finding.ts", "utf8")
  : "";
const addToQueueRoute = fs.readFileSync("src/app/api/findings/add-to-queue/route.ts", "utf8");
const createReviewItemRoute = fs.existsSync("src/app/api/coworker/actions/create-review-item/route.ts")
  ? fs.readFileSync("src/app/api/coworker/actions/create-review-item/route.ts", "utf8")
  : "";
const queueRequestValidation = fs.existsSync("src/lib/findings/queue-request-validation.ts")
  ? fs.readFileSync("src/lib/findings/queue-request-validation.ts", "utf8")
  : "";
const memoryService = fs.existsSync("src/lib/ai/memory.ts")
  ? fs.readFileSync("src/lib/ai/memory.ts", "utf8")
  : "";

function functionBody(source, name, nextName) {
  const start = source.indexOf(`export async function ${name}`);
  assert.notEqual(start, -1, `${name} export is missing`);
  const end = nextName ? source.indexOf(`export async function ${nextName}`, start) : source.length;
  return source.slice(start, end === -1 ? source.length : end);
}

function resolveLocalModule(fromFile, specifier) {
  const basePath = specifier.startsWith("@/")
    ? path.join("src", specifier.slice(2))
    : path.resolve(path.dirname(fromFile), specifier);
  return [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.tsx"),
  ].find((candidate) => fs.existsSync(candidate)) ?? null;
}

function reachableLocalModules(entryFile) {
  const visited = new Set();
  const pending = [entryFile];

  while (pending.length) {
    const file = pending.pop();
    if (!file || visited.has(file)) continue;
    visited.add(file);
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(/(?:from\s+|import\()\s*["']([^"']+)["']/g)) {
      const specifier = match[1];
      if (!specifier.startsWith("@/") && !specifier.startsWith(".")) continue;
      const resolved = resolveLocalModule(file, specifier);
      if (resolved) pending.push(resolved);
    }
  }

  return visited;
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

test("owned assistant message lookup scopes message, conversation, organization, and user", () => {
  const body = functionBody(conversations, "loadOwnedMessage", "listMessages");

  assert.match(body, /\.from\("coworker_messages"\)/);
  assert.match(body, /\.select\(MESSAGE_PROJECTION\)/);
  assert.match(body, /\.eq\("id", messageId\)/);
  assert.match(body, /\.eq\("conversation_id", conversationId\)/);
  assert.match(body, /\.eq\("organization_id", ctx\.orgId\)/);
  assert.match(body, /\.eq\("user_id", ctx\.userId\)/);
  assert.match(body, /\.eq\("role", "assistant"\)/);
  assert.match(body, /\.maybeSingle\(\)/);
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

test("authenticated users cannot forge coworker assistant messages", () => {
  assert.match(schemaMigration, /drop policy if exists "coworker_messages insert own"/);
  assert.doesNotMatch(schemaMigration, /create policy "coworker_messages insert own"/);
  assert.match(schemaMigration, /revoke insert, update, delete on coworker_messages from authenticated/);
  assert.match(schemaMigration, /grant select on coworker_messages to authenticated/);
  assert.doesNotMatch(schemaMigration, /grant select, insert on coworker_messages to authenticated/);
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
  assert.match(messagesRoute, /export async function POST/);
  assert.match(messagesRoute, /orchestrateCoworkerMessage/);
});

test("normal coworker chat cannot queue findings or import mutation tools", () => {
  assert.doesNotMatch(messagesRoute, /queueFinding|queue-finding|create-review-item/);
  assert.doesNotMatch(coworkerOrchestration, /queueFinding|queue-finding|create-review-item/);
});

test("coworker draft previews use the preview-only helper", () => {
  assert.match(coworkerTools, /from "@\/lib\/ai\/proposed-update-preview"/);
  assert.doesNotMatch(coworkerTools, /from "@\/lib\/ai\/proposed-updates"/);
  assert.match(proposedUpdatePreview, /export async function generateDraftPreviewForFinding/);
  assert.doesNotMatch(proposedUpdatePreview, /\.from\("proposed_updates"\)/);
  assert.doesNotMatch(proposedUpdatePreview, /\.insert\(/);
  assert.doesNotMatch(proposedUpdatePreview, /\.update\(/);
  assert.doesNotMatch(proposedUpdatePreview, /@\/lib\/ai\/proposed-updates/);
  assert.doesNotMatch(coworkerTools, /insertProposedUpdateWithFallback/);
  assert.doesNotMatch(coworkerTools, /updateProposedDraftWithFallback/);
});

test("coworker read-only tool graph cannot reach proposed update writes", () => {
  const reachable = reachableLocalModules("src/lib/coworker/tools.ts");
  assert.equal(reachable.has("src/lib/ai/proposed-updates.ts"), false);

  for (const file of reachable) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(
      source,
      /\.from\("proposed_updates"\)[\s\S]{0,160}\.(?:insert|update)\(/,
      `${file} must not write proposed_updates`,
    );
  }
});

test("coworker memory support remains read-only advisory", () => {
  assert.match(coworkerTools, /retrieveFlightbookMemories/);
  assert.doesNotMatch(memoryService, /@\/lib\/ai\/proposed-updates|@\/lib\/findings\/queue-finding/);
  assert.doesNotMatch(memoryService, /\.from\("proposed_updates"\)/);
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

test("queue finding service rejects non-approver roles before data reads", () => {
  const body = functionBody(queueFindingService, "queueFinding");
  const roleGate = body.indexOf("ORG_APPROVER_ROLES.includes");
  const firstRead = body.indexOf('.from("ai_findings")');

  assert.notEqual(roleGate, -1, "queueFinding approver role gate is missing");
  assert.notEqual(firstRead, -1, "queueFinding finding read is missing");
  assert.ok(roleGate < firstRead, "queueFinding must reject unauthorized roles before data reads");
  assert.match(body, /return \{ findingId, error: "Forbidden" \}/);
});

test("queue finding service records required coworker provenance audit", () => {
  const body = functionBody(queueFindingService, "queueFinding");
  const auditBody = queueFindingService.slice(
    queueFindingService.indexOf("async function insertProvenanceAudit"),
    queueFindingService.indexOf("export async function queueFinding"),
  );

  assert.match(body, /provenance\?:/);
  assert.match(body, /insertProvenanceAudit\(admin, ctx, result, provenance\)/);
  assert.match(queueFindingService, /if \(provenance\)/);
  assert.match(queueFindingService, /\.from\("audit_log"\)\.insert\(\{/);
  assert.match(queueFindingService, /organization_id: ctx\.orgId/);
  assert.match(queueFindingService, /actor_id: ctx\.userId/);
  assert.match(queueFindingService, /action: "coworker_review_item_created"/);
  assert.match(queueFindingService, /entity_type: "proposed_update"/);
  assert.match(queueFindingService, /entity_id: result\.id/);
  assert.match(queueFindingService, /payload: provenance/);
  assert.match(queueFindingService, /if \(auditError\) return auditError/);
  assert.match(auditBody, /catch \(error\)/);
});

test("queue finding compensates only newly created proposals after provenance audit failure", () => {
  const body = functionBody(queueFindingService, "queueFinding");
  const existingRegion = body.slice(body.indexOf("if (existing.data)"), body.indexOf("const { data: created"));
  const createdRegion = body.slice(body.indexOf("const { data: created"));

  assert.match(queueFindingService, /compensateCreatedProposal/);
  assert.doesNotMatch(existingRegion, /compensateCreatedProposal/);
  assert.match(createdRegion, /if \(auditError\) \{/);
  assert.match(createdRegion, /await compensateCreatedProposal\(admin, ctx\.orgId, String\(created\.id\)\)/);
  assert.match(createdRegion, /console\.error/);
  assert.match(createdRegion, /catch \(compensationError\)/);
  assert.match(createdRegion, /return \{ findingId, error: "Unable to record coworker review item audit\." \}/);
});

test("coworker review item action validates ownership before queue mutation", () => {
  assert.match(createReviewItemRoute, /await getOrgAccessContext\(\)/);
  assert.match(createReviewItemRoute, /status: 401/);
  assert.match(createReviewItemRoute, /await request\.text\(\)/);
  assert.match(createReviewItemRoute, /typeof body !== "object"/);
  assert.match(createReviewItemRoute, /isUuid\(findingId\)/);
  assert.match(createReviewItemRoute, /isUuid\(conversationId\)/);
  assert.match(createReviewItemRoute, /isUuid\(sourceMessageId\)/);
  assert.match(createReviewItemRoute, /status: 404/);

  const ownedConversation = createReviewItemRoute.indexOf("await loadOwnedConversation(ctx, conversationId)");
  const ownedMessage = createReviewItemRoute.indexOf("await loadOwnedMessage(ctx, conversationId, sourceMessageId)");
  const queueMutation = createReviewItemRoute.indexOf("await queueFinding(");
  assert.notEqual(ownedConversation, -1, "owned conversation validation is missing");
  assert.notEqual(ownedMessage, -1, "owned assistant message validation is missing");
  assert.notEqual(queueMutation, -1, "queueFinding call is missing");
  assert.ok(ownedConversation < queueMutation, "conversation ownership must be checked before queue mutation");
  assert.ok(ownedConversation < ownedMessage, "conversation ownership must be checked before message ownership");
  assert.ok(ownedMessage < queueMutation, "message ownership must be checked before queue mutation");
  assert.match(createReviewItemRoute, /if \(!sourceMessage\) return notFound\(\)/);
  assert.match(createReviewItemRoute, /hasDraftCardForFinding\(sourceMessage, findingId\)/);
  assert.match(createReviewItemRoute, /\.type === "draft"/);
  assert.match(createReviewItemRoute, /\.findingId === findingId/);
  assert.match(createReviewItemRoute, /queueFinding\(admin, ctx, findingId, true, provenance\)/);
  assert.match(createReviewItemRoute, /console\.error/);
  assert.match(createReviewItemRoute, /\{ error: "Unable to create review item\." \}/);
  assert.doesNotMatch(createReviewItemRoute, /\{ error: result\.error \}/);
  assert.doesNotMatch(createReviewItemRoute, /\.\.\.result/);
  assert.match(createReviewItemRoute, /draftError: result\.draftError \? "Unable to generate draft\." : undefined/);
});

test("existing add-to-queue route is a thin shared-service adapter", () => {
  assert.match(addToQueueRoute, /import \{ queueFinding, type QueueFindingResult \} from "@\/lib\/findings\/queue-finding"/);
  assert.doesNotMatch(addToQueueRoute, /\.from\("ai_findings"\)/);
  assert.match(queueRequestValidation, /body\.findingIds/);
  assert.match(queueRequestValidation, /body\.findingId/);
  assert.match(addToQueueRoute, /await queueFinding\(admin, ctx, findingId, generateDraft\)/);
  assert.match(addToQueueRoute, /parseQueueFindingRequest/);
  assert.match(addToQueueRoute, /await request\.text\(\)/);
  assert.match(addToQueueRoute, /status: 400/);
  assert.match(addToQueueRoute, /status: 500/);
  assert.match(addToQueueRoute, /console\.error/);
  assert.match(addToQueueRoute, /\{ error: "Internal server error" \}/);
  assert.match(addToQueueRoute, /draftError: result\.draftError \? "Unable to generate draft\." : undefined/);
  assert.doesNotMatch(addToQueueRoute, /error\.message/);
  assert.match(queueRequestValidation, /isUuid/);
});
