alter table coworker_conversations
  add column if not exists archived_at timestamptz;

create index if not exists coworker_conversations_active_user_updated_idx
  on coworker_conversations (organization_id, user_id, updated_at desc)
  where archived_at is null;

create index if not exists coworker_conversations_archived_user_updated_idx
  on coworker_conversations (organization_id, user_id, archived_at desc)
  where archived_at is not null;

create or replace function assert_active_coworker_conversation(
  target_conversation_id uuid,
  target_organization_id uuid,
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform 1
  from coworker_conversations
  where id = target_conversation_id
    and organization_id = target_organization_id
    and user_id = target_user_id
    and archived_at is null
  for update;

  if not found then
    raise exception 'Coworker conversation is archived or unavailable.';
  end if;
end;
$$;

create or replace function reject_archived_coworker_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform assert_active_coworker_conversation(
    new.conversation_id,
    new.organization_id,
    new.user_id
  );
  return new;
end;
$$;

drop trigger if exists reject_archived_coworker_message on coworker_messages;
create trigger reject_archived_coworker_message
  before insert on coworker_messages
  for each row
  execute function reject_archived_coworker_message();

create or replace function reject_archived_coworker_review_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.action = 'coworker_review_item_created' then
    perform assert_active_coworker_conversation(
      (new.payload->>'conversationId')::uuid,
      new.organization_id,
      new.actor_id
    );

    if not exists (
      select 1
      from coworker_messages
      where id = (new.payload->>'sourceMessageId')::uuid
        and conversation_id = (new.payload->>'conversationId')::uuid
        and organization_id = new.organization_id
        and user_id = new.actor_id
        and role = 'assistant'
    ) then
      raise exception 'Coworker review provenance is unavailable.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists reject_archived_coworker_review_audit on audit_log;
create trigger reject_archived_coworker_review_audit
  before insert on audit_log
  for each row
  execute function reject_archived_coworker_review_audit();

revoke execute on function assert_active_coworker_conversation(uuid, uuid, uuid) from public;
revoke execute on function reject_archived_coworker_message() from public;
revoke execute on function reject_archived_coworker_review_audit() from public;

notify pgrst, 'reload schema';
