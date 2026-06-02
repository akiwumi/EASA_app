alter table coworker_conversations
  add column if not exists archived_at timestamptz;

create index if not exists coworker_conversations_active_user_updated_idx
  on coworker_conversations (organization_id, user_id, updated_at desc)
  where archived_at is null;

create index if not exists coworker_conversations_archived_user_updated_idx
  on coworker_conversations (organization_id, user_id, archived_at desc)
  where archived_at is not null;

notify pgrst, 'reload schema';
