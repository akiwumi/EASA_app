-- User profile, school profile, billing, and role-management upgrades

do $$
begin
  if exists (select 1 from pg_type where typname = 'app_role') then
    if not exists (
      select 1 from pg_enum
      where enumtypid = 'app_role'::regtype
        and enumlabel = 'instructor'
    ) then
      alter type app_role add value 'instructor';
    end if;

    if not exists (
      select 1 from pg_enum
      where enumtypid = 'app_role'::regtype
        and enumlabel = 'student'
    ) then
      alter type app_role add value 'student';
    end if;
  end if;
end $$;

alter table if exists user_profiles
  add column if not exists personal_notes text,
  add column if not exists phone text;

create table if not exists organization_branding (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references organizations(id) on delete cascade,
  public_name text,
  logo_url text,
  primary_color text,
  secondary_color text,
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table organization_branding
  add column if not exists legal_name text,
  add column if not exists website_url text,
  add column if not exists school_code text,
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists city text,
  add column if not exists region text,
  add column if not exists postal_code text,
  add column if not exists country text,
  add column if not exists billing_contact_name text,
  add column if not exists billing_email text,
  add column if not exists billing_phone text,
  add column if not exists billing_address text,
  add column if not exists vat_number text,
  add column if not exists billing_notes text;

alter table organization_branding enable row level security;

drop policy if exists "organization_branding read own" on organization_branding;
create policy "organization_branding read own" on organization_branding
  for select
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = organization_branding.organization_id
        and org_users.user_id = auth.uid()
    )
  );

drop policy if exists "organization_branding manage by admin" on organization_branding;
create policy "organization_branding manage by admin" on organization_branding
  for all
  using (
    exists (
      select 1 from org_users
      where org_users.organization_id = organization_branding.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from org_users
      where org_users.organization_id = organization_branding.organization_id
        and org_users.user_id = auth.uid()
        and org_users.role = 'admin'
    )
  );
