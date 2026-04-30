-- Track stored source-file artifacts for regulation snapshots.

alter table if exists source_snapshots
  add column if not exists storage_bucket text,
  add column if not exists storage_mime_type text,
  add column if not exists storage_bytes bigint,
  add column if not exists original_url text;

create index if not exists source_snapshots_source_scraped_idx
  on source_snapshots (source_id, scraped_at desc);
