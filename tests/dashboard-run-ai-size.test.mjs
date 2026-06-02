import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const styles = fs.readFileSync("src/app/globals.css", "utf8");

test("dashboard Run AI hero action is reduced by about 60 percent", () => {
  assert.match(styles, /\.fl-dash \.fl-run-ai-btn-primary \{[\s\S]*?width: min\(100%, 224px\);[\s\S]*?min-height: 52px;/);
  assert.match(styles, /\.fl-dash \.fl-run-ai-icon \{[\s\S]*?width: 30px;[\s\S]*?height: 30px;/);
  assert.match(styles, /\.fl-dash \.fl-run-ai-copy span \{[\s\S]*?font-size: 14px;/);
  assert.match(styles, /\.fl-dash \.fl-run-ai-arrow \{[\s\S]*?width: 24px;[\s\S]*?height: 24px;/);
});
