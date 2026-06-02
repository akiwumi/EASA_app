import test from "node:test";
import assert from "node:assert/strict";

import {
  QueueFindingRequestValidationError,
  parseQueueFindingRequest,
} from "../src/lib/findings/queue-request-validation.ts";

const UUID_1 = "123e4567-e89b-42d3-a456-426614174000";
const UUID_2 = "123e4567-e89b-42d3-a456-426614174001";

for (const value of [
  null,
  [],
  "x",
  42,
  {},
  { findingId: "not-a-uuid" },
  { findingId: 42 },
  { findingIds: "not-an-array" },
  { findingIds: [] },
  { findingIds: [UUID_1, 42] },
  { findingIds: [UUID_1, "not-a-uuid"] },
  { findingId: UUID_1, generateDraft: "false" },
  { findingId: UUID_1, generateDraft: 0 },
  { findingId: UUID_1, generateDrafts: 1 },
  { findingId: UUID_1, generateDrafts: "true" },
  { findingId: UUID_1, generateDraft: true, generateDrafts: 1 },
]) {
  test(`parseQueueFindingRequest rejects invalid input: ${JSON.stringify(value)}`, () => {
    assert.throws(
      () => parseQueueFindingRequest(value),
      QueueFindingRequestValidationError,
    );
  });
}

test("parseQueueFindingRequest accepts one finding", () => {
  assert.deepEqual(parseQueueFindingRequest({ findingId: UUID_1 }), {
    findingIds: [UUID_1],
    isBatch: false,
    generateDraft: false,
  });
});

test("parseQueueFindingRequest accepts boolean draft flags", () => {
  assert.equal(
    parseQueueFindingRequest({ findingId: UUID_1, generateDraft: true }).generateDraft,
    true,
  );
  assert.equal(
    parseQueueFindingRequest({ findingId: UUID_1, generateDrafts: false }).generateDraft,
    false,
  );
});

test("parseQueueFindingRequest gives generateDraft precedence when both flags are boolean", () => {
  assert.equal(
    parseQueueFindingRequest({
      findingId: UUID_1,
      generateDraft: false,
      generateDrafts: true,
    }).generateDraft,
    false,
  );
});

test("parseQueueFindingRequest accepts unique batch IDs and caps work at 50", () => {
  const findingIds = Array.from(
    { length: 55 },
    (_, index) => `123e4567-e89b-42d3-a456-${String(index).padStart(12, "0")}`,
  );

  assert.deepEqual(
    parseQueueFindingRequest({
      findingIds: [UUID_1, UUID_1, UUID_2, ...findingIds],
      generateDrafts: true,
    }),
    {
      findingIds: [UUID_1, UUID_2, ...findingIds].slice(0, 50),
      isBatch: true,
      generateDraft: true,
    },
  );
});
