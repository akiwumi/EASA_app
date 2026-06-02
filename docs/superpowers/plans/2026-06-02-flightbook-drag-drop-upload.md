# Flight Book Drag-and-Drop Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an accessible drag-and-drop zone to the existing Flight Books upload form.

**Architecture:** Keep server ingestion unchanged. Refactor client-side file selection into one `selectFile` helper shared by native picker changes and drop events. Add drag state for visual feedback and reject invalid drops before upload.

**Tech Stack:** Next.js, React, TypeScript, Node test runner

---

### Task 1: Add Drop-Zone Regression

**Files:**
- Create: `tests/flightbook-drag-drop-upload.test.mjs`
- Modify: `src/components/flightbooks/FlightbookUpload.tsx`

- [ ] Add failing source assertions for supported extensions, shared `selectFile`, drag handlers, drop errors, hidden input, `role="button"`, `tabIndex={0}`, and keyboard browse behavior.
- [ ] Run `node --test tests/flightbook-drag-drop-upload.test.mjs` and confirm RED.
- [ ] Add `SUPPORTED_FILE_EXTENSIONS`, `isSupportedFile`, `selectFile`, drag state, and event handlers.
- [ ] Replace plain input presentation with the accessible drop zone while keeping the hidden native input.
- [ ] Run focused test and confirm GREEN.

### Task 2: Verify and Merge

- [ ] Run `npm run test:unit`.
- [ ] Run `npm run build`.
- [ ] Run `npm run lint -- --quiet`; only the existing `src/components/home/FeaturesSection.tsx:59` issue may remain.
- [ ] Run `git diff --check`.
- [ ] Commit feature branch and merge into `main`.
