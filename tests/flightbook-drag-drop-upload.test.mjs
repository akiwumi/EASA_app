import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const upload = fs.readFileSync("src/components/flightbooks/FlightbookUpload.tsx", "utf8");

test("flight book upload has an accessible drag-and-drop file zone", () => {
  assert.match(upload, /const SUPPORTED_FILE_EXTENSIONS = \["\.pdf", "\.doc", "\.docx", "\.txt", "\.md", "\.json"\]/);
  assert.match(upload, /function isSupportedFile\(file: File\)/);
  assert.match(upload, /function selectFile\(nextFile: File\)/);
  assert.match(upload, /const \[dragActive, setDragActive\] = useState\(false\)/);
  assert.match(upload, /function onDrop\(event: React\.DragEvent<HTMLDivElement>\)/);
  assert.match(upload, /Only one flight book can be uploaded at a time\./);
  assert.match(upload, /Unsupported file type\. Drop PDF, DOC, DOCX, TXT, MD, or JSON\./);
  assert.match(upload, /role="button"/);
  assert.match(upload, /tabIndex=\{0\}/);
  assert.match(upload, /aria-label="Choose or drop a flight book file"/);
  assert.match(upload, /onKeyDown=\{onDropZoneKeyDown\}/);
  assert.match(upload, /className="sr-only"/);
  assert.match(upload, /Drag and drop your flight book here/);
  assert.match(upload, /dragActive \? "border-\[var\(--easa-color-brand-primary\)\]/);
});
