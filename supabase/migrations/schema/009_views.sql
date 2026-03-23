-- Analytics views (MASTER_BUILD §7). Requires prior schema + RLS.

create or replace view v_dashboard_stats with (security_invoker = true) as
select
  ou.organization_id,
  coalesce((
    select count(*)::bigint
    from reg_changes rc
    where rc.organization_id = ou.organization_id
      and rc.detected_at >= (now() - interval '7 days')
  ), 0) as new_changes_7d,
  coalesce((
    select count(*)::bigint
    from proposed_updates pu
    where pu.organization_id = ou.organization_id
      and pu.status = 'pending'
  ), 0) as pending_approvals,
  coalesce((
    select count(*)::bigint
    from approvals a
    join proposed_updates pu on pu.id = a.proposed_update_id
    where pu.organization_id = ou.organization_id
      and a.action in ('approved', 'auto_approved')
      and a.decided_at >= date_trunc('week', (now() at time zone 'utc'))
  ), 0) as approved_this_week,
  coalesce((
    select count(*)::bigint
    from sources s
    where s.organization_id = ou.organization_id
       or s.organization_id is null
  ), 0) as sources_total,
  coalesce((
    select count(*) filter (where s.active)::bigint
    from sources s
    where s.organization_id = ou.organization_id
       or s.organization_id is null
  ), 0) as sources_active
from org_users ou
where ou.user_id = auth.uid();

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
