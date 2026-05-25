import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const updatesRoute = fs.readFileSync("src/app/api/updates/route.ts", "utf8");
const summaryRoute = fs.readFileSync("src/app/api/pipeline/summary/route.ts", "utf8");
const dismissRoute = fs.readFileSync("src/app/api/findings/mark-not-relevant/route.ts", "utf8");

test("updates fallback query carries draft text used by queue cards", () => {
  assert.match(
    updatesRoute,
    /from\("proposed_updates"\)[\s\S]*?select\(`[\s\S]*?ai_suggested_text,[\s\S]*?reg_change_id,[\s\S]*?flightbook_section_id/s,
  );
});

test("pipeline summary dismissal has a cookie fallback when ui state persistence is unavailable", () => {
  assert.match(summaryRoute, /pipeline_summary_seen_/);
  assert.match(summaryRoute, /response\.cookies\.set/);
});

test("mark-not-relevant always boneyards the clicked proposed update", () => {
  assert.match(dismissRoute, /matchingProposalIds\.push\(body\.proposedUpdateId\)/);
  assert.match(dismissRoute, /\.eq\("ai_finding_id", resolvedFindingId\)/);
});
