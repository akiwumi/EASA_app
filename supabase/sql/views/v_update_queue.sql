-- Proposed updates with regulation and section context (security invoker)

create or replace view v_update_queue with (security_invoker = true) as
select
  pu.id,
  pu.organization_id,
  pu.classification,
  pu.risk_level,
  pu.confidence_score,
  pu.status,
  pu.ai_rationale,
  pu.created_at,
  pu.updated_at,
  rc.section_ref as reg_section_ref,
  rc.change_type,
  rc.diff_text,
  fs.section_number,
  fs.title as flightbook_section_title,
  rd.reg_number,
  rd.part as regulation_part
from proposed_updates pu
left join reg_changes rc on rc.id = pu.reg_change_id
left join flightbook_sections fs on fs.id = pu.flightbook_section_id
left join reg_documents rd on rd.id = rc.reg_document_id
where exists (
  select 1 from org_users ou
  where ou.organization_id = pu.organization_id
    and ou.user_id = auth.uid()
);
