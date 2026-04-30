-- Link reg_changes back to ai_findings (MASTER_BUILD §11.5 Phase 2)
alter table reg_changes
  add column if not exists ai_finding_id uuid references ai_findings(id) on delete set null;

create index if not exists reg_changes_finding_idx
  on reg_changes (ai_finding_id);

-- reg_part stores the EASA regulation family (Part-FCL, Part-MED, etc.)
-- We re-use section_ref for the specific section ref and add a dedicated part column
alter table reg_changes
  add column if not exists reg_part text;

create index if not exists reg_changes_org_part_idx
  on reg_changes (organization_id, reg_part, detected_at desc);
