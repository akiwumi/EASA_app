# DOCX Flight Book Ingestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `.docx` flight book uploads that preserve Word originals, extract text, and reuse the existing section indexing flow.

**Architecture:** Install Mammoth as a Node server dependency and add a focused DOCX extraction helper. Call it from the existing flight-book upload route before storage writes, then pass extracted text into the existing section detector. Update upload guidance and public help content without adding legacy `.doc` support.

**Tech Stack:** Next.js App Router, TypeScript, Node.js, Mammoth, Node test runner

---

### Task 1: Add DOCX Extraction Helper

**Files:**
- Create: `src/lib/flightbooks/docx.ts`
- Create: `tests/docx-flightbook-ingestion.test.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install Mammoth**

Run:

```bash
npm install mammoth
```

Expected: `mammoth` appears in `dependencies` and the lockfile updates.

- [ ] **Step 2: Write failing helper regression**

Create `tests/docx-flightbook-ingestion.test.mjs` with a source-level assertion that `src/lib/flightbooks/docx.ts` imports Mammoth, calls `extractRawText`, rejects empty extraction, and returns extracted text.

- [ ] **Step 3: Run focused test and confirm RED**

Run:

```bash
node --test tests/docx-flightbook-ingestion.test.mjs
```

Expected: FAIL because `src/lib/flightbooks/docx.ts` does not exist.

- [ ] **Step 4: Add focused helper**

Create `src/lib/flightbooks/docx.ts`:

```ts
import mammoth from "mammoth";

export async function extractDocxText(bytes: Buffer): Promise<string> {
  try {
    const { value } = await mammoth.extractRawText({ buffer: bytes });
    const text = value.trim();
    if (!text) throw new Error("No readable text was found in this DOCX file.");
    return text;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown DOCX parsing error";
    throw new Error(`DOCX parsing failed: ${message}`);
  }
}
```

- [ ] **Step 5: Run focused test and confirm GREEN**

Run:

```bash
node --test tests/docx-flightbook-ingestion.test.mjs
```

Expected: PASS.

### Task 2: Wire DOCX Into Upload API

**Files:**
- Modify: `src/app/api/flightbooks/upload/route.ts`
- Modify: `tests/docx-flightbook-ingestion.test.mjs`

- [ ] **Step 1: Add failing upload route regressions**

Extend the test to assert:

```js
assert.match(route, /filename\.endsWith\("\\.docx"\)/);
assert.match(route, /extractDocxText\(bytes\)/);
assert.match(route, /Upload PDF, DOCX, TXT, MD, or JSON/);
```

- [ ] **Step 2: Run focused test and confirm RED**

Run:

```bash
node --test tests/docx-flightbook-ingestion.test.mjs
```

Expected: FAIL because upload route has no DOCX branch.

- [ ] **Step 3: Add route branch**

Import:

```ts
import { extractDocxText } from "@/lib/flightbooks/docx";
```

Before the PDF branch, add:

```ts
else if (filename.endsWith(".docx")) {
  const text = await extractDocxText(bytes);
  const sections = detectSections(text);
  documents = [{ docName: docName ?? file.name.replace(/\.docx$/i, ""), docType, versionLabel, sections }];
}
```

Update unsupported response:

```ts
return NextResponse.json({ error: "Unsupported file type. Upload PDF, DOCX, TXT, MD, or JSON." }, { status: 400 });
```

- [ ] **Step 4: Run focused test and confirm GREEN**

Run:

```bash
node --test tests/docx-flightbook-ingestion.test.mjs
```

Expected: PASS.

### Task 3: Update Upload UI and Help Copy

**Files:**
- Modify: `src/components/flightbooks/FlightbookUpload.tsx`
- Modify: `src/lib/help/articles.ts`
- Modify: `src/app/faq/page.tsx`
- Modify: `src/app/(app)/flightbooks/[id]/page.tsx`
- Modify: `tests/docx-flightbook-ingestion.test.mjs`

- [ ] **Step 1: Add failing UI and documentation regressions**

Extend the test to assert:

```js
assert.match(uploadUi, /accept="\.pdf,\.docx,\.txt,\.md,\.json"/);
assert.doesNotMatch(uploadUi, /\.doc,/);
assert.match(uploadUi, /PDF · DOCX · TXT · MD · JSON/);
assert.match(uploadUi, />DOCX<\/strong>/);
assert.match(help, /DOCX/);
assert.match(faq, /DOCX/);
```

- [ ] **Step 2: Run focused test and confirm RED**

Run:

```bash
node --test tests/docx-flightbook-ingestion.test.mjs
```

Expected: FAIL because UI and help text do not list DOCX.

- [ ] **Step 3: Update product copy**

Update upload picker `accept`, supported format summary, DOCX explanation, help article format list, Word guidance, FAQ format list, and flight-book empty state copy to include DOCX. Do not add `.doc`.

- [ ] **Step 4: Run focused test and confirm GREEN**

Run:

```bash
node --test tests/docx-flightbook-ingestion.test.mjs
```

Expected: PASS.

### Task 4: Verify Feature

**Files:**
- Verify all modified files

- [ ] **Step 1: Run unit suite**

```bash
npm run test:unit
```

Expected: all tests pass.

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Run lint**

```bash
npm run lint -- --quiet
```

Expected: only the existing unrelated `src/components/home/FeaturesSection.tsx:59` lint issue may remain.

- [ ] **Step 4: Check diff**

```bash
git diff --check
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/flightbooks/docx.ts src/app/api/flightbooks/upload/route.ts src/components/flightbooks/FlightbookUpload.tsx src/lib/help/articles.ts src/app/faq/page.tsx 'src/app/(app)/flightbooks/[id]/page.tsx' tests/docx-flightbook-ingestion.test.mjs docs/superpowers/plans/2026-06-02-docx-flightbook-ingestion.md
git commit -m "feat: add DOCX flight book ingestion"
```
