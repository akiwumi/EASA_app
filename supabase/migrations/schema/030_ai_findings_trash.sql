alter table if exists ai_findings
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;

create index if not exists ai_findings_org_deleted_created_idx
  on ai_findings (organization_id, deleted_at, created_at desc);
