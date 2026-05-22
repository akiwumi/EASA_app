-- Multi-school scale hardening: memberships, manuals, versions, and exports.

create unique index if not exists org_users_org_user_unique
  on org_users (organization_id, user_id);

create index if not exists org_users_user_org_idx
  on org_users (user_id, organization_id);

create index if not exists organizations_created_idx
  on organizations (created_at desc);

create index if not exists flightbooks_org_active_created_idx
  on flightbooks (organization_id, active, created_at desc);

create index if not exists flightbooks_org_name_idx
  on flightbooks (organization_id, lower(name));

create index if not exists flightbook_sections_org_book_sort_idx
  on flightbook_sections (organization_id, flightbook_id, sort_order);

create index if not exists flightbook_sections_org_updated_idx
  on flightbook_sections (organization_id, updated_at desc);

create index if not exists flightbook_section_versions_org_created_idx
  on flightbook_section_versions (organization_id, created_at desc);

create index if not exists flightbook_section_versions_section_version_idx
  on flightbook_section_versions (flightbook_section_id, version_number desc);

create index if not exists flightbook_exports_org_book_created_idx
  on flightbook_exports (organization_id, flightbook_id, created_at desc);

create index if not exists proposed_updates_org_status_created_idx
  on proposed_updates (organization_id, status, created_at desc);
