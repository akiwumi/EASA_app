-- Dashboard summary views for flight-school training operations (Phase 3)

create or replace view v_training_assignment_status with (security_invoker = true) as
select
  da.organization_id,
  count(*) filter (where da.status = 'assigned') as assignments_open,
  count(*) filter (where a.status = 'acknowledged') as assignments_acknowledged,
  count(*) filter (where a.status = 'pending') as assignments_pending_ack
from document_assignments da
left join acknowledgements a
  on a.assignment_id = da.id
group by da.organization_id;

create or replace view v_training_signoff_status with (security_invoker = true) as
select
  organization_id,
  count(*) filter (where status = 'pending') as signoffs_pending,
  count(*) filter (where status = 'completed') as signoffs_completed
from training_signoffs
group by organization_id;

create or replace view v_programme_overview with (security_invoker = true) as
select
  p.organization_id,
  p.id as programme_id,
  p.name,
  count(distinct ph.id) as phase_count,
  count(distinct l.id) as lesson_count
from training_programmes p
left join training_phases ph on ph.programme_id = p.id
left join training_lessons l on l.programme_id = p.id
group by p.organization_id, p.id, p.name;
