import test from "node:test";
import assert from "node:assert/strict";

import { classifyCoworkerIntent } from "../src/lib/coworker/classify-intent.ts";

test("classifies a manual question", () => {
  assert.deepEqual(classifyCoworkerIntent("What changed?"), {
    intent: "manual_question",
  });
});

test("classifies a pending findings list request", () => {
  assert.deepEqual(classifyCoworkerIntent("Show pending findings"), {
    intent: "list_pending_findings",
  });
});

test("classifies a finding explanation request when finding context exists", () => {
  assert.deepEqual(classifyCoworkerIntent("Why does this affect us?", { findingId: "finding-1" }), {
    intent: "explain_finding",
  });
});

test("classifies a draft preview request when finding context exists", () => {
  assert.deepEqual(classifyCoworkerIntent("Preview revised wording", { findingId: "finding-1" }), {
    intent: "preview_draft_update",
  });
});

test("rejects mutation requests even when finding context exists", () => {
  assert.deepEqual(classifyCoworkerIntent("Apply the revised wording", { findingId: "finding-1" }), {
    intent: "unsupported",
  });
});

for (const text of [
  "Update this manual now",
  "Edit the manual section",
  "Trigger the export",
  "Send this externally",
  "Create a review item",
]) {
  test(`rejects mutation request: ${text}`, () => {
    assert.deepEqual(classifyCoworkerIntent(text), { intent: "unsupported" });
  });
}

test("rejects removing wording when finding context exists", () => {
  assert.deepEqual(classifyCoworkerIntent("Remove this wording", { findingId: "finding-1" }), {
    intent: "unsupported",
  });
});

test("keeps safe pending review item questions routed to the queue", () => {
  assert.deepEqual(classifyCoworkerIntent("Which pending review items need attention?"), {
    intent: "list_pending_findings",
  });
});

test("keeps informational update questions supported", () => {
  assert.deepEqual(classifyCoworkerIntent("What updates apply to solo flights?"), {
    intent: "manual_question",
  });
});

test("explains why a finding was rejected when finding context exists", () => {
  assert.deepEqual(classifyCoworkerIntent("Why was this finding rejected?", { findingId: "finding-1" }), {
    intent: "explain_finding",
  });
});

test("explains an updated rule when finding context exists", () => {
  assert.deepEqual(classifyCoworkerIntent("Explain why EASA updated this rule", { findingId: "finding-1" }), {
    intent: "explain_finding",
  });
});

test("keeps informational approval questions supported", () => {
  assert.deepEqual(classifyCoworkerIntent("Who approved this revision?"), {
    intent: "manual_question",
  });
});

test("rejects modal mutation requests with a polite modifier", () => {
  assert.deepEqual(
    classifyCoworkerIntent("Can you please apply the revised wording?", { findingId: "finding-1" }),
    { intent: "unsupported" },
  );
});

test("rejects polite mutation requests with comma punctuation", () => {
  assert.deepEqual(
    classifyCoworkerIntent("Please, apply the revised wording", { findingId: "finding-1" }),
    { intent: "unsupported" },
  );
});

test("rejects kindly prefixed mutation requests", () => {
  assert.deepEqual(classifyCoworkerIntent("Kindly create a review item"), {
    intent: "unsupported",
  });
});

test("rejects go-ahead mutation requests", () => {
  assert.deepEqual(
    classifyCoworkerIntent("Go ahead and apply the revised wording", { findingId: "finding-1" }),
    { intent: "unsupported" },
  );
});

test("rejects want-you-to mutation requests", () => {
  assert.deepEqual(
    classifyCoworkerIntent("I want you to apply the revised wording", { findingId: "finding-1" }),
    { intent: "unsupported" },
  );
});

test("rejects would-you-mind mutation requests", () => {
  assert.deepEqual(
    classifyCoworkerIntent("Would you mind applying the revised wording?", { findingId: "finding-1" }),
    { intent: "unsupported" },
  );
});

test("rejects modal go-ahead mutation requests", () => {
  assert.deepEqual(classifyCoworkerIntent("Could you go ahead and create a review item?"), {
    intent: "unsupported",
  });
});
