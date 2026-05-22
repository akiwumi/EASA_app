import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_ORG_ID, pickPreferredOrgMembership } from "../src/lib/supabase/org-membership.ts";

test("pickPreferredOrgMembership prefers active org when present", () => {
  const rows = [
    { organization_id: DEFAULT_ORG_ID, role: "admin" },
    { organization_id: "11111111-1111-4111-8111-111111111111", role: "viewer" },
  ];
  assert.equal(
    pickPreferredOrgMembership(rows, "11111111-1111-4111-8111-111111111111")?.organization_id,
    "11111111-1111-4111-8111-111111111111",
  );
});

test("pickPreferredOrgMembership ignores active org when user is not a member", () => {
  const rows = [{ organization_id: "22222222-2222-4222-8222-222222222222", role: "admin" }];
  assert.equal(
    pickPreferredOrgMembership(rows, "33333333-3333-4333-8333-333333333333")?.organization_id,
    "22222222-2222-4222-8222-222222222222",
  );
});