-- Audit trail for flight book section body changes (MASTER_BUILD Phase 0)

create or replace function public.audit_flightbook_section_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if tg_op = 'UPDATE' and old.body is distinct from new.body then
    insert into audit_log (organization_id, actor_id, action, entity_type, entity_id, payload)
    values (
      old.organization_id,
      uid,
      'edit',
      'flightbook_section',
      old.id,
      jsonb_build_object(
        'section_number', old.section_number,
        'before_preview', left(old.body, 4000),
        'after_preview', left(new.body, 4000)
      )
    );
  elsif tg_op = 'DELETE' then
    insert into audit_log (organization_id, actor_id, action, entity_type, entity_id, payload)
    values (
      old.organization_id,
      uid,
      'edit',
      'flightbook_section',
      old.id,
      jsonb_build_object(
        'section_number', old.section_number,
        'deleted', true
      )
    );
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_audit_flightbook_section on flightbook_sections;
create trigger trg_audit_flightbook_section
  after update of body or delete on flightbook_sections
  for each row
  execute procedure public.audit_flightbook_section_change();
