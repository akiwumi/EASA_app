alter table ai_findings
  add column if not exists dismissed_by uuid references auth.users(id) on delete set null,
  add column if not exists dismissed_at timestamptz,
  add column if not exists dismissal_reason text;

create index if not exists ai_findings_org_dismissed_at_idx
  on ai_findings (organization_id, dismissed_at desc)
  where dismissed_at is not null;
