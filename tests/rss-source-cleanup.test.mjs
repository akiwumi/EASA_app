import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const seedDefaults = fs.readFileSync("src/lib/seed-default-sources.ts", "utf8");
const signoffFixtures = fs.readFileSync("scripts/seed-runtime-signoff-fixtures.mjs", "utf8");

test("default source seeding deactivates local-only RSS fixture sources", () => {
  assert.match(seedDefaults, /\.eq\("type", "rss"\)[\s\S]*?\.like\("url", "%\.easa\.local\/%"\)/);
  assert.match(seedDefaults, /\.update\(\{ active: false \}\)/);
});

test("runtime signoff fixture does not create an active fake RSS feed", () => {
  assert.match(signoffFixtures, /url: sourceUrl,[\s\S]*?type: "rss",[\s\S]*?active: false/);
});
