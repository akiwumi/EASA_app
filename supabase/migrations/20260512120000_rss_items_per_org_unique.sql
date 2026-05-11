-- RSS feed items must be deduplicated per source and organization, not globally.
-- The old global external_id index allowed one school account to block another
-- school from ingesting the same EASA feed item.

drop index if exists rss_items_external_id_unique;

create unique index if not exists rss_items_source_external_org_unique
  on rss_items (source_id, external_id, organization_id)
  nulls not distinct;

-- Existing and future school accounts should have automation defaults.
insert into schedules (
  organization_id,
  cadence,
  run_time_utc,
  run_times_utc,
  runs_per_day,
  enabled,
  auto_approve_low,
  auto_approve_delay_hours,
  notify_on_detect,
  default_export_fmt,
  updated_at
)
select
  o.id,
  'daily',
  '06:00'::time,
  array['06:00'::time],
  1,
  true,
  false,
  24,
  true,
  'pdf',
  now()
from organizations o
where not exists (
  select 1 from schedules s where s.organization_id = o.id
);

insert into ai_provider_config (organization_id, provider, model, api_key, updated_at)
select o.id, 'openai', 'gpt-4o', '', now()
from organizations o
where not exists (
  select 1 from ai_provider_config c where c.organization_id = o.id
);
