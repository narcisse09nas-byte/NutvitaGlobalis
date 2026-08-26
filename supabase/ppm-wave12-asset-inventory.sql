-- Project Asset Management, Wave C: physical inventory — periodic count sessions reconciling
-- against the project's currently-active registered assets. A pure observation log: does not
-- auto-mutate the asset's own status/condition_notes.
-- Run after ppm-wave10-asset-registration.sql.

create table if not exists public.ppm_asset_inventory_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  code text,
  title text not null,
  count_date date not null default current_date,
  status text not null default 'draft' check(status in ('draft','in_progress','completed','cancelled')),
  conducted_by_name text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.ppm_asset_inventory_lines (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ppm_asset_inventory_sessions(id) on delete cascade,
  resource_id uuid not null references public.ppm_resources(id) on delete cascade,
  count_status text not null default 'pending' check(count_status in ('pending','found','not_found','misplaced')),
  condition_observed text,
  location_observed text,
  discrepancy_note text,
  counted_by_name text,
  counted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists ppm_asset_inventory_sessions_code_unique on public.ppm_asset_inventory_sessions(project_id, code) where code is not null;
create index if not exists ppm_asset_inventory_sessions_project on public.ppm_asset_inventory_sessions(project_id, status);
create index if not exists ppm_asset_inventory_lines_session on public.ppm_asset_inventory_lines(session_id, count_status);
create index if not exists ppm_asset_inventory_lines_resource on public.ppm_asset_inventory_lines(resource_id);

alter table public.ppm_asset_inventory_sessions enable row level security;
alter table public.ppm_asset_inventory_lines enable row level security;

drop policy if exists "PPM users read asset inventory sessions" on public.ppm_asset_inventory_sessions;
create policy "PPM users read asset inventory sessions" on public.ppm_asset_inventory_sessions for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage asset inventory sessions" on public.ppm_asset_inventory_sessions;
create policy "PPM managers manage asset inventory sessions" on public.ppm_asset_inventory_sessions for all to authenticated
  using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));

drop policy if exists "PPM users read asset inventory lines" on public.ppm_asset_inventory_lines;
create policy "PPM users read asset inventory lines" on public.ppm_asset_inventory_lines for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage asset inventory lines" on public.ppm_asset_inventory_lines;
create policy "PPM managers manage asset inventory lines" on public.ppm_asset_inventory_lines for all to authenticated using(
  exists(select 1 from public.ppm_asset_inventory_sessions s where s.id = session_id and public.ppm_project_access(s.project_id))
) with check(
  exists(select 1 from public.ppm_asset_inventory_sessions s where s.id = session_id and public.ppm_project_access(s.project_id))
);
