-- Add vector embedding column to rss_items for semantic similarity search

alter table rss_items add column if not exists embedding vector(1536);

create index if not exists rss_items_embedding_idx
  on rss_items using hnsw (embedding vector_cosine_ops);

-- Similarity search RPC used by ai-analyze to surface related past items
create or replace function match_rss_items(
  query_embedding text,
  match_count int default 5,
  min_similarity float default 0.30,
  filter_organization_id uuid default null,
  exclude_id uuid default null
)
returns table (
  id uuid,
  title text,
  summary text,
  category text,
  published_at timestamptz,
  similarity float
)
language sql
stable
as $$
  select
    ri.id,
    ri.title,
    ri.summary,
    ri.category,
    ri.published_at,
    1 - (ri.embedding <=> query_embedding::vector) as similarity
  from rss_items ri
  where ri.embedding is not null
    and (filter_organization_id is null or ri.organization_id = filter_organization_id)
    and (exclude_id is null or ri.id != exclude_id)
    and 1 - (ri.embedding <=> query_embedding::vector) >= min_similarity
  order by ri.embedding <=> query_embedding::vector
  limit match_count;
$$;
