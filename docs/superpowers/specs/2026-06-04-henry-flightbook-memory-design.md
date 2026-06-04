# Henry Flight Book Memory Design

## Goal

Henry should learn from uploaded flight books, store reusable analysis, answer user questions faster, and explain which sections likely need attention when regulations or findings change. The first release is read-only advisory. Henry can recommend and explain. Henry cannot approve, apply, or automatically create update queue items.

## Current Context

The app already stores flight books and sections, embeds section text, retrieves relevant manual chunks, generates draft previews, and routes Henry coworker questions through approved read-only tools. Uploaded sections use `flightbook_sections` with `chunk_hash`, metadata, and embeddings. Henry currently answers manual questions through search/RAG but does not persist prior section analysis, stale state, or update hints.

## Architecture

Add a memory layer between flight book ingestion and Henry retrieval.

The memory layer has three responsibilities:

1. Persist concise analysis records derived from flight book sections.
2. Mark memories stale when the source section hash or flight book version changes.
3. Retrieve relevant memories for Henry alongside existing flight book search.

The core unit is an `ai_memories` record. A record belongs to one organization and can point to a flight book, section, analysis run, and source hash. Its payload stores a short summary, key obligations, update triggers, risk tags, confidence, and citations. The record is not an action item.

## Data Model

Add `ai_memory_runs`:

- `id`
- `organization_id`
- `flightbook_id`
- `status`: `queued`, `running`, `completed`, `failed`
- `scope`: `flightbook_upload`, `manual_reanalysis`, `section_refresh`
- `started_at`, `completed_at`
- `error_message`
- `stats` jsonb

Add `ai_memories`:

- `id`
- `organization_id`
- `flightbook_id`
- `flightbook_section_id`
- `memory_run_id`
- `source_chunk_hash`
- `memory_type`: `section_summary`, `obligation`, `update_hint`, `risk_note`, `training_link`
- `title`
- `content`
- `tags` text array
- `confidence` numeric
- `metadata` jsonb
- `stale_at`
- `created_at`, `updated_at`

Add indexes for organization, flight book, section, memory type, tags, and active non-stale memories.

## Memory Generation

Memory generation runs after upload/import and can also be manually triggered for a flight book.

For each section batch:

1. Load active sections for the organization and flight book.
2. Skip sections whose `chunk_hash` already has active memories.
3. Mark previous section memories stale if the hash changed.
4. Generate compact advisory analysis:
   - what the section covers
   - operational or training obligations
   - terms/regulation families likely tied to the section
   - conditions that may require future updates
   - confidence and citations
5. Insert memories in one write batch.

If the AI provider is unavailable, the app keeps the upload usable and records the run as failed or partially completed. Existing flight book access must not be blocked by memory generation.

## Henry Retrieval

Henry manual-question flow retrieves both:

- current flight book sections through existing search/RAG
- active memories matching the question, organization, and optional flight book/section context

Henry uses memories to answer:

- "What does this flight book say about X?"
- "Which sections likely need updating?"
- "Why is this finding relevant?"
- "What obligations are stored for this topic?"
- "Which training material references this requirement?"

Answers must cite underlying flight book sections. Memory citations are supporting analysis, not source-of-truth replacements.

## Human Approval Boundary

Henry may:

- summarize learned flight book knowledge
- rank likely affected sections
- explain why a section may need review
- prepare draft language through the existing preview-only path

Henry may not:

- approve updates
- apply updates
- create proposed update queue items automatically
- mutate flight book text
- bypass existing organization access checks

This boundary should be enforced in tests by confirming Henry memory tools do not import queue mutation helpers.

## UI And API

Backend first:

- `src/lib/ai/memory.ts`: memory run creation, stale detection, retrieval.
- `src/app/api/flightbooks/[id]/memory/route.ts`: trigger/retrieve memory status.
- `src/lib/coworker/tools.ts`: include memory retrieval in manual questions.

Flight Books UI can later show status:

- learned
- analyzing
- stale
- failed

The status derives from `ai_memory_runs` and stale active-section hashes.

## Error Handling

Memory generation is best-effort. Failures should be visible but should not break upload, flight book browsing, search, or Henry chat. Missing schema should return graceful "memory unavailable" behavior during rollout.

## Testing

Add focused regression tests:

- migration creates memory tables and active indexes
- stale detection marks old memories when section hash changes
- Henry retrieval includes active memories
- Henry retrieval excludes stale memories
- Henry memory code cannot reach proposed update mutation helpers
- upload path remains usable when memory generation fails

## Rollout

Phase 1 implements schema, service helpers, Henry retrieval, and tests.

Phase 2 adds automatic post-upload memory generation.

Phase 3 adds Flight Books UI memory status and manual re-analysis controls.

Phase 4 may allow Henry to create draft review suggestions only after an explicit user action and human confirmation.
