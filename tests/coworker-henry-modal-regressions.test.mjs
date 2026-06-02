import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const modal = fs.readFileSync("src/components/coworker/CoworkerDrawer.tsx", "utf8");
const geometry = fs.readFileSync("src/components/coworker/useHenryModalGeometry.ts", "utf8");
const launcher = fs.readFileSync("src/components/coworker/CoworkerLauncher.tsx", "utf8");
const welcome = fs.readFileSync("src/components/coworker/HenryWelcomeBubble.tsx", "utf8");
const appShell = fs.readFileSync("src/components/navigation/AppShell.tsx", "utf8");
const archivePage = fs.readFileSync("src/components/coworker/CoworkerArchiveClient.tsx", "utf8");
const proxy = fs.readFileSync("src/proxy.ts", "utf8");

test("Henry modal supports saved desktop drag and resize", () => {
  assert.match(modal, /Henry/);
  assert.match(modal, /onPointerDown=\{onHeaderPointerDown\}/);
  assert.match(modal, /onPointerDown=\{onResizePointerDown\}/);
  assert.match(geometry, /henry-modal-geometry/);
  assert.match(geometry, /window\.localStorage/);
  assert.match(geometry, /"drag" \| "resize"/);
  assert.match(geometry, /clampGeometry/);
  assert.match(geometry, /DESKTOP_BREAKPOINT = 1024/);
});

test("Henry modal uses dashboard-style controls and mobile full-screen layout", () => {
  assert.match(modal, /lg:rounded-\[30px\]/);
  assert.match(modal, /bg-\[var\(--easa-color-brand-light\)\]/);
  assert.match(modal, /bg-\[var\(--easa-color-surface-2\)\]/);
  assert.match(modal, /aria-label="Open Henry archive"/);
  assert.match(modal, /aria-label="Resize Henry"/);
  assert.match(modal, /aria-label="Close Henry"/);
});

test("Henry launcher uses the Henry name on desktop and mobile", () => {
  assert.match(launcher, /aria-label="Open Henry"/);
  assert.match(launcher, />\s*Henry\s*</);
  assert.doesNotMatch(launcher, /Compliance coworker/);
});

test("Henry welcome bubble appears once per login session", () => {
  assert.match(welcome, /Hello, how can I help you\?/);
  assert.match(welcome, /henry-welcome-dismissed/);
  assert.match(welcome, /window\.sessionStorage/);
  assert.match(welcome, /openCoworker\(\)/);
  assert.match(welcome, /event\.stopPropagation\(\)/);
  assert.match(appShell, /<HenryWelcomeBubble \/>/);
});

test("sign out resets the Henry login greeting", () => {
  assert.match(appShell, /window\.sessionStorage\.removeItem\(HENRY_WELCOME_DISMISSED_KEY\)/);
});

test("archive page restores and confirmation-gates permanent deletion", () => {
  assert.match(archivePage, /refreshArchivedConversations/);
  assert.match(archivePage, /restoreConversation\(conversation\.id\)/);
  assert.match(archivePage, /Delete permanently/);
  assert.match(archivePage, /window\.confirm\(/);
  assert.match(archivePage, /deleteArchivedConversation\(conversation\.id\)/);
  assert.match(proxy, /"\/coworker"/);
});
