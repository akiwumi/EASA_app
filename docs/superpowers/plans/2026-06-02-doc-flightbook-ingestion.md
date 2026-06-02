# Legacy DOC Flight Book Ingestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add legacy `.doc` flight book uploads that preserve Word originals, extract text, and reuse the existing section indexing flow.

**Architecture:** Install the pure Node `word-extractor` dependency and add a focused DOC extraction helper. Call it from the existing flight-book upload route before storage writes, then pass extracted text into the existing section detector. Update upload guidance without adding LibreOffice or external services.

**Tech Stack:** Next.js App Router, TypeScript, Node.js, word-extractor, Node test runner

---

### Task 1: Add Legacy DOC Extraction Helper

**Files:**
- Create: `src/lib/flightbooks/doc.ts`
- Create: `tests/doc-flightbook-ingestion.test.mjs`
- Create: `tests/fixtures/legacy-word-sample.doc`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] Install `word-extractor` with `npm install word-extractor`.
- [ ] Add a failing test that imports `extractDocText`, parses `tests/fixtures/legacy-word-sample.doc`, and expects readable fixture text.
- [ ] Run `node --test tests/doc-flightbook-ingestion.test.mjs` and confirm RED.
- [ ] Add `extractDocText(bytes)` using `new WordExtractor().extract(bytes)`, `document.getBody()`, trimming, and a DOC-specific error wrapper.
- [ ] Run `node --test tests/doc-flightbook-ingestion.test.mjs` and confirm GREEN.

### Task 2: Wire DOC Into Upload API

**Files:**
- Modify: `src/app/api/flightbooks/upload/route.ts`
- Modify: `tests/doc-flightbook-ingestion.test.mjs`

- [ ] Add failing source regression assertions for a `.doc` route branch, `extractDocText(bytes)`, ordering before `.upload(originalStoragePath, bytes`, and supported-format guidance.
- [ ] Run focused test and confirm RED.
- [ ] Import `extractDocText`, add the `.doc` route branch before `.docx`, and update unsupported-format guidance.
- [ ] Run focused test and confirm GREEN.

### Task 3: Update Upload UI and Help Copy

**Files:**
- Modify: `src/components/flightbooks/FlightbookUpload.tsx`
- Modify: `src/lib/help/articles.ts`
- Modify: `src/app/faq/page.tsx`
- Modify: `src/app/(app)/flightbooks/[id]/page.tsx`
- Modify: `tests/doc-flightbook-ingestion.test.mjs`

- [ ] Add failing assertions for `.doc` picker acceptance and DOC guidance.
- [ ] Run focused test and confirm RED.
- [ ] Update picker, format summaries, help content, FAQ, and empty-state guidance.
- [ ] Run focused test and confirm GREEN.

### Task 4: Verify, Merge, and Push

- [ ] Run `npm run test:unit`.
- [ ] Run `npm run build`.
- [ ] Run `npm run lint -- --quiet`; only the existing `src/components/home/FeaturesSection.tsx:59` issue may remain.
- [ ] Run `git diff --check`.
- [ ] Commit feature branch, merge into `main`, rerun merged verification, and push `origin main`.
