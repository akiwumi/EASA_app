-- RLS for flight-school training and operations schema (Phase 3)

drop policy if exists "organization_branding read own" on organization_branding;
create policy "organization_branding read own" on organization_branding
  for select
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = organization_branding.organization_id
        and org_users.user_id = auth.uid()
    )
  );

drop policy if exists "organization_branding manage by admin" on organization_branding;
create policy "organization_branding manage by admin" on organization_branding
  for all
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = organization_branding.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'compliance_manager')
    )
  )
  with check (
    exists (
      select 1 from org_users
      where org_users.organization_id = organization_branding.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'compliance_manager')
    )
  );

drop policy if exists "onboarding_checklists read own" on onboarding_checklists;
create policy "onboarding_checklists read own" on onboarding_checklists
  for select
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = onboarding_checklists.organization_id
        and org_users.user_id = auth.uid()
    )
  );

drop policy if exists "onboarding_checklists manage by admin" on onboarding_checklists;
create policy "onboarding_checklists manage by admin" on onboarding_checklists
  for all
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = onboarding_checklists.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'compliance_manager')
    )
  )
  with check (
    exists (
      select 1 from org_users
      where org_users.organization_id = onboarding_checklists.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'compliance_manager')
    )
  );

drop policy if exists "training_programmes read own" on training_programmes;
create policy "training_programmes read own" on training_programmes
  for select
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = training_programmes.organization_id
        and org_users.user_id = auth.uid()
    )
  );

drop policy if exists "training_programmes manage by staff" on training_programmes;
create policy "training_programmes manage by staff" on training_programmes
  for all
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = training_programmes.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  )
  with check (
    exists (
      select 1 from org_users
      where org_users.organization_id = training_programmes.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  );

drop policy if exists "training_phases read own" on training_phases;
create policy "training_phases read own" on training_phases
  for select
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = training_phases.organization_id
        and org_users.user_id = auth.uid()
    )
  );

drop policy if exists "training_phases manage by staff" on training_phases;
create policy "training_phases manage by staff" on training_phases
  for all
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = training_phases.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  )
  with check (
    exists (
      select 1 from org_users
      where org_users.organization_id = training_phases.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  );

drop policy if exists "training_lessons read own" on training_lessons;
create policy "training_lessons read own" on training_lessons
  for select
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = training_lessons.organization_id
        and org_users.user_id = auth.uid()
    )
  );

drop policy if exists "training_lessons manage by staff" on training_lessons;
create policy "training_lessons manage by staff" on training_lessons
  for all
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = training_lessons.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  )
  with check (
    exists (
      select 1 from org_users
      where org_users.organization_id = training_lessons.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  );

drop policy if exists "lesson_documents read own" on lesson_documents;
create policy "lesson_documents read own" on lesson_documents
  for select
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = lesson_documents.organization_id
        and org_users.user_id = auth.uid()
    )
  );

drop policy if exists "lesson_documents manage by staff" on lesson_documents;
create policy "lesson_documents manage by staff" on lesson_documents
  for all
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = lesson_documents.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  )
  with check (
    exists (
      select 1 from org_users
      where org_users.organization_id = lesson_documents.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  );

drop policy if exists "document_assignments read own" on document_assignments;
create policy "document_assignments read own" on document_assignments
  for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from org_users
      where org_users.organization_id = document_assignments.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  );

drop policy if exists "document_assignments manage by staff" on document_assignments;
create policy "document_assignments manage by staff" on document_assignments
  for all
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = document_assignments.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  )
  with check (
    exists (
      select 1 from org_users
      where org_users.organization_id = document_assignments.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  );

drop policy if exists "acknowledgements read own" on acknowledgements;
create policy "acknowledgements read own" on acknowledgements
  for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from org_users
      where org_users.organization_id = acknowledgements.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  );

drop policy if exists "acknowledgements update own" on acknowledgements;
create policy "acknowledgements update own" on acknowledgements
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "acknowledgements insert by staff" on acknowledgements;
create policy "acknowledgements insert by staff" on acknowledgements
  for insert
  with check (
    exists (
      select 1 from org_users
      where org_users.organization_id = acknowledgements.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  );

drop policy if exists "training_signoffs read own" on training_signoffs;
create policy "training_signoffs read own" on training_signoffs
  for select
  using (
    student_user_id = auth.uid()
    or instructor_user_id = auth.uid()
    or exists (
      select 1 from org_users
      where org_users.organization_id = training_signoffs.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  );

drop policy if exists "training_signoffs manage by staff" on training_signoffs;
create policy "training_signoffs manage by staff" on training_signoffs
  for all
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = training_signoffs.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  )
  with check (
    exists (
      select 1 from org_users
      where org_users.organization_id = training_signoffs.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  );

drop policy if exists "training_forms read own" on training_forms;
create policy "training_forms read own" on training_forms
  for select
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = training_forms.organization_id
        and org_users.user_id = auth.uid()
    )
  );

drop policy if exists "training_forms manage by staff" on training_forms;
create policy "training_forms manage by staff" on training_forms
  for all
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = training_forms.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  )
  with check (
    exists (
      select 1 from org_users
      where org_users.organization_id = training_forms.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  );

drop policy if exists "training_form_submissions read own" on training_form_submissions;
create policy "training_form_submissions read own" on training_form_submissions
  for select
  using (
    submitted_by = auth.uid()
    or student_user_id = auth.uid()
    or exists (
      select 1 from org_users
      where org_users.organization_id = training_form_submissions.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  );

drop policy if exists "training_form_submissions manage own org" on training_form_submissions;
create policy "training_form_submissions manage own org" on training_form_submissions
  for all
  using (
    submitted_by = auth.uid()
    or exists (
      select 1 from org_users
      where org_users.organization_id = training_form_submissions.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  )
  with check (
    submitted_by = auth.uid()
    or exists (
      select 1 from org_users
      where org_users.organization_id = training_form_submissions.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role in ('admin', 'instructor', 'editor', 'compliance_manager')
    )
  );
