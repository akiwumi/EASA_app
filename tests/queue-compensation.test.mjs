import test from "node:test";
import assert from "node:assert/strict";

import { compensateCreatedProposal } from "../src/lib/findings/queue-compensation.ts";

test("compensateCreatedProposal deletes created proposal scoped to organization", async () => {
  const calls = [];
  const admin = {
    from(table) {
      calls.push(["from", table]);
      return {
        delete() {
          calls.push(["delete"]);
          return {
            eq(column, value) {
              calls.push(["eq", column, value]);
              return this;
            },
            then(resolve) {
              resolve({ error: null });
            },
          };
        },
      };
    },
  };

  assert.equal(await compensateCreatedProposal(admin, "org-1", "proposal-1"), null);
  assert.deepEqual(calls, [
    ["from", "proposed_updates"],
    ["delete"],
    ["eq", "id", "proposal-1"],
    ["eq", "organization_id", "org-1"],
  ]);
});

test("compensateCreatedProposal returns deletion error", async () => {
  const expected = { message: "delete failed" };
  const admin = {
    from() {
      return {
        delete() {
          return {
            eq() {
              return this;
            },
            then(resolve) {
              resolve({ error: expected });
            },
          };
        },
      };
    },
  };

  assert.equal(await compensateCreatedProposal(admin, "org-1", "proposal-1"), expected);
});
