import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const provider = fs.readFileSync(
  "src/components/coworker/CoworkerProvider.tsx",
  "utf8",
);
const conversationList = fs.readFileSync(
  "src/components/coworker/ConversationList.tsx",
  "utf8",
);

test("provider restores a saved active conversation only after confirming the active server list", () => {
  assert.match(provider, /ACTIVE_CONVERSATION_STORAGE_KEY = "henry-active-conversation-id"/);
  assert.match(provider, /const activeConversationStorageHydrated = useRef\(false\)/);
  assert.match(provider, /if \(!activeConversationStorageHydrated\.current\) return/);
  assert.match(provider, /window\.localStorage\.setItem\(ACTIVE_CONVERSATION_STORAGE_KEY, activeConversationId\)/);
  assert.match(provider, /window\.localStorage\.removeItem\(ACTIVE_CONVERSATION_STORAGE_KEY\)/);
  assert.match(provider, /const saved = window\.localStorage\.getItem\(ACTIVE_CONVERSATION_STORAGE_KEY\)/);
  assert.match(provider, /\[current, saved\]\.find\(\(id\) => id && next\.some\(\(conversation\) => conversation\.id === id\)\)/);
  assert.match(provider, /activeConversationStorageHydrated\.current = true/);
});

test("provider protects active and message loads from stale async responses", () => {
  assert.match(provider, /const conversationLoadSequence = useRef\(0\)/);
  assert.match(provider, /const sequence = \+\+conversationLoadSequence\.current/);
  assert.match(provider, /if \(sequence !== conversationLoadSequence\.current\) return/);
  assert.match(provider, /if \(!cancelled && sequence === messageLoadSequence\.current\) setLoading\(false\)/);
});

test("send uses the current active conversation ref after rapid chat switching", () => {
  assert.match(provider, /let conversationId = activeConversationIdRef\.current/);
  assert.match(provider, /\}, \[loadConversations, loadMessages\]\);/);
});

test("provider exposes and loads archived conversations separately", () => {
  assert.match(provider, /archivedConversations: CoworkerConversation\[\]/);
  assert.match(provider, /refreshArchivedConversations: \(\) => Promise<void>/);
  assert.match(provider, /fetch\("\/api\/coworker\/conversations\/archive"\)/);
  assert.match(provider, /setArchivedConversations\(next\)/);
});

test("archive action clears the active timeline and refreshes server-owned lists", () => {
  assert.match(provider, /body: JSON\.stringify\(\{ action: "archive" \}\)/);
  assert.match(provider, /if \(activeConversationIdRef\.current === id\)/);
  assert.match(provider, /activeConversationIdRef\.current = null/);
  assert.match(provider, /messageLoadSequence\.current \+= 1/);
  assert.match(provider, /setActiveConversationIdState\(null\)/);
  assert.match(provider, /setMessages\(\[\]\)/);
  assert.match(provider, /await Promise\.all\(\[loadConversations\(\), refreshArchivedConversations\(\)\]\)/);
  assert.doesNotMatch(provider, /const next = conversations\.filter/);
});

test("restore refreshes active and archived lists and delete removes archived state", () => {
  assert.match(provider, /body: JSON\.stringify\(\{ action: "restore" \}\)/);
  assert.match(provider, /await Promise\.all\(\[loadConversations\(\), refreshArchivedConversations\(\)\]\)/);
  assert.match(provider, /fetch\(`\/api\/coworker\/conversations\/\$\{id\}`, \{ method: "DELETE" \}\)/);
  assert.match(provider, /setArchivedConversations\(\(current\) => current\.filter\(\(conversation\) => conversation\.id !== id\)\)/);
});

test("conversation list offers Henry archive navigation and a separate archive control", () => {
  assert.match(conversationList, /href="\/coworker\/archive"/);
  assert.match(conversationList, /Henry archive/);
  assert.match(conversationList, /aria-label=\{`Archive \$\{conversation\.title\}`\}/);
  assert.match(conversationList, /event\.stopPropagation\(\)/);
  assert.match(conversationList, /void archiveConversation\(conversation\.id\)/);
  assert.match(conversationList, /void createConversation\(\)/);
});
