-- Proposed updates and approvals (MASTER_BUILD §8 Migration 005)

create table if not exists proposed_updates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  reg_change_id uuid references reg_changes(id) on delete set null,
  flightbook_section_id uuid references flightbook_sections(id) on delete set null,
  classification text not null default 'watchlist',
  risk_level text not null default 'medium',
  ai_rationale text,
  ai_suggested_text text,
  confidence_score numeric(5, 2),
  status text not null default 'pending',
  auto_approve_at timestamptz,
  ai_model text,
  ai_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proposed_updates_org_status_idx
  on proposed_updates (organization_id, status, created_at desc);

create table if not exists approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  proposed_update_id uuid not null references proposed_updates(id) on delete cascade,
  action text not null,
  approver_id uuid references auth.users (id) on delete set null,
  comment text,
  decided_at timestamptz not null default now()
);

create index if not exists approvals_proposed_idx
  on approvals (proposed_update_id, decided_at desc);

alter table proposed_updates enable row level security;
alter table approvals enable row level security;
