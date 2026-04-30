-- RAG schema additions: embeddings and retrieval metadata

create extension if not exists vector;

alter table if exists document_sections
  add column if not exists embedding vector(1536),
  add column if not exists token_count int,
  add column if not exists chunk_hash text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table if exists flightbook_sections
  add column if not exists token_count int,
  add column if not exists chunk_hash text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists document_sections_snapshot_sort_idx
  on document_sections (snapshot_id, sort_order);

create index if not exists document_sections_org_sort_idx
  on document_sections (organization_id, sort_order);

create index if not exists document_sections_chunk_hash_idx
  on document_sections (chunk_hash);

create index if not exists flightbook_sections_chunk_hash_idx
  on flightbook_sections (chunk_hash);

create index if not exists document_sections_metadata_gin_idx
  on document_sections using gin (metadata);

create index if not exists flightbook_sections_metadata_gin_idx
  on flightbook_sections using gin (metadata);

create index if not exists document_sections_embedding_cosine_idx
  on document_sections using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists flightbook_sections_embedding_cosine_idx
  on flightbook_sections using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
