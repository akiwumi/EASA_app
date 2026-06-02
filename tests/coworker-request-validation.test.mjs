import test from "node:test";
import assert from "node:assert/strict";

import {
  ConversationRequestValidationError,
  isUuid,
  parseConversationRequestBody,
  parseConversationTitle,
} from "../src/lib/coworker/request-validation.ts";

for (const value of ["", "   ", "{}"]) {
  test(`parseConversationRequestBody accepts empty object request: ${JSON.stringify(value)}`, () => {
    assert.deepEqual(parseConversationRequestBody(value), {});
  });
}

test("parseConversationRequestBody preserves an object title", () => {
  assert.deepEqual(parseConversationRequestBody('{"title":"Ops"}'), { title: "Ops" });
});

for (const value of ["null", "[]", '"x"', "42", "{"]) {
  test(`parseConversationRequestBody rejects invalid request: ${value}`, () => {
    assert.throws(
      () => parseConversationRequestBody(value),
      ConversationRequestValidationError,
    );
  });
}

test("parseConversationTitle defaults an omitted title", () => {
  assert.equal(parseConversationTitle(undefined), "New conversation");
});

test("parseConversationTitle trims a valid title", () => {
  assert.equal(parseConversationTitle("  Flight operations  "), "Flight operations");
});

for (const value of ["", "   ", null, 42, "x".repeat(121)]) {
  test(`parseConversationTitle rejects invalid title: ${String(value).slice(0, 20)}`, () => {
    assert.throws(
      () => parseConversationTitle(value),
      ConversationRequestValidationError,
    );
  });
}

test("isUuid accepts a valid UUID", () => {
  assert.equal(isUuid("123e4567-e89b-42d3-a456-426614174000"), true);
});

for (const value of [
  "",
  "not-a-uuid",
  "123e4567-e89b-12d3-a456-42661417400",
  "123e4567-e89b-62d3-a456-426614174000",
]) {
  test(`isUuid rejects malformed value: ${value}`, () => {
    assert.equal(isUuid(value), false);
  });
}
