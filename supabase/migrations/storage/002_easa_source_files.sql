-- Dedicated storage for raw EASA regulation source files.
-- This bucket is intentionally scoped to upstream source artifacts only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'easa-source-files',
  'easa-source-files',
  false,
  104857600,
  array[
    'text/html',
    'application/xhtml+xml',
    'application/pdf',
    'text/plain',
    'application/xml',
    'text/xml'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "easa source files read org"
on storage.objects for select
using (
  bucket_id = 'easa-source-files'
  and exists (
    select 1 from org_users ou
    where ou.user_id = auth.uid()
      and name like (ou.organization_id::text || '/%')
  )
);

create policy "easa source files write admin"
on storage.objects for insert
with check (
  bucket_id = 'easa-source-files'
  and exists (
    select 1 from org_users ou
    where ou.user_id = auth.uid()
      and ou.role = 'admin'
      and name like (ou.organization_id::text || '/%')
  )
);
