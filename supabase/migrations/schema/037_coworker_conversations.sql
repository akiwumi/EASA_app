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
create policy "coworker_messages insert own"
  on coworker_messages
  for insert
  with check (
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

grant select, insert, update on coworker_conversations to authenticated;
grant select, insert on coworker_messages to authenticated;
grant select, insert, update, delete on coworker_conversations to service_role;
grant select, insert, update, delete on coworker_messages to service_role;

notify pgrst, 'reload schema';
