import test from "node:test";
import assert from "node:assert/strict";

import { classifyCoworkerIntent } from "../src/lib/coworker/classify-intent.ts";
import { orchestrateCoworkerMessage } from "../src/lib/coworker/orchestrate-message.ts";

const ctx = { orgId: "org-1", userId: "user-1", role: "admin" };
const conversationId = "123e4567-e89b-42d3-a456-426614174000";
const findingId = "123e4567-e89b-42d3-a456-426614174001";
const unsupportedText =
  "I can research, explain, and prepare a draft. Open the review item to approve or reject a change.";
const recoverableText = "I could not complete that request. Please try again.";

function createDeps({ conversation = { id: conversationId }, failTool } = {}) {
  const calls = [];
  let messageSequence = 0;
  const result = {
    content: "Tool response",
    citations: [{ label: "Source", href: "/source", excerpt: "Evidence" }],
    cards: [],
  };
  const tool = (name) => async (...args) => {
    calls.push({ type: "tool", name, args });
    if (failTool === name) throw new Error("tool failed");
    return result;
  };

  return {
    calls,
    deps: {
      loadOwnedConversation: async (...args) => {
        calls.push({ type: "loadOwnedConversation", args });
        return conversation;
      },
      insertMessage: async (_ctx, input) => {
        calls.push({ type: "insertMessage", input });
        messageSequence += 1;
        return { id: `message-${messageSequence}`, ...input };
      },
      classifyCoworkerIntent,
      answerManualQuestion: tool("answerManualQuestion"),
      listPendingFindings: tool("listPendingFindings"),
      explainFinding: tool("explainFinding"),
      previewDraftUpdate: tool("previewDraftUpdate"),
      logError: () => {},
    },
  };
}

function toolCalls(calls) {
  return calls.filter((call) => call.type === "tool");
}

function insertedMessages(calls) {
  return calls.filter((call) => call.type === "insertMessage").map((call) => call.input);
}

for (const scenario of [
  {
    name: "manual question",
    input: { content: "What changed in the stored manual?" },
    intent: "manual_question",
    tool: "answerManualQuestion",
  },
  {
    name: "pending finding request",
    input: { content: "Show pending findings" },
    intent: "list_pending_findings",
    tool: "listPendingFindings",
  },
  {
    name: "finding explanation",
    input: { content: "Explain why this affects us", findingId },
    intent: "explain_finding",
    tool: "explainFinding",
  },
  {
    name: "draft preview",
    input: { content: "Preview revised wording", findingId },
    intent: "preview_draft_update",
    tool: "previewDraftUpdate",
  },
]) {
  test(`${scenario.name} calls exactly one approved tool and saves both messages`, async () => {
    const { deps, calls } = createDeps();
    const result = await orchestrateCoworkerMessage(ctx, conversationId, scenario.input, deps);

    assert.equal(result.ok, true);
    assert.deepEqual(toolCalls(calls).map((call) => call.name), [scenario.tool]);
    const messages = insertedMessages(calls);
    assert.equal(messages.length, 2);
    assert.deepEqual(messages[0], {
      conversationId,
      role: "user",
      content: scenario.input.content,
    });
    assert.deepEqual(messages[1], {
      conversationId,
      role: "assistant",
      intent: scenario.intent,
      content: "Tool response",
      metadata: {
        citations: [{ label: "Source", href: "/source", excerpt: "Evidence" }],
        cards: [],
      },
    });
    assert.deepEqual(result.response, {
      conversationId,
      messageId: "message-2",
      intent: scenario.intent,
      content: "Tool response",
      citations: [{ label: "Source", href: "/source", excerpt: "Evidence" }],
      cards: [],
    });
  });
}

test("unsupported mutation request calls no tool and saves bounded response", async () => {
  const { deps, calls } = createDeps();
  const result = await orchestrateCoworkerMessage(
    ctx,
    conversationId,
    { content: "Apply the revised wording", findingId },
    deps,
  );

  assert.equal(result.ok, true);
  assert.deepEqual(toolCalls(calls), []);
  assert.equal(result.response.intent, "unsupported");
  assert.equal(result.response.content, unsupportedText);
  assert.equal(insertedMessages(calls)[1].content, unsupportedText);
});

for (const intent of ["explain_finding", "preview_draft_update"]) {
  test(`${intent} without finding context is bounded unsupported and calls no tool`, async () => {
    const { deps, calls } = createDeps();
    deps.classifyCoworkerIntent = () => ({ intent });
    const result = await orchestrateCoworkerMessage(
      ctx,
      conversationId,
      { content: "Tell me more" },
      deps,
    );

    assert.equal(result.ok, true);
    assert.deepEqual(toolCalls(calls), []);
    assert.equal(result.response.intent, "unsupported");
    assert.equal(result.response.content, unsupportedText);
  });
}

test("foreign conversation returns 404 before saving messages or calling tools", async () => {
  const { deps, calls } = createDeps({ conversation: null });
  const result = await orchestrateCoworkerMessage(
    ctx,
    conversationId,
    { content: "Show pending findings" },
    deps,
  );

  assert.deepEqual(result, { ok: false, error: "Not found", status: 404 });
  assert.deepEqual(insertedMessages(calls), []);
  assert.deepEqual(toolCalls(calls), []);
});

test("tool failure preserves user message and saves recoverable assistant error", async () => {
  const { deps, calls } = createDeps({ failTool: "answerManualQuestion" });
  const result = await orchestrateCoworkerMessage(
    ctx,
    conversationId,
    { content: "What changed?" },
    deps,
  );

  assert.deepEqual(result, { ok: false, error: "Internal server error", status: 500 });
  assert.deepEqual(insertedMessages(calls), [
    { conversationId, role: "user", content: "What changed?" },
    {
      conversationId,
      role: "assistant",
      intent: "manual_question",
      content: recoverableText,
      metadata: { citations: [], cards: [] },
    },
  ]);
});
