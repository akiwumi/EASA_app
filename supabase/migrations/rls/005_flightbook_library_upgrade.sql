-- RLS for flightbook library metadata and comments (Phase 5)

drop policy if exists "flightbook_section_comments select org" on flightbook_section_comments;
create policy "flightbook_section_comments select org" on flightbook_section_comments
  for select using (
    exists (
      select 1 from org_users ou
      where ou.organization_id = flightbook_section_comments.organization_id
        and ou.user_id = auth.uid()
    )
  );

drop policy if exists "flightbook_section_comments insert org" on flightbook_section_comments;
create policy "flightbook_section_comments insert org" on flightbook_section_comments
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from org_users ou
      where ou.organization_id = flightbook_section_comments.organization_id
        and ou.user_id = auth.uid()
    )
  );

drop policy if exists "flightbook_section_comments update author or admin" on flightbook_section_comments;
create policy "flightbook_section_comments update author or admin" on flightbook_section_comments
  for update using (
    author_id = auth.uid()
    or public.user_is_org_admin(organization_id)
  )
  with check (
    author_id = auth.uid()
    or public.user_is_org_admin(organization_id)
  );

drop policy if exists "flightbook_section_comments delete author or admin" on flightbook_section_comments;
create policy "flightbook_section_comments delete author or admin" on flightbook_section_comments
  for delete using (
    author_id = auth.uid()
    or public.user_is_org_admin(organization_id)
  );
