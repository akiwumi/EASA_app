-- Storage buckets for snapshots, uploaded flight books, exports (MASTER_BUILD §7)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('snapshots', 'snapshots', false, 52428800, null),
  ('flightbooks', 'flightbooks', false, 104857600, null),
  ('exports', 'exports', false, 52428800, null)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit;

-- Path convention: {organization_id}/... for org-owned objects

create policy "snapshots read org"
on storage.objects for select
using (
  bucket_id = 'snapshots'
  and exists (
    select 1 from org_users ou
    where ou.user_id = auth.uid()
      and name like (ou.organization_id::text || '/%')
  )
);

create policy "snapshots write admin"
on storage.objects for insert
with check (
  bucket_id = 'snapshots'
  and exists (
    select 1 from org_users ou
    where ou.user_id = auth.uid()
      and ou.role = 'admin'
      and name like (ou.organization_id::text || '/%')
  )
);

create policy "flightbooks read org"
on storage.objects for select
using (
  bucket_id = 'flightbooks'
  and exists (
    select 1 from org_users ou
    where ou.user_id = auth.uid()
      and name like (ou.organization_id::text || '/%')
  )
);

create policy "flightbooks write admin"
on storage.objects for insert
with check (
  bucket_id = 'flightbooks'
  and exists (
    select 1 from org_users ou
    where ou.user_id = auth.uid()
      and ou.role = 'admin'
      and name like (ou.organization_id::text || '/%')
  )
);

create policy "exports read org"
on storage.objects for select
using (
  bucket_id = 'exports'
  and exists (
    select 1 from org_users ou
    where ou.user_id = auth.uid()
      and name like (ou.organization_id::text || '/%')
  )
);

create policy "exports write service-like admin"
on storage.objects for insert
with check (
  bucket_id = 'exports'
  and exists (
    select 1 from org_users ou
    where ou.user_id = auth.uid()
      and ou.role = 'admin'
      and name like (ou.organization_id::text || '/%')
  )
);
