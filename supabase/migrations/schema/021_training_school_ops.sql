-- Flight-school training and operations schema (Phase 3)

do $$
begin
  if exists (select 1 from pg_type where typname = 'app_role') then
    if not exists (
      select 1
      from pg_enum
      where enumtypid = 'app_role'::regtype
        and enumlabel = 'instructor'
    ) then
      alter type app_role add value 'instructor';
    end if;
    if not exists (
      select 1
      from pg_enum
      where enumtypid = 'app_role'::regtype
        and enumlabel = 'student'
    ) then
      alter type app_role add value 'student';
    end if;
    if not exists (
      select 1
      from pg_enum
      where enumtypid = 'app_role'::regtype
        and enumlabel = 'compliance_manager'
    ) then
      alter type app_role add value 'compliance_manager';
    end if;
  end if;
end $$;

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

create table if not exists onboarding_checklists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  key text not null,
  label text not null,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, key)
);

create table if not exists training_programmes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  code text,
  name text not null,
  description text,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists training_phases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  programme_id uuid not null references training_programmes(id) on delete cascade,
  title text not null,
  description text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists training_lessons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  programme_id uuid not null references training_programmes(id) on delete cascade,
  phase_id uuid references training_phases(id) on delete set null,
  lesson_code text,
  title text not null,
  description text,
  lesson_type text not null default 'ground',
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists lesson_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  lesson_id uuid not null references training_lessons(id) on delete cascade,
  flightbook_id uuid references flightbooks(id) on delete set null,
  flightbook_section_id uuid references flightbook_sections(id) on delete set null,
  title text,
  required boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists document_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  lesson_id uuid references training_lessons(id) on delete set null,
  programme_id uuid references training_programmes(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  title text not null,
  due_at timestamptz,
  status text not null default 'assigned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists acknowledgements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  assignment_id uuid not null references document_assignments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  acknowledged_at timestamptz,
  acknowledgement_note text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, user_id)
);

create table if not exists training_signoffs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  lesson_id uuid references training_lessons(id) on delete set null,
  student_user_id uuid not null references auth.users(id) on delete cascade,
  instructor_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending',
  signoff_note text,
  signed_off_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists training_forms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  programme_id uuid references training_programmes(id) on delete set null,
  title text not null,
  description text,
  schema_json jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists training_form_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  form_id uuid not null references training_forms(id) on delete cascade,
  submitted_by uuid references auth.users(id) on delete set null,
  student_user_id uuid references auth.users(id) on delete set null,
  lesson_id uuid references training_lessons(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists training_programmes_org_idx
  on training_programmes (organization_id, created_at desc);

create index if not exists training_phases_programme_idx
  on training_phases (programme_id, sort_order);

create index if not exists training_lessons_programme_idx
  on training_lessons (programme_id, sort_order);

create index if not exists lesson_documents_lesson_idx
  on lesson_documents (lesson_id);

create index if not exists document_assignments_user_idx
  on document_assignments (user_id, status, due_at);

create index if not exists acknowledgements_user_idx
  on acknowledgements (user_id, status, acknowledged_at desc);

create index if not exists training_signoffs_student_idx
  on training_signoffs (student_user_id, status, signed_off_at desc);

create index if not exists training_form_submissions_form_idx
  on training_form_submissions (form_id, status, submitted_at desc);

alter table organization_branding enable row level security;
alter table onboarding_checklists enable row level security;
alter table training_programmes enable row level security;
alter table training_phases enable row level security;
alter table training_lessons enable row level security;
alter table lesson_documents enable row level security;
alter table document_assignments enable row level security;
alter table acknowledgements enable row level security;
alter table training_signoffs enable row level security;
alter table training_forms enable row level security;
alter table training_form_submissions enable row level security;
