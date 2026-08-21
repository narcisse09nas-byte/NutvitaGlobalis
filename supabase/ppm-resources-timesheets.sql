-- Execution add-on, Phase J: Resource Actuals — Timesheets + Equipment checkouts (spec
-- section 23). The Resource Plan (Sprint 12: ppm_resources, ppm_resource_assignments) stays
-- the Planned layer; these two tables are its Reported/Actual counterpart.
-- Run after ppm-procurement-receipts.sql (reuses public.ppm_project_access).

create table if not exists public.ppm_timesheets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  resource_id uuid references public.ppm_resources(id) on delete set null,
  work_package_id uuid references public.ppm_wbs_nodes(id) on delete set null,
  activity_id uuid references public.ppm_activities(id) on delete set null,
  entry_date date not null,
  hours numeric(5,2) not null,
  description text,
  status text not null default 'draft' check(status in ('draft','submitted','approved','rejected')),
  approved_by_name text,
  approved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ppm_equipment_checkouts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  resource_id uuid not null references public.ppm_resources(id) on delete cascade,
  activity_id uuid references public.ppm_activities(id) on delete set null,
  user_name text,
  checkout_date date,
  expected_return_date date,
  actual_return_date date,
  condition_out text,
  condition_in text,
  incident_note text,
  status text not null default 'checked_out' check(status in ('checked_out','returned','lost','damaged')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ppm_timesheets_project on public.ppm_timesheets(project_id,status);
create index if not exists ppm_timesheets_created_by on public.ppm_timesheets(created_by);
create index if not exists ppm_equipment_checkouts_resource on public.ppm_equipment_checkouts(resource_id,status);

alter table public.ppm_timesheets enable row level security;
alter table public.ppm_equipment_checkouts enable row level security;

drop policy if exists "PPM users read timesheets" on public.ppm_timesheets;
create policy "PPM users read timesheets" on public.ppm_timesheets for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM project members manage timesheets" on public.ppm_timesheets;
create policy "PPM project members manage timesheets" on public.ppm_timesheets for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));

drop policy if exists "PPM users read equipment checkouts" on public.ppm_equipment_checkouts;
create policy "PPM users read equipment checkouts" on public.ppm_equipment_checkouts for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM project members manage equipment checkouts" on public.ppm_equipment_checkouts;
create policy "PPM project members manage equipment checkouts" on public.ppm_equipment_checkouts for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));
