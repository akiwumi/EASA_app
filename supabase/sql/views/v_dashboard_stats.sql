-- Dashboard aggregates scoped to the current user’s organisations (security invoker)

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
      and a.decided_at >= date_trunc('week', now() at time zone 'utc')
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
