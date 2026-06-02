import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { createJiti } from "jiti";

const helperPath = "src/lib/flightbooks/doc.ts";
const route = fs.readFileSync("src/app/api/flightbooks/upload/route.ts", "utf8");
const uploadUi = fs.readFileSync("src/components/flightbooks/FlightbookUpload.tsx", "utf8");
const help = fs.readFileSync("src/lib/help/articles.ts", "utf8");
const faq = fs.readFileSync("src/app/faq/page.tsx", "utf8");
const flightbookDetail = fs.readFileSync("src/app/(app)/flightbooks/[id]/page.tsx", "utf8");

test("legacy DOC extraction helper reads text from a binary Word document", async () => {
  assert.equal(fs.existsSync(helperPath), true, "legacy DOC extraction helper must exist");

  const jiti = createJiti(import.meta.url);
  const { extractDocText } = jiti("../src/lib/flightbooks/doc.ts");
  const bytes = fs.readFileSync("tests/fixtures/legacy-word-sample.doc");

  const text = await extractDocText(bytes);

  assert.match(text, /Legacy Operations Manual/);
  assert.match(text, /1\.1 Solo flight requirements/);
});

test("flight book upload route parses legacy DOC files before storing originals", () => {
  assert.match(route, /import \{ extractDocText \} from "@\/lib\/flightbooks\/doc";/);
  assert.match(route, /else if \(filename\.endsWith\("\.doc"\)\) \{[\s\S]*?extractDocText\(bytes\)[\s\S]*?detectSections\(text\)/);
  assert.match(route, /Upload PDF, DOC, DOCX, TXT, MD, or JSON\./);

  const extractionIndex = route.indexOf("extractDocText(bytes)");
  const storageIndex = route.indexOf(".upload(originalStoragePath, bytes");
  assert.ok(extractionIndex > -1 && extractionIndex < storageIndex, "DOC extraction must finish before storage");
});

test("flight book upload guidance offers legacy DOC files", () => {
  assert.match(uploadUi, /accept="\.pdf,\.doc,\.docx,\.txt,\.md,\.json"/);
  assert.match(uploadUi, /PDF · DOC · DOCX · TXT · MD · JSON/);
  assert.match(uploadUi, />DOC \/ DOCX<\/strong>/);
  assert.match(help, /DOC and DOCX/);
  assert.match(faq, /PDF, DOC, DOCX, TXT/);
  assert.match(flightbookDetail, /PDF, DOC, DOCX, TXT, or MD/);
});
