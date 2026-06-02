# Henry Coworker Complete Supabase SQL

Run this entire script once in the Supabase SQL Editor.

```sql
create table if not exists coworker_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation' check (title = btrim(title) and char_length(title) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists coworker_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references coworker_conversations(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  intent text,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists coworker_conversations_organization_id_user_id_updated_at_idx
  on coworker_conversations (organization_id, user_id, updated_at desc);

create index if not exists coworker_messages_conversation_id_created_at_idx
  on coworker_messages (conversation_id, created_at asc);

create index if not exists coworker_messages_org_user_idx
  on coworker_messages (organization_id, user_id);

create or replace function touch_coworker_conversation_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update coworker_conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists touch_coworker_conversation_updated_at on coworker_messages;
create trigger touch_coworker_conversation_updated_at
  after insert on coworker_messages
  for each row
  execute function touch_coworker_conversation_updated_at();

alter table coworker_conversations enable row level security;
alter table coworker_messages enable row level security;

drop policy if exists "coworker_conversations select own" on coworker_conversations;
create policy "coworker_conversations select own"
  on coworker_conversations
  for select
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from org_users
      where org_users.organization_id = coworker_conversations.organization_id
        and org_users.user_id = auth.uid()
    )
  );

drop policy if exists "coworker_conversations insert own" on coworker_conversations;
create policy "coworker_conversations insert own"
  on coworker_conversations
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from org_users
      where org_users.organization_id = coworker_conversations.organization_id
        and org_users.user_id = auth.uid()
    )
  );

drop policy if exists "coworker_conversations update own" on coworker_conversations;
create policy "coworker_conversations update own"
  on coworker_conversations
  for update
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from org_users
      where org_users.organization_id = coworker_conversations.organization_id
        and org_users.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from org_users
      where org_users.organization_id = coworker_conversations.organization_id
        and org_users.user_id = auth.uid()
    )
  );

drop policy if exists "coworker_messages select own" on coworker_messages;
create policy "coworker_messages select own"
  on coworker_messages
  for select
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from coworker_conversations
      where coworker_conversations.id = coworker_messages.conversation_id
        and coworker_conversations.organization_id = coworker_messages.organization_id
        and coworker_conversations.user_id = auth.uid()
        and exists (
          select 1
          from org_users
          where org_users.organization_id = coworker_conversations.organization_id
            and org_users.user_id = auth.uid()
        )
    )
  );

drop policy if exists "coworker_messages insert own" on coworker_messages;

grant select, insert, update on coworker_conversations to authenticated;
revoke insert, update, delete on coworker_messages from authenticated;
grant select on coworker_messages to authenticated;
grant select, insert, update, delete on coworker_conversations to service_role;
grant select, insert, update, delete on coworker_messages to service_role;

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
```
