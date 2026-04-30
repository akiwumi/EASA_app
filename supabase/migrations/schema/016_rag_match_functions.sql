-- Vector search RPC functions for RAG retrieval

create or replace function match_document_sections(
  query_embedding text,
  match_count int default 5,
  min_similarity float default 0.30,
  filter_organization_id uuid default null,
  filter_part text default null,
  filter_source_id uuid default null
)
returns table (
  id uuid,
  snapshot_id uuid,
  organization_id uuid,
  section_number text,
  title text,
  body text,
  sort_order int,
  metadata jsonb,
  similarity float
)
language sql
stable
as $$
  with latest_snapshots as (
    select distinct on (ss.source_id)
      ss.id,
      ss.source_id
    from source_snapshots ss
    where ss.status = 'processed'
    order by ss.source_id, ss.scraped_at desc, ss.id desc
  )
  select
    ds.id,
    ds.snapshot_id,
    ds.organization_id,
    ds.section_number,
    ds.title,
    ds.body,
    ds.sort_order,
    ds.metadata,
    1 - (ds.embedding <=> query_embedding::vector) as similarity
  from document_sections ds
  join source_snapshots ss on ss.id = ds.snapshot_id
  join latest_snapshots ls on ls.id = ds.snapshot_id
  where ds.embedding is not null
    and (filter_organization_id is null or ds.organization_id = filter_organization_id)
    and (
      filter_part is null
      or coalesce(ds.metadata->>'part', '') = filter_part
      or coalesce(ds.metadata->>'reg_part', '') = filter_part
    )
    and (filter_source_id is null or ss.source_id = filter_source_id)
    and 1 - (ds.embedding <=> query_embedding::vector) >= min_similarity
  order by ds.embedding <=> query_embedding::vector
  limit match_count;
$$;

create or replace function match_flightbook_sections(
  query_embedding text,
  match_count int default 5,
  min_similarity float default 0.30,
  filter_organization_id uuid default null,
  filter_part text default null
)
returns table (
  id uuid,
  flightbook_id uuid,
  organization_id uuid,
  section_number text,
  title text,
  body text,
  sort_order int,
  metadata jsonb,
  flightbook_name text,
  similarity float
)
language sql
stable
as $$
  select
    fs.id,
    fs.flightbook_id,
    fs.organization_id,
    fs.section_number,
    fs.title,
    fs.body,
    fs.sort_order,
    fs.metadata,
    fb.name as flightbook_name,
    1 - (fs.embedding <=> query_embedding::vector) as similarity
  from flightbook_sections fs
  join flightbooks fb on fb.id = fs.flightbook_id
  where fs.embedding is not null
    and fb.active = true
    and (filter_organization_id is null or fs.organization_id = filter_organization_id)
    and (
      filter_part is null
      or coalesce(fs.metadata->>'part', '') = filter_part
      or exists (
        select 1
        from flightbook_mappings fm
        where fm.flightbook_section_id = fs.id
          and fm.easa_section_ref ilike '%' || filter_part || '%'
      )
    )
    and 1 - (fs.embedding <=> query_embedding::vector) >= min_similarity
  order by fs.embedding <=> query_embedding::vector
  limit match_count;
$$;
