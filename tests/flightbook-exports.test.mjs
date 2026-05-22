import test from "node:test";
import assert from "node:assert/strict";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { buildMarkdown, buildText } = jiti("../src/lib/flightbook-exports.ts");

const exportInput = {
  book: {
    id: "book-1",
    name: "Operations Manual",
    doc_type: "manual",
    version_label: "Current",
  },
  exportedAt: "2026-05-22T09:30:00.000Z",
  versionNumber: 2,
  revisionLabel: "Rev 0002 - 2026-05-22 09:30 UTC",
  sections: [
    {
      id: "section-1",
      section_number: "1.1",
      title: "General",
      body: "Existing section body.",
    },
    {
      id: "section-2",
      section_number: "2.1",
      title: "Emergency Procedures",
      body: "Updated section body.",
    },
  ],
  updatedSectionIds: new Set(["section-2"]),
};

test("buildMarkdown marks sections updated in this revision", () => {
  const markdown = buildMarkdown(exportInput);

  assert.match(markdown, /## 2\.1 Emergency Procedures \[UPDATED\]/);
  assert.match(markdown, /> Updated in this revision from approved EASA queue item\(s\)\./);
  assert.doesNotMatch(markdown, /## 1\.1 General \[UPDATED\]/);
});

test("buildText marks sections updated in this revision", () => {
  const text = buildText(exportInput);

  assert.match(text, /2\.1 Emergency Procedures \[UPDATED\]/);
  assert.match(text, /Updated in this revision from approved EASA queue item\(s\)\./);
  assert.doesNotMatch(text, /1\.1 General \[UPDATED\]/);
});
