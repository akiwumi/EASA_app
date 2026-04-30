-- RAG provenance fields for generated proposals

alter table if exists proposed_updates
  add column if not exists retrieval_context jsonb,
  add column if not exists generation_prompt_version text,
  add column if not exists source_citations jsonb,
  add column if not exists retrieved_at timestamptz;

create index if not exists proposed_updates_retrieved_at_idx
  on proposed_updates (retrieved_at desc);

create index if not exists proposed_updates_source_citations_gin_idx
  on proposed_updates using gin (source_citations);
