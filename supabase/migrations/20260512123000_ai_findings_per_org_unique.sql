-- AI findings must be deduplicated per RSS item and organization.
-- A global rss_item_id unique index prevents multiple school accounts from
-- analyzing the same EASA feed item independently.

drop index if exists ai_findings_item_unique;

create unique index if not exists ai_findings_item_org_unique
  on ai_findings (rss_item_id, organization_id)
  nulls not distinct;
