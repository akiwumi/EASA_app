-- Replace the global rss_item_id unique index with a per-org composite index.
-- NULLS NOT DISTINCT ensures (item_id, NULL) also conflicts with itself so
-- global/null-org findings remain deduplicated too.

drop index if exists ai_findings_item_unique;

create unique index ai_findings_item_org_unique
  on ai_findings (rss_item_id, organization_id)
  nulls not distinct;
