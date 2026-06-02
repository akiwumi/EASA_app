import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { Document, Packer, Paragraph } from "docx";
import { createJiti } from "jiti";

const helperPath = "src/lib/flightbooks/docx.ts";
const route = fs.readFileSync("src/app/api/flightbooks/upload/route.ts", "utf8");
const uploadUi = fs.readFileSync("src/components/flightbooks/FlightbookUpload.tsx", "utf8");
const help = fs.readFileSync("src/lib/help/articles.ts", "utf8");
const faq = fs.readFileSync("src/app/faq/page.tsx", "utf8");
const flightbookDetail = fs.readFileSync("src/app/(app)/flightbooks/[id]/page.tsx", "utf8");
const jiti = createJiti(import.meta.url);
const { extractDocxText } = jiti("../src/lib/flightbooks/docx.ts");

test("DOCX extraction helper uses Mammoth raw text extraction and rejects empty documents", () => {
  assert.equal(fs.existsSync(helperPath), true, "DOCX extraction helper must exist");

  const helper = fs.readFileSync(helperPath, "utf8");
  assert.match(helper, /import mammoth from "mammoth"/);
  assert.match(helper, /mammoth\.extractRawText\(\{ buffer: bytes \}\)/);
  assert.match(helper, /if \(!text\) throw new Error\("No readable text was found in this DOCX file\."\)/);
  assert.match(helper, /return text;/);
});

test("DOCX extraction helper reads text from a generated Word document", async () => {
  const document = new Document({
    sections: [{ children: [new Paragraph("Operations Manual"), new Paragraph("1.1 Solo flight requirements")] }],
  });
  const bytes = await Packer.toBuffer(document);

  const text = await extractDocxText(bytes);

  assert.match(text, /Operations Manual/);
  assert.match(text, /1\.1 Solo flight requirements/);
});

test("flight book upload route parses DOCX files before storing originals", () => {
  assert.match(route, /import \{ extractDocxText \} from "@\/lib\/flightbooks\/docx";/);
  assert.match(route, /else if \(filename\.endsWith\("\.docx"\)\) \{[\s\S]*?extractDocxText\(bytes\)[\s\S]*?detectSections\(text\)/);
  assert.match(route, /Upload PDF, DOC, DOCX, TXT, MD, or JSON\./);

  const extractionIndex = route.indexOf("extractDocxText(bytes)");
  const storageIndex = route.indexOf(".upload(originalStoragePath, bytes");
  assert.ok(extractionIndex > -1 && extractionIndex < storageIndex, "DOCX extraction must finish before storage");
});

test("flight book upload guidance offers DOC and DOCX Word files", () => {
  assert.match(uploadUi, /const SUPPORTED_FILE_EXTENSIONS = \["\.pdf", "\.doc", "\.docx", "\.txt", "\.md", "\.json"\]/);
  assert.match(uploadUi, /accept=\{SUPPORTED_FILE_EXTENSIONS\.join\(","\)\}/);
  assert.match(uploadUi, /PDF · DOC · DOCX · TXT · MD · JSON/);
  assert.match(uploadUi, />DOC \/ DOCX<\/strong>/);
  assert.match(help, /DOCX/);
  assert.match(faq, /DOCX/);
  assert.match(flightbookDetail, /PDF, DOC, DOCX, TXT, or MD/);
});
