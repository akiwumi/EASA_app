-- Extended RLS for MASTER_BUILD schema (Phase 0)
-- Run after schema/003–008

-- ─── Helpers ───────────────────────────────────────────────────────────────
create or replace function public.user_is_org_admin(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from org_users ou
    where ou.organization_id = p_org
      and ou.user_id = auth.uid()
      and ou.role = 'admin'
  );
$$;

create or replace function public.user_is_org_editor_or_admin(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from org_users ou
    where ou.organization_id = p_org
      and ou.user_id = auth.uid()
      and ou.role in ('admin', 'editor')
  );
$$;

grant execute on function public.user_is_org_admin(uuid) to authenticated;
grant execute on function public.user_is_org_editor_or_admin(uuid) to authenticated;

-- ─── Flight books ──────────────────────────────────────────────────────────
create policy "flightbooks select org" on flightbooks
  for select using (
    exists (
      select 1 from org_users ou
      where ou.organization_id = flightbooks.organization_id
        and ou.user_id = auth.uid()
    )
  );

create policy "flightbooks insert admin" on flightbooks
  for insert with check (public.user_is_org_admin(organization_id));

create policy "flightbooks update admin" on flightbooks
  for update using (public.user_is_org_admin(organization_id))
  with check (public.user_is_org_admin(organization_id));

create policy "flightbooks delete admin" on flightbooks
  for delete using (public.user_is_org_admin(organization_id));

create policy "flightbook_sections select org" on flightbook_sections
  for select using (
    exists (
      select 1 from org_users ou
      where ou.organization_id = flightbook_sections.organization_id
        and ou.user_id = auth.uid()
    )
  );

create policy "flightbook_sections insert admin" on flightbook_sections
  for insert with check (public.user_is_org_admin(organization_id));

create policy "flightbook_sections update editor" on flightbook_sections
  for update using (public.user_is_org_editor_or_admin(organization_id))
  with check (public.user_is_org_editor_or_admin(organization_id));

create policy "flightbook_sections delete admin" on flightbook_sections
  for delete using (public.user_is_org_admin(organization_id));

create policy "flightbook_mappings select org" on flightbook_mappings
  for select using (
    exists (
      select 1 from org_users ou
      where ou.organization_id = flightbook_mappings.organization_id
        and ou.user_id = auth.uid()
    )
  );

create policy "flightbook_mappings write admin" on flightbook_mappings
  for all using (public.user_is_org_admin(organization_id))
  with check (public.user_is_org_admin(organization_id));

-- ─── Regulation documents & snapshots ─────────────────────────────────────
create policy "reg_documents select" on reg_documents
  for select using (
    organization_id is null
    or exists (
      select 1 from org_users ou
      where ou.organization_id = reg_documents.organization_id
        and ou.user_id = auth.uid()
    )
  );

create policy "reg_documents write admin" on reg_documents
  for all using (
    organization_id is not null
    and public.user_is_org_admin(organization_id)
  )
  with check (
    organization_id is not null
    and public.user_is_org_admin(organization_id)
  );

create policy "source_snapshots select" on source_snapshots
  for select using (
    exists (
      select 1 from sources s
      where s.id = source_snapshots.source_id
        and (
          s.organization_id is null
          or exists (
            select 1 from org_users ou
            where ou.organization_id = s.organization_id
              and ou.user_id = auth.uid()
          )
        )
    )
  );

create policy "document_sections select" on document_sections
  for select using (
    (
      organization_id is not null
      and exists (
        select 1 from org_users ou
        where ou.organization_id = document_sections.organization_id
          and ou.user_id = auth.uid()
      )
    )
    or exists (
      select 1 from source_snapshots ss
      join sources s on s.id = ss.source_id
      where ss.id = document_sections.snapshot_id
        and (
          s.organization_id is null
          or exists (
            select 1 from org_users ou
            where ou.organization_id = s.organization_id
              and ou.user_id = auth.uid()
          )
        )
    )
  );

create policy "reg_changes select org" on reg_changes
  for select using (
    exists (
      select 1 from org_users ou
      where ou.organization_id = reg_changes.organization_id
        and ou.user_id = auth.uid()
    )
  );

-- ─── Proposed updates & approvals ─────────────────────────────────────────
create policy "proposed_updates select org" on proposed_updates
  for select using (
    exists (
      select 1 from org_users ou
      where ou.organization_id = proposed_updates.organization_id
        and ou.user_id = auth.uid()
    )
  );

create policy "proposed_updates update admin" on proposed_updates
  for update using (public.user_is_org_admin(organization_id))
  with check (public.user_is_org_admin(organization_id));

create policy "approvals select org" on approvals
  for select using (
    exists (
      select 1 from org_users ou
      where ou.organization_id = approvals.organization_id
        and ou.user_id = auth.uid()
    )
  );

create policy "approvals insert admin" on approvals
  for insert with check (public.user_is_org_admin(organization_id));

-- ─── Profiles & notes ──────────────────────────────────────────────────────
create policy "user_profiles select own" on user_profiles
  for select using (id = auth.uid());

create policy "user_profiles insert own" on user_profiles
  for insert with check (id = auth.uid());

create policy "user_profiles update own" on user_profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

create policy "update_notes select org" on update_notes
  for select using (
    exists (
      select 1 from org_users ou
      where ou.organization_id = update_notes.organization_id
        and ou.user_id = auth.uid()
    )
  );

create policy "update_notes insert org" on update_notes
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from org_users ou
      where ou.organization_id = update_notes.organization_id
        and ou.user_id = auth.uid()
    )
  );

-- ─── Versions, audit, notifications, pipeline ────────────────────────────────
create policy "flightbook_section_versions select org" on flightbook_section_versions
  for select using (
    exists (
      select 1 from org_users ou
      where ou.organization_id = flightbook_section_versions.organization_id
        and ou.user_id = auth.uid()
    )
  );

create policy "audit_log select org admin" on audit_log
  for select using (
    organization_id is not null
    and public.user_is_org_admin(organization_id)
  );

create policy "notifications select own" on notifications
  for select using (user_id = auth.uid());

create policy "notifications update own" on notifications
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "pipeline_runs select org" on pipeline_runs
  for select using (
    organization_id is not null
    and exists (
      select 1 from org_users ou
      where ou.organization_id = pipeline_runs.organization_id
        and ou.user_id = auth.uid()
    )
  );

-- ─── Sources (org admin can manage org-scoped sources) ─────────────────────
create policy "sources insert org admin" on sources
  for insert with check (
    organization_id is not null
    and public.user_is_org_admin(organization_id)
  );

create policy "sources update org admin" on sources
  for update using (
    organization_id is not null
    and public.user_is_org_admin(organization_id)
  )
  with check (
    organization_id is not null
    and public.user_is_org_admin(organization_id)
  );

create policy "sources delete org admin" on sources
  for delete using (
    organization_id is not null
    and public.user_is_org_admin(organization_id)
  );
