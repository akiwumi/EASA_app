alter table proposed_updates
  add column if not exists dedup_key text;

create unique index if not exists proposed_updates_org_dedup_key_unique
  on proposed_updates (organization_id, dedup_key)
  where dedup_key is not null;
