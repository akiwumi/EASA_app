create policy "flightbook_exports select org" on flightbook_exports
  for select using (
    exists (
      select 1 from org_users ou
      where ou.organization_id = flightbook_exports.organization_id
        and ou.user_id = auth.uid()
    )
  );

create policy "flightbook_exports insert admin" on flightbook_exports
  for insert with check (public.user_is_org_admin(organization_id));

create policy "flightbook_exports update admin" on flightbook_exports
  for update using (public.user_is_org_admin(organization_id))
  with check (public.user_is_org_admin(organization_id));

create policy "flightbook_exports delete admin" on flightbook_exports
  for delete using (public.user_is_org_admin(organization_id));
