-- Repair databases that predate the ai_findings rss_item_id conflict target.
-- ai-analyze uses upsert(..., { onConflict: "rss_item_id" }), so Postgres
-- needs a matching unique index.

with ranked_findings as (
  select
    ctid,
    row_number() over (
      partition by rss_item_id
      order by created_at desc, id desc
    ) as row_number
  from ai_findings
  where rss_item_id is not null
)
delete from ai_findings
using ranked_findings
where ai_findings.ctid = ranked_findings.ctid
  and ranked_findings.row_number > 1;

create unique index if not exists ai_findings_item_unique
  on ai_findings (rss_item_id);
