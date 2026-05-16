# Flight Books Pipeline Parity Build Instructions

Purpose: add the pieces missing from `FLIGHT-BOOKS-PIPELINE-SCHEMA.pdf` while keeping the existing EASA app architecture.

Scope:

- MCP chat interface for flight book search and update history.
- Firecrawl-backed source/article scraping.
- Stricter structured AI extraction.
- Optional auto-apply parity with the PDF pipeline.

Do this in stages. Each stage should be deployable and testable before moving on.

---

## Current App Baseline

Already implemented:

- `flightbooks`, `flightbook_sections`, `flightbook_mappings`
- `rss_items`, `ai_findings`, `reg_changes`, `proposed_updates`
- `pipeline_runs`, `schedules`
- `source_snapshots`, `document_sections`
- flightbook upload, search, draft generation, approval, rollback/history/export flows
- scheduled cron endpoint at `/api/cron/run-scheduled`

Important existing files:

- `src/lib/pipeline/run-org-pipeline.ts`
- `supabase/functions/rss-ingest/index.ts`
- `supabase/functions/regulation-ingest/index.ts`
- `supabase/functions/ai-analyze/index.ts`
- `src/lib/ai/proposed-updates.ts`
- `supabase/functions/apply-update/index.ts`
- `src/app/api/cron/run-scheduled/route.ts`
- `vercel.json`

Do not replace these wholesale. Add parity features around them.

---

## Stage 1 - Database Additions

Goal: add missing PDF-compatible audit/state tables without disrupting existing tables.

### 1.1 Create Migration

Create a new migration:

```text
supabase/migrations/schema/031_pipeline_pdf_parity.sql
```

SQL:

```sql
-- PDF parity additions for Firecrawl, structured extraction, MCP history,
-- and optional auto-apply.

create table if not exists public.rss_feed_state (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  source_id uuid references public.sources(id) on delete cascade,
  feed_url text not null,
  feed_name text,
  last_seen_guids text[] not null default '{}',
  last_fetched timestamptz,
  last_item_pub timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, feed_url)
);

create index if not exists rss_feed_state_org_updated_idx
  on public.rss_feed_state (organization_id, updated_at desc);

create table if not exists public.pipeline_update_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  flightbook_id uuid references public.flightbooks(id) on delete set null,
  flightbook_section_id uuid references public.flightbook_sections(id) on delete set null,
  proposed_update_id uuid references public.proposed_updates(id) on delete set null,
  source_feed_url text,
  source_item_url text,
  source_item_guid text,
  previous_content text,
  new_content text,
  openai_response jsonb,
  firecrawl_metadata jsonb,
  status text not null default 'queued',
  failure_reason text,
  applied_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists pipeline_update_log_org_created_idx
  on public.pipeline_update_log (organization_id, created_at desc);

create index if not exists pipeline_update_log_book_idx
  on public.pipeline_update_log (flightbook_id);

create index if not exists pipeline_update_log_section_idx
  on public.pipeline_update_log (flightbook_section_id);

create index if not exists pipeline_update_log_status_idx
  on public.pipeline_update_log (status);

alter table public.rss_feed_state enable row level security;
alter table public.pipeline_update_log enable row level security;
```

### 1.2 RLS Migration

Create:

```text
supabase/migrations/rls/006_pipeline_pdf_parity.sql
```

SQL:

```sql
drop policy if exists "rss_feed_state select org" on public.rss_feed_state;
create policy "rss_feed_state select org" on public.rss_feed_state
for select using (
  exists (
    select 1
    from public.org_users ou
    where ou.organization_id = rss_feed_state.organization_id
      and ou.user_id = auth.uid()
  )
);

drop policy if exists "pipeline_update_log select org" on public.pipeline_update_log;
create policy "pipeline_update_log select org" on public.pipeline_update_log
for select using (
  exists (
    select 1
    from public.org_users ou
    where ou.organization_id = pipeline_update_log.organization_id
      and ou.user_id = auth.uid()
  )
);
```

Service role writes these tables. User-facing reads go through RLS.

### 1.3 Validation SQL

Run after migration:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('rss_feed_state', 'pipeline_update_log')
order by table_name;
```

Expected:

```text
pipeline_update_log
rss_feed_state
```

---

## Stage 2 - Dependencies And Environment

Goal: add packages and environment variables for Firecrawl, structured extraction, and MCP.

### 2.1 Packages

Install:

```bash
npm install @mendable/firecrawl-js openai zod fastmcp
```

Optional if moving RSS parsing from Deno regex into Next/Node:

```bash
npm install rss-parser
```

Keep Supabase Edge Functions Deno-compatible. Do not import Node packages into Deno functions unless bundled and verified.

### 2.2 Environment Variables

Add to local and deployment environments:

```bash
# Existing required vars
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
OPENAI_API_KEY=

# New Firecrawl
FIRECRAWL_API_KEY=
FIRECRAWL_ONLY_MAIN_CONTENT=true

# Scheduled cron auth
SCHEDULED_PIPELINE_SECRET=
CRON_SECRET=

# Optional auto-apply parity
PIPELINE_AUTO_APPLY_ENABLED=false
PIPELINE_AUTO_APPLY_MAX_RISK=low
PIPELINE_AUTO_APPLY_MIN_CONFIDENCE=0.90
PIPELINE_AUTO_APPLY_REQUIRE_CITATIONS=true

# MCP server
MCP_SUPABASE_URL=
MCP_SUPABASE_SERVICE_ROLE_KEY=
MCP_DEFAULT_ORGANIZATION_ID=
```

Recommended production default:

```bash
PIPELINE_AUTO_APPLY_ENABLED=false
```

Enable only after review and audit logging are proven.

---

## Stage 3 - Firecrawl Scraper

Goal: add Firecrawl as a scraper layer, then wire it into the existing regulation/article ingestion flow.

### 3.1 Add Firecrawl Wrapper

Create:

```text
src/lib/scraper/firecrawl.ts
```

Responsibilities:

- read `FIRECRAWL_API_KEY`
- scrape URL to markdown
- return content, metadata, and raw provider response summary
- fail clearly when key is missing

Shape:

```ts
export type ScrapedPage = {
  url: string;
  markdown: string;
  title?: string | null;
  metadata?: Record<string, unknown>;
};

export async function scrapeUrlWithFirecrawl(url: string): Promise<ScrapedPage> {
  // Use @mendable/firecrawl-js.
  // formats: ['markdown']
  // onlyMainContent: process.env.FIRECRAWL_ONLY_MAIN_CONTENT !== 'false'
}
```

### 3.2 Add Fallback Scraper

Keep a fallback to current direct `fetch()` and `cleanHtml()` behavior.

Recommended behavior:

1. Try Firecrawl for HTML/article URLs.
2. If Firecrawl fails, log failure and use current direct fetch cleanup.
3. Store Firecrawl metadata in `pipeline_update_log.firecrawl_metadata` or `source_snapshots.metadata` if a metadata column exists.

### 3.3 Wire Into Pipeline

Best insertion points:

- `supabase/functions/regulation-ingest/index.ts` for EASA HTML sources.
- Or move Firecrawl scraping to Next server code and call it before/around Edge Function ingestion.

Preferred incremental path:

1. Add a Next API route for manual Firecrawl smoke test:

```text
src/app/api/admin/firecrawl-test/route.ts
```

2. Once verified, add a new pipeline step in `src/lib/pipeline/run-org-pipeline.ts` before or inside `regulation-ingest`.

Avoid breaking the current Deno Edge Function by importing Node packages directly into it.

### 3.4 Test

Manual test target:

```text
POST /api/admin/firecrawl-test
{ "url": "https://www.easa.europa.eu/en/document-library/easy-access-rules" }
```

Expected:

- markdown text returned
- title/metadata returned
- no raw huge HTML in response
- clear error if `FIRECRAWL_API_KEY` missing

---

## Stage 4 - Strict Structured AI Extraction

Goal: add the PDF-style `UpdateDecision` model and use it to create stronger proposed updates.

### 4.1 Add Schema Module

Create:

```text
src/lib/ai/update-decision.ts
```

Use Zod:

```ts
import { z } from "zod";

export const UpdateDecisionSchema = z.object({
  should_update: z.boolean(),
  reason: z.string(),
  updated_content: z.string().optional(),
  affected_sections: z.array(z.string()),
  confidence: z.enum(["high", "medium", "low"]),
  risk_level: z.enum(["high", "medium", "low"]).default("medium"),
  source_citations: z.array(z.object({
    url: z.string().optional(),
    quote: z.string().optional(),
    reason: z.string().optional(),
  })).default([]),
});

export type UpdateDecision = z.infer<typeof UpdateDecisionSchema>;
```

### 4.2 Add Extractor

Create:

```text
src/lib/ai/extract-update-decision.ts
```

Responsibilities:

- accept scraped content
- accept current flightbook section content
- accept source URL
- call OpenAI structured output
- validate response with Zod
- return `UpdateDecision`

Recommended function:

```ts
export async function extractUpdateDecision(params: {
  scrapedContent: string;
  currentFlightbookSection: {
    id: string;
    title: string | null;
    body: string;
  };
  sourceUrl: string;
  model?: string;
}): Promise<UpdateDecision> {
  // Use OpenAI responses/chat structured output.
  // Fail closed: if parsing fails, return should_update=false with low confidence.
}
```

System rules:

```text
You are an aviation compliance analyst.
Only propose an update when the new source contains materially different information relevant to this exact flight book section.
Preserve accurate existing content.
Do not invent regulation changes.
If unsure, set should_update=false and confidence=low.
Return structured data only.
```

### 4.3 Integrate With Existing Draft Flow

Current draft generation is in:

```text
src/lib/ai/proposed-updates.ts
```

Integration options:

- Conservative: use `UpdateDecision` only as a validation layer before writing `ai_suggested_text`.
- PDF parity: use `updated_content` as the proposed replacement body.

Recommended:

1. Keep existing RAG draft generation.
2. Run structured extraction against the selected source + selected flightbook section.
3. Only save `ai_suggested_text` when:
   - `should_update = true`
   - `updated_content` exists
   - `confidence != low`
4. Save full structured response into `proposed_updates.retrieval_context` or `pipeline_update_log.openai_response`.

### 4.4 Test

Use one known `proposed_updates` row:

1. Generate draft.
2. Confirm `ai_suggested_text` is present.
3. Confirm structured response logged.
4. Confirm low-confidence responses do not overwrite suggested text.

---

## Stage 5 - MCP Server

Goal: expose flight books and update history to Claude Desktop or other MCP clients.

### 5.1 Directory Structure

Create:

```text
mcp-server/
  package.json
  tsconfig.json
  src/
    index.ts
    supabase.ts
    tools/
      searchFlightBooks.ts
      getRecentUpdates.ts
      getUpdateHistory.ts
```

### 5.2 MCP Package

`mcp-server/package.json`:

```json
{
  "name": "easa-flight-books-mcp",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.91.1",
    "fastmcp": "^1.27.7",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "tsx": "^4.20.0",
    "typescript": "^5.0.0"
  }
}
```

Version numbers may differ. Use the latest compatible versions at install time.

### 5.3 Supabase Client

`mcp-server/src/supabase.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

export function getSupabase() {
  const url = process.env.MCP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.MCP_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing MCP_SUPABASE_URL or MCP_SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
```

### 5.4 Tool: Search Flight Books

Query existing schema:

- `flightbooks`
- `flightbook_sections`

Behavior:

- required `query`
- optional `organization_id`
- optional `flightbook_id`
- optional `limit`
- use text search or `ilike` fallback

Result fields:

- book name
- section title
- section number
- excerpt
- section id
- updated_at

### 5.5 Tool: Get Recent Updates

Query preferred source:

1. `pipeline_update_log`
2. fallback to `proposed_updates`
3. fallback to `flightbook_section_versions`

Parameters:

- `organization_id`
- `days`, default `7`
- `limit`, default `10`

Result fields:

- created/applied date
- status
- flightbook
- section
- source URL
- AI reason
- confidence/risk

### 5.6 Tool: Get Update History

Parameters:

- `flightbook_section_id` or `flightbook_id`
- `limit`, default `20`

Query:

- `pipeline_update_log`
- `flightbook_section_versions`
- `audit_log`

Return:

- version number
- change source
- applied timestamp
- actor if available
- previous/current content excerpts

### 5.7 MCP Entry

`mcp-server/src/index.ts`:

```ts
import { FastMCP } from "fastmcp";
import { searchFlightBooksTool } from "./tools/searchFlightBooks.js";
import { getRecentUpdatesTool } from "./tools/getRecentUpdates.js";
import { getUpdateHistoryTool } from "./tools/getUpdateHistory.js";

const server = new FastMCP({
  name: "EASA Flight Books MCP Server",
  version: "0.1.0",
});

server.addTool(searchFlightBooksTool);
server.addTool(getRecentUpdatesTool);
server.addTool(getUpdateHistoryTool);

server.start({ transportType: "stdio" });
```

Check current FastMCP API before coding. If constructor/tool syntax differs, follow installed package docs.

### 5.8 Claude Desktop Config

macOS path:

```text
~/Library/Application Support/Claude/claude_desktop_config.json
```

Config:

```json
{
  "mcpServers": {
    "easa-flight-books": {
      "command": "node",
      "args": [
        "/absolute/path/to/EASA_app/mcp-server/dist/index.js"
      ],
      "env": {
        "MCP_SUPABASE_URL": "https://your-project.supabase.co",
        "MCP_SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key",
        "MCP_DEFAULT_ORGANIZATION_ID": "your-org-id"
      }
    }
  }
}
```

### 5.9 Test Questions

Ask Claude Desktop:

```text
Search flight books for landing procedures.
```

```text
What flight book updates were proposed in the last 7 days?
```

```text
Show update history for this flightbook section: <uuid>
```

---

## Stage 6 - Optional Auto-Apply Parity

Goal: match the PDF behavior where the pipeline can write flightbook content automatically.

Default: disabled.

### 6.1 Auto-Apply Rules

Only auto-apply when all are true:

- `PIPELINE_AUTO_APPLY_ENABLED=true`
- proposed update status is `pending`
- risk is at or below `PIPELINE_AUTO_APPLY_MAX_RISK`
- confidence meets `PIPELINE_AUTO_APPLY_MIN_CONFIDENCE`
- `ai_suggested_text` exists
- `flightbook_section_id` exists
- source citations exist when `PIPELINE_AUTO_APPLY_REQUIRE_CITATIONS=true`
- section was not modified after proposal creation

### 6.2 Add Worker

Create:

```text
src/lib/pipeline/auto-apply.ts
```

Function:

```ts
export async function autoApplyEligibleUpdatesForOrg(
  admin: SupabaseClient,
  organizationId: string,
): Promise<{
  attempted: number;
  applied: number;
  skipped: number;
  errors: Array<{ id: string; error: string }>;
}> {
  // Load eligible proposed_updates.
  // Reuse apply-update logic or extract shared apply function.
  // Write pipeline_update_log for every applied/skipped/failed candidate.
}
```

Important: do not call the existing Edge Function with a fake user unless the audit model is designed for that. Better:

1. Extract shared transactional apply logic.
2. Keep user-approved apply using user actor.
3. Add system auto-apply using `actor_id = null`, `change_source = 'pipeline_auto_apply'`.

### 6.3 Transaction Requirements

Auto-apply must do all of this together:

```sql
-- conceptual transaction
insert into flightbook_section_versions (... previous body ...);
update flightbook_sections set body = new_text, updated_at = now() where id = section_id;
update proposed_updates set status = 'approved', updated_at = now() where id = proposed_update_id;
insert into approvals (... action = 'auto_approved' ...);
insert into audit_log (... action = 'proposed_update_auto_approved' ...);
insert into pipeline_update_log (... status = 'applied' ...);
```

Prefer a PostgreSQL RPC for atomicity:

```sql
create or replace function public.apply_pipeline_update(
  p_organization_id uuid,
  p_proposed_update_id uuid,
  p_flightbook_section_id uuid,
  p_new_body text,
  p_openai_response jsonb default null,
  p_firecrawl_metadata jsonb default null,
  p_source_feed_url text default null,
  p_source_item_url text default null,
  p_source_item_guid text default null
)
returns table(ok boolean, version_number int, error text)
language plpgsql
security definer
as $$
declare
  v_section record;
  v_update record;
  v_next_version int;
begin
  select id, body, organization_id, updated_at
  into v_section
  from public.flightbook_sections
  where id = p_flightbook_section_id
    and organization_id = p_organization_id
  for update;

  if not found then
    return query select false, null::int, 'Flightbook section not found';
    return;
  end if;

  select id, created_at, status
  into v_update
  from public.proposed_updates
  where id = p_proposed_update_id
    and organization_id = p_organization_id
  for update;

  if not found then
    return query select false, null::int, 'Proposed update not found';
    return;
  end if;

  if v_update.status = 'approved' then
    return query select false, null::int, 'Update already approved';
    return;
  end if;

  if v_section.updated_at > v_update.created_at then
    return query select false, null::int, 'Conflict: section changed after proposal';
    return;
  end if;

  select coalesce(max(version_number), 0) + 1
  into v_next_version
  from public.flightbook_section_versions
  where flightbook_section_id = p_flightbook_section_id;

  insert into public.flightbook_section_versions (
    organization_id,
    flightbook_section_id,
    body,
    version_number,
    change_source,
    created_by
  ) values (
    p_organization_id,
    p_flightbook_section_id,
    v_section.body,
    v_next_version,
    'pipeline_auto_apply',
    null
  );

  update public.flightbook_sections
  set body = p_new_body,
      updated_at = now()
  where id = p_flightbook_section_id;

  update public.proposed_updates
  set status = 'approved',
      updated_at = now()
  where id = p_proposed_update_id;

  insert into public.approvals (
    organization_id,
    proposed_update_id,
    action,
    approver_id,
    comment
  ) values (
    p_organization_id,
    p_proposed_update_id,
    'auto_approved',
    null,
    'Automatically approved by pipeline parity worker'
  );

  insert into public.audit_log (
    organization_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    payload
  ) values (
    p_organization_id,
    null,
    'proposed_update_auto_approved',
    'proposed_update',
    p_proposed_update_id,
    jsonb_build_object(
      'flightbookSectionId', p_flightbook_section_id,
      'versionNumber', v_next_version
    )
  );

  insert into public.pipeline_update_log (
    organization_id,
    flightbook_section_id,
    proposed_update_id,
    source_feed_url,
    source_item_url,
    source_item_guid,
    previous_content,
    new_content,
    openai_response,
    firecrawl_metadata,
    status,
    applied_at
  ) values (
    p_organization_id,
    p_flightbook_section_id,
    p_proposed_update_id,
    p_source_feed_url,
    p_source_item_url,
    p_source_item_guid,
    v_section.body,
    p_new_body,
    p_openai_response,
    p_firecrawl_metadata,
    'applied',
    now()
  );

  return query select true, v_next_version, null::text;
end;
$$;
```

Review `audit_log` schema before applying this RPC. Adjust columns if needed.

### 6.4 Wire Into Pipeline

In `src/lib/pipeline/run-org-pipeline.ts`, add a step after draft generation:

```text
auto-apply
```

Pseudo-flow:

```ts
if (process.env.PIPELINE_AUTO_APPLY_ENABLED === "true") {
  steps["auto-apply"] = { status: "running", started_at: now };
  const autoApplyResult = await autoApplyEligibleUpdatesForOrg(admin, orgId);
  steps["auto-apply"] = { status: "complete", ... };
}
```

### 6.5 Test

Use a disposable organization/section first.

Checklist:

- low-risk pending proposed update exists
- `ai_suggested_text` exists
- auto-apply disabled: nothing changes
- auto-apply enabled: section body updates
- version snapshot created
- proposed update status becomes `approved`
- approval row created
- audit row created
- `pipeline_update_log` row created
- conflict blocks if section changed after proposal

---

## Stage 7 - Admin/UI Visibility

Goal: make new parity features visible enough to operate safely.

Recommended additions:

- Admin AI/settings panel shows Firecrawl key status.
- Pipeline status panel includes Firecrawl and structured extraction counts.
- Proposed update detail shows structured decision JSON summary:
  - should update
  - reason
  - confidence
  - affected sections
  - citations
- Auto-apply settings UI:
  - enabled toggle
  - max risk
  - min confidence
  - require citations

Do not expose service-role secrets.

---

## Stage 8 - End-To-End Validation

Run after all stages:

### Database

```sql
select count(*) from public.rss_feed_state;
select count(*) from public.pipeline_update_log;
select count(*) from public.proposed_updates;
select count(*) from public.flightbook_section_versions;
```

### Pipeline

Manual run:

```text
POST /api/run-scrape
```

Expected:

- `pipeline_runs.status = complete`
- RSS step complete
- regulation/firecrawl step complete or fallback used
- AI analyze complete
- draft updates generated
- optional auto-apply step skipped unless enabled

### MCP

Build:

```bash
cd mcp-server
npm install
npm run build
npm run start
```

Claude Desktop:

```text
Search flight books for medical validity.
What updates were applied in the last 7 days?
Show update history for section <uuid>.
```

### Auto-Apply

Only after manual approval flow is proven:

```bash
PIPELINE_AUTO_APPLY_ENABLED=true
PIPELINE_AUTO_APPLY_MAX_RISK=low
PIPELINE_AUTO_APPLY_MIN_CONFIDENCE=0.90
```

Then run pipeline against a test org.

---

## Recommended Build Order

1. Stage 1: SQL tables and RLS.
2. Stage 2: dependencies and env vars.
3. Stage 5: MCP server, because it reads existing data and is low-risk.
4. Stage 3: Firecrawl smoke test and scraper wrapper.
5. Stage 4: structured extraction as validation-only.
6. Stage 4: allow structured extraction to populate proposed drafts.
7. Stage 6: auto-apply worker behind env flag.
8. Stage 7: admin visibility.
9. Stage 8: full end-to-end test.

Safest deployment split:

- Deploy 1: SQL + MCP.
- Deploy 2: Firecrawl fallback scraper.
- Deploy 3: structured extraction for proposed updates.
- Deploy 4: auto-apply disabled in production.
- Deploy 5: enable auto-apply only for a test org.

---

## Production Guardrails

Keep these rules:

- Auto-apply default off.
- Never auto-apply high-risk changes.
- Never auto-apply low-confidence changes.
- Never auto-apply without section version snapshot.
- Never auto-apply without audit log.
- Never auto-apply if section changed after proposal creation.
- Log every skipped candidate with reason.
- MCP uses service role only in local trusted desktop/server context.
- MCP responses must return excerpts, not entire manuals by default.

