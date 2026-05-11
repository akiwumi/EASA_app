create or replace function match_flightbook_sections(
  query_embedding text,
  match_count int default 5,
  min_similarity float default 0.30,
  filter_organization_id uuid default null,
  filter_part text default null,
  filter_flightbook_id uuid default null
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
    and (filter_flightbook_id is null or fs.flightbook_id = filter_flightbook_id)
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
$$;;
