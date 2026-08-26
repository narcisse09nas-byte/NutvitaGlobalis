-- PPM refinements: organization-level registries (staff, donors, suppliers, units), project code
-- auto-numbering, structured project sites, a project activity journal, and role-assignment
-- multi-role/"other" support.
-- Run after ppm-organization-portfolio-program.sql and ppm-wave9-staff-accounts.sql.

-- Generic scope-scoped sequence counter, reused for the project code and for every registry code
-- below — mirrors ppm_ops_sequence_counters' row-locked upsert pattern (safe under concurrency),
-- generalized to any scope_id (an organization or a project) rather than one fixed FK.
create table if not exists public.ppm_registry_sequence_counters (
  scope_id uuid not null,
  kind text not null,
  year int not null default 0,
  last_seq int not null default 0,
  primary key(scope_id, kind, year)
);

create or replace function public.ppm_next_sequence(p_scope_id uuid, p_kind text, p_year int default 0)
returns int language plpgsql security definer set search_path = public as $$
declare v_next int;
begin
  insert into public.ppm_registry_sequence_counters(scope_id, kind, year, last_seq)
  values (p_scope_id, p_kind, p_year, 1)
  on conflict (scope_id, kind, year) do update set last_seq = public.ppm_registry_sequence_counters.last_seq + 1
  returning last_seq into v_next;
  return v_next;
end $$;

-- Organization-level registries -----------------------------------------------------------------

create table if not exists public.ppm_organization_staff (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ppm_organizations(id) on delete cascade,
  code text,
  full_name text not null,
  role_title text,
  email text,
  phone text,
  status text not null default 'active' check(status in ('active','inactive')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ppm_organization_donors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ppm_organizations(id) on delete cascade,
  code text,
  name text not null,
  donor_type text check(donor_type is null or donor_type in ('bilateral','multilateral','foundation','private_sector','individual','other')),
  contact_name text,
  contact_email text,
  contact_phone text,
  notes text,
  status text not null default 'active' check(status in ('active','inactive')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ppm_organization_suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ppm_organizations(id) on delete cascade,
  code text,
  name text not null,
  category text,
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,
  notes text,
  status text not null default 'active' check(status in ('active','inactive')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ppm_organization_units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ppm_organizations(id) on delete cascade,
  code text,
  name text not null,
  unit_type text check(unit_type is null or unit_type in ('department','directorate','field_office','other')),
  head_name text,
  notes text,
  status text not null default 'active' check(status in ('active','inactive')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ppm_organization_staff_org on public.ppm_organization_staff(organization_id, status);
create index if not exists ppm_organization_donors_org on public.ppm_organization_donors(organization_id, status);
create index if not exists ppm_organization_suppliers_org on public.ppm_organization_suppliers(organization_id, status);
create index if not exists ppm_organization_units_org on public.ppm_organization_units(organization_id, status);

alter table public.ppm_organization_staff enable row level security;
alter table public.ppm_organization_donors enable row level security;
alter table public.ppm_organization_suppliers enable row level security;
alter table public.ppm_organization_units enable row level security;

drop policy if exists "PPM users read organization staff" on public.ppm_organization_staff;
create policy "PPM users read organization staff" on public.ppm_organization_staff for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM admins manage organization staff" on public.ppm_organization_staff;
create policy "PPM admins manage organization staff" on public.ppm_organization_staff for all to authenticated
  using(public.ppm_role_matches(array['super_admin','org_admin'],'organization',organization_id))
  with check(public.ppm_role_matches(array['super_admin','org_admin'],'organization',organization_id));

drop policy if exists "PPM users read organization donors" on public.ppm_organization_donors;
create policy "PPM users read organization donors" on public.ppm_organization_donors for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM admins manage organization donors" on public.ppm_organization_donors;
create policy "PPM admins manage organization donors" on public.ppm_organization_donors for all to authenticated
  using(public.ppm_role_matches(array['super_admin','org_admin'],'organization',organization_id))
  with check(public.ppm_role_matches(array['super_admin','org_admin'],'organization',organization_id));

drop policy if exists "PPM users read organization suppliers" on public.ppm_organization_suppliers;
create policy "PPM users read organization suppliers" on public.ppm_organization_suppliers for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM admins manage organization suppliers" on public.ppm_organization_suppliers;
create policy "PPM admins manage organization suppliers" on public.ppm_organization_suppliers for all to authenticated
  using(public.ppm_role_matches(array['super_admin','org_admin'],'organization',organization_id))
  with check(public.ppm_role_matches(array['super_admin','org_admin'],'organization',organization_id));

drop policy if exists "PPM users read organization units" on public.ppm_organization_units;
create policy "PPM users read organization units" on public.ppm_organization_units for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM admins manage organization units" on public.ppm_organization_units;
create policy "PPM admins manage organization units" on public.ppm_organization_units for all to authenticated
  using(public.ppm_role_matches(array['super_admin','org_admin'],'organization',organization_id))
  with check(public.ppm_role_matches(array['super_admin','org_admin'],'organization',organization_id));

-- Project-level additions ------------------------------------------------------------------------

-- Structured sites (replaces the comma-separated ppm_projects.sites text box in the UI). The
-- flat sites text[] column on ppm_projects is kept as-is for backward compatibility with any
-- existing reads elsewhere; the Identification form now writes both (names into sites[], full
-- detail here).
create table if not exists public.ppm_project_sites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  name text not null,
  accessibility text check(accessibility is null or accessibility in ('good','medium','poor')),
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ppm_project_sites_project on public.ppm_project_sites(project_id, sort_order);
alter table public.ppm_project_sites enable row level security;
drop policy if exists "PPM users read project sites" on public.ppm_project_sites;
create policy "PPM users read project sites" on public.ppm_project_sites for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage project sites" on public.ppm_project_sites;
create policy "PPM managers manage project sites" on public.ppm_project_sites for all to authenticated
  using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));

-- Activity journal — a manually-maintained, dated log of project events/decisions, distinct from
-- ppm_history (the automatic per-entity audit trail).
create table if not exists public.ppm_project_activity_journal (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  code text,
  entry_date date not null default current_date,
  category text check(category is null or category in ('milestone','decision','issue','meeting','field_visit','other')),
  title text not null,
  description text,
  author_name text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ppm_project_activity_journal_project on public.ppm_project_activity_journal(project_id, entry_date desc);
alter table public.ppm_project_activity_journal enable row level security;
drop policy if exists "PPM users read activity journal" on public.ppm_project_activity_journal;
create policy "PPM users read activity journal" on public.ppm_project_activity_journal for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage activity journal" on public.ppm_project_activity_journal;
create policy "PPM managers manage activity journal" on public.ppm_project_activity_journal for all to authenticated
  using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));

-- Role assignments: "other, please specify" support alongside the existing fixed PPM_ROLES list.
alter table public.ppm_role_assignments add column if not exists custom_role_label text;

-- Requirements: "other, please specify" support on the Type field.
alter table public.ppm_requirements drop constraint if exists ppm_requirements_type_check;
alter table public.ppm_requirements add constraint ppm_requirements_type_check check(type in (
  'contractual','donor','technical','functional','regulatory','quality','reporting',
  'environmental','social','security','operational','other'
));
alter table public.ppm_requirements add column if not exists type_other_detail text;

-- Deliverables: each deliverable now carries its own acceptance criteria, so accepting one means
-- checking it against its own identified criteria rather than a shared free-text list on the
-- scope statement.
alter table public.ppm_deliverables add column if not exists acceptance_criteria text;

-- Activities: a unique code, plus multi-output/multi-indicator linking (previously a single
-- output_id/indicator_id). The legacy singular columns are kept and synced to the first array
-- item, since achievement-reporting screens (MyActivitiesRegister, MyAchievementsRegister,
-- AchievementReviewInbox, IndicatorTrackingManager, the 360deg activity view) still read them.
-- Pre-existing activities are left with code = null (displayed via a computed ACT-XX fallback in
-- the UI, same convention as Indicators/Requirements) rather than backfilled, to avoid colliding
-- with the fresh ppm_next_sequence counter new activities will draw from.
alter table public.ppm_activities
  add column if not exists code text,
  add column if not exists output_ids uuid[] not null default '{}',
  add column if not exists indicator_ids uuid[] not null default '{}';
update public.ppm_activities set output_ids = array[output_id] where output_id is not null and output_ids = '{}';
update public.ppm_activities set indicator_ids = array[indicator_id] where indicator_id is not null and indicator_ids = '{}';
alter table public.ppm_activities drop constraint if exists ppm_activities_code_unique;
alter table public.ppm_activities add constraint ppm_activities_code_unique unique(project_id, code);

-- Stakeholders: "Position" becomes "Position actuelle" (same column, UI-only relabel) plus a new,
-- separate "Position souhaitee" (desired position); engagement strategy becomes a multi-select —
-- kept as a new array column, with any pre-existing free-text description carried over as a single
-- legacy entry rather than parsed (it was a free-form paragraph, not a structured list).
alter table public.ppm_stakeholders
  add column if not exists desired_position text check(desired_position is null or desired_position in ('champion','supporter','neutral','critic','blocker')),
  add column if not exists engagement_strategies text[] not null default '{}';
update public.ppm_stakeholders set engagement_strategies = array[engagement_strategy] where engagement_strategy is not null and engagement_strategy <> '' and engagement_strategies = '{}';
