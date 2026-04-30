# RAG Implementation Plan

## Goal

Add a retrieval-augmented generation pipeline to this app so regulatory updates are matched against the school's flightbooks using grounded source evidence instead of title matching and summary-only prompting.

The primary outcome is not a chatbot. It is a compliant update workflow that can:

- retrieve the exact EASA passages relevant to a detected change
- retrieve the most likely impacted flightbook sections
- generate a proposed revision with traceable evidence
- keep the reviewer in control before anything is applied

## Current State

The repo already contains strong building blocks for RAG:

- `source_snapshots` stores fetched source material
- `document_sections` stores chunked regulation text
- `flightbook_sections` already has an `embedding vector(1536)` column
- `reg_changes`, `ai_findings`, and `proposed_updates` already model the review workflow
- `src/app/api/findings/generate-update/route.ts` currently generates updates from a best-match section using `ILIKE` instead of semantic retrieval
- `supabase/functions/ai-analyze/index.ts` currently classifies RSS items with limited flightbook context, not retrieved regulation context

This means the app is close to a usable RAG system already. The missing pieces are embeddings for the regulation corpus, vector search functions, retrieval orchestration, and evidence storage.

## Recommended Architecture

Use a two-corpus RAG flow:

1. Regulatory corpus
   Store chunked EASA text in `document_sections` with embeddings and metadata.

2. Internal corpus
   Store chunked flightbook content in `flightbook_sections` with embeddings and metadata.

3. Retrieval layer
   For each detected regulatory change, retrieve:
   - the most relevant regulation chunks
   - the most relevant flightbook sections

4. Generation layer
   Ask the model to propose an update using only the retrieved evidence.

5. Review layer
   Show the proposal, cited source passages, and matched flightbook sections before approval.

## Phase 1: Data Model Changes

### 1. Add embeddings to regulation chunks

`flightbook_sections` already has embeddings. `document_sections` should match that pattern.

Add to schema:

- `embedding vector(1536)` on `document_sections`
- optional `token_count int`
- optional `chunk_hash text`
- optional `metadata jsonb`

Suggested metadata fields:

- `reg_document_id`
- `source_id`
- `source_snapshot_id`
- `part`
- `section_number`
- `title`
- `effective_date`
- `url`
- `organization_id`

### 2. Add provenance fields to generated updates

`proposed_updates` should retain the retrieval evidence used to create the draft.

Add fields such as:

- `retrieval_context jsonb`
- `generation_prompt_version text`
- `source_citations jsonb`
- `retrieved_at timestamptz`

`source_citations` can store a compact structure like:

```json
[
  {
    "kind": "regulation_chunk",
    "id": "uuid",
    "score": 0.91,
    "quote": "short excerpt"
  },
  {
    "kind": "flightbook_section",
    "id": "uuid",
    "score": 0.88,
    "section_number": "3.4.2"
  }
]
```

### 3. Add explicit chunk linkage if needed

If the UI later needs richer drill-down behavior, add join tables:

- `proposed_update_reg_chunks`
- `proposed_update_flightbook_chunks`

These are optional for the first implementation. A JSON citation payload is enough to ship the first usable version.

## Phase 2: Ingestion and Chunking

### 1. Expand the ingestion pipeline

The current RSS ingestion is useful for discovery, but RAG quality depends on full-text source material.

Extend ingestion so each relevant EASA item can produce:

- a `source_snapshots` row with raw content
- extracted normalized text
- chunked `document_sections` rows

Recommended flow:

1. RSS item is ingested.
2. For each linked EASA page or document, fetch HTML or PDF.
3. Normalize text:
   - strip nav/chrome for HTML
   - extract text for PDF
   - preserve headings and section references when possible
4. Chunk text into sections of roughly 300 to 800 tokens with overlap.
5. Store chunks in `document_sections`.
6. Generate embeddings asynchronously.

### 2. Reuse section-aware chunking

Avoid blind fixed-length chunks when possible.

Preferred order:

1. chunk by detected section heading
2. if a section is too large, sub-chunk it with overlap
3. retain section label and ordinal position

This matters because the app's core job is mapping rules to controlled manual sections, not casual Q&A.

### 3. Chunk flightbooks consistently

Ensure uploaded flightbooks are chunked in a compatible way:

- one row per meaningful section when possible
- preserve `section_number`, `title`, `sort_order`, and parent-child relationships
- embed the text after normalization, not the raw file content

## Phase 3: Embedding Pipeline

### 1. Create a shared embedding service

Add a reusable server-side utility for embedding text for both corpora.

Suggested location:

- `src/lib/ai/embeddings.ts`

Responsibilities:

- provider abstraction
- batching
- retries
- model/dimension validation
- normalized input preparation

### 2. Backfill existing rows

Create a script to embed existing:

- `flightbook_sections` without embeddings
- `document_sections` without embeddings

Suggested location:

- `scripts/backfill-embeddings.mjs`

### 3. Keep embeddings async

Do not block ingestion or uploads on large embedding runs. Use one of these approaches:

- Supabase Edge Function invoked after insert
- queue table with a worker
- cron-based reconciliation job

For this repo, a pragmatic first version is:

- insert content first
- mark it as pending embedding
- run an async embedding pass immediately after successful ingestion/upload

## Phase 4: Retrieval Layer

### 1. Add Supabase RPC for vector search

Implement SQL functions for nearest-neighbor search.

Suggested RPCs:

- `match_document_sections`
- `match_flightbook_sections`

Each function should support:

- query embedding
- `organization_id`
- optional `part` filter
- optional `source_id`
- limit
- minimum similarity threshold

### 2. Prefer hybrid retrieval

Use vector similarity plus lightweight structured filtering.

Recommended retrieval recipe:

1. Detect likely regulation family from the finding or document metadata.
2. Generate query text from:
   - RSS title
   - RSS summary
   - finding summary
   - mapped section text
   - regulation part
3. Embed the query text.
4. Retrieve regulation chunks from `document_sections`.
5. Retrieve internal chunks from `flightbook_sections`.
6. Optionally boost rows where:
   - `part` matches
   - `section_number` resembles the extracted reference
   - a manual mapping exists in `flightbook_mappings`

### 3. Retrieval output contract

Return structured records, not just raw text.

Suggested shape:

```ts
type RetrievedChunk = {
  id: string;
  kind: "regulation" | "flightbook";
  score: number;
  title: string | null;
  sectionNumber: string | null;
  body: string;
  metadata: Record<string, unknown>;
};
```

## Phase 5: Generation Flow Changes

### 1. Upgrade `ai-analyze`

Current role:

- classify RSS items
- choose a mapped section from a list of section titles

Recommended new role:

- classify impact
- extract candidate regulation family
- optionally extract candidate section references
- create a retrieval query seed

Do not ask this stage to draft final manual text yet.

### 2. Replace matching logic in `generate-update`

Current route:

- reads `mapped_section`
- does title `ILIKE`
- falls back to the first active section
- prompts the model with one section body

Target behavior:

1. load the finding and linked change context
2. retrieve top regulation chunks
3. retrieve top flightbook sections
4. assemble grounded prompt
5. generate:
   - revised text
   - rationale
   - citations
   - confidence
6. persist all of that on `proposed_updates`

### 3. Prompt structure

Suggested prompt inputs:

- regulatory update title and summary
- retrieved regulation passages
- retrieved current flightbook passages
- instruction to preserve style and section numbering
- instruction to avoid fabricating requirements
- instruction to cite evidence by chunk ID

Suggested outputs:

- `suggestedText`
- `changeSummary`
- `whyThisSection`
- `citations`
- `confidence`

Use structured JSON output first, then unpack it into DB fields.

## Phase 6: UI and Review Experience

### 1. Show retrieval evidence in the review panel

In `src/components/results/ReviewPanel.tsx` and related results pages, add:

- matched regulation excerpts
- matched flightbook sections
- similarity/confidence indicators
- linkable source metadata

The reviewer should be able to answer:

- What rule change triggered this?
- Why did the system choose this section?
- What exact evidence supports the wording change?

### 2. Show uncertainty clearly

If retrieval is weak, the UI should say so.

Examples:

- "Low evidence match"
- "No strong regulation passage found"
- "Draft generated from summary only"

This is important for trust.

### 3. Keep human approval mandatory

The current approval flow is well aligned with RAG. Keep final writes gated behind reviewer approval and continue storing version history before applying changes.

## Phase 7: Observability and Quality

### 1. Track retrieval metrics

Add logging or DB fields for:

- query text used
- embedding model
- top-k scores
- retrieved chunk IDs
- generation latency
- prompt version

### 2. Create an evaluation set

Build a small internal benchmark using known examples:

- regulation update
- correct impacted flightbook section
- acceptable draft revision

Use it to compare:

- current title-match flow
- vector-only retrieval
- hybrid retrieval

### 3. Measure the right outcomes

Success metrics should focus on workflow quality:

- correct section retrieval rate
- reviewer acceptance rate
- number of manual edits after AI draft
- false positive update rate
- time to reviewer decision

## Concrete Repo Changes

### Schema and SQL

Add new migrations for:

- `document_sections.embedding`
- `document_sections.metadata`
- `proposed_updates.retrieval_context`
- `proposed_updates.source_citations`
- vector search RPC functions

Suggested files:

- `supabase/migrations/schema/014_document_section_embeddings.sql`
- `supabase/migrations/schema/015_proposed_update_rag_fields.sql`
- `supabase/sql/functions/match_document_sections.sql`
- `supabase/sql/functions/match_flightbook_sections.sql`

### Backend

Add or modify:

- `src/lib/ai/embeddings.ts`
- `src/lib/ai/retrieval.ts`
- `src/lib/ai/rag-prompt.ts`
- `src/app/api/findings/generate-update/route.ts`
- `supabase/functions/ai-analyze/index.ts`
- `src/app/api/pipeline/aggregate-reg-changes/route.ts`

### Scripts

Add:

- `scripts/backfill-embeddings.mjs`
- `scripts/reindex-regulations.mjs`

### UI

Update:

- `src/components/results/ReviewPanel.tsx`
- `src/app/(app)/results/[id]/page.tsx`
- optionally `src/components/updates/DiffViewer.tsx`

## Suggested Implementation Order

### Milestone 1: Semantic flightbook matching

Ship first:

- backfill `flightbook_sections.embedding`
- add `match_flightbook_sections` RPC
- replace `ILIKE` section matching in `generate-update`

This is the smallest change with immediate product value.

### Milestone 2: Regulation corpus retrieval

Then add:

- embeddings on `document_sections`
- ingestion/chunking for EASA full text
- `match_document_sections` RPC
- retrieval-aware generation prompt

This is where the app becomes true RAG.

### Milestone 3: Evidence-first review UX

Then add:

- stored citations
- evidence cards in the review UI
- confidence and uncertainty display

### Milestone 4: Evaluation and tuning

Finally:

- benchmark set
- retrieval thresholds
- hybrid ranking
- prompt tuning by acceptance outcomes

## First Version Scope Recommendation

To keep the project moving, the first implementation should avoid overbuilding.

Recommended first release:

- use one embedding provider and one embedding dimension
- retrieve top 5 flightbook sections
- retrieve top 5 regulation chunks
- generate one structured proposal
- store evidence as JSON on `proposed_updates`
- show citations in the existing review panel

That is enough to prove the architecture before adding rerankers, chunk-link tables, or multi-stage agents.

## Risks and Mitigations

### Risk: poor source text extraction

Mitigation:

- preserve original raw snapshots
- log extraction failures
- start with HTML sources that parse reliably

### Risk: weak retrieval from short RSS summaries

Mitigation:

- prioritize full document text when available
- augment query text with part/category metadata
- use manual mappings as retrieval boosts

### Risk: low reviewer trust

Mitigation:

- always show evidence
- show low-confidence states explicitly
- never auto-apply changes

### Risk: embedding drift or provider lock-in

Mitigation:

- centralize embedding generation
- store provider and model metadata
- version prompt and embedding strategy

## What To Build First In This Repo

If implementation starts now, the first concrete changes should be:

1. Add a migration for `document_sections.embedding` and RAG metadata fields.
2. Create SQL RPC search functions for `flightbook_sections` and `document_sections`.
3. Build `src/lib/ai/embeddings.ts` and `src/lib/ai/retrieval.ts`.
4. Update `src/app/api/findings/generate-update/route.ts` to use retrieval instead of title matching.
5. Add citation display to the review UI.

That sequence fits the current architecture and improves the weakest part of the existing pipeline without requiring a full rewrite.
