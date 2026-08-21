-- EVM add-on, Wave 1: Earned Value Management core (settings, time-phased budget, snapshots).
-- Run after ppm-action-tracker.sql (reuses public.ppm_project_access).
-- EVM is opt-in per project (ppm_evm_settings.enabled) — never imposed on simple projects.

alter table public.ppm_activities add column if not exists ev_method text not null default 'percent_complete'
  check(ev_method in ('0_100','50_50','20_80','percent_complete','units_complete'));

create table if not exists public.ppm_evm_settings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.ppm_projects(id) on delete cascade,
  enabled boolean not null default false,
  ev_method_default text not null default 'percent_complete' check(ev_method_default in ('0_100','50_50','20_80','percent_complete','units_complete')),
  control_level text not null default 'work_package' check(control_level in ('work_package','activity')),
  status_date date not null default current_date,
  reporting_frequency text check(reporting_frequency in ('weekly','monthly','quarterly')),
  spi_threshold_green numeric(4,2) not null default 0.95,
  spi_threshold_orange numeric(4,2) not null default 0.85,
  cpi_threshold_green numeric(4,2) not null default 0.95,
  cpi_threshold_orange numeric(4,2) not null default 0.85,
  responsible_name text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per Work Package per month. The sum across a Work Package's rows is expected to
-- equal its BAC (sum of public.ppm_budget_lines for that wbs_node_id) — validated in the UI,
-- not enforced at the DB level, since a PM may legitimately save a work-in-progress breakdown.
create table if not exists public.ppm_time_phased_budgets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  work_package_id uuid not null references public.ppm_wbs_nodes(id) on delete cascade,
  period_date date not null,
  planned_amount numeric(14,2) not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(work_package_id, period_date)
);

create table if not exists public.ppm_evm_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  scope text not null default 'project' check(scope in ('project','work_package')),
  scope_id uuid,
  status_date date not null,
  bac numeric(14,2),
  pv numeric(14,2),
  ev numeric(14,2),
  ac numeric(14,2),
  sv numeric(14,2),
  cv numeric(14,2),
  spi numeric(6,3),
  cpi numeric(6,3),
  eac numeric(14,2),
  eac_method text,
  etc numeric(14,2),
  vac numeric(14,2),
  tcpi numeric(6,3),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ppm_time_phased_budgets_wp on public.ppm_time_phased_budgets(work_package_id,period_date);
create index if not exists ppm_evm_snapshots_project on public.ppm_evm_snapshots(project_id,scope,scope_id,status_date);

alter table public.ppm_evm_settings enable row level security;
alter table public.ppm_time_phased_budgets enable row level security;
alter table public.ppm_evm_snapshots enable row level security;

drop policy if exists "PPM users read evm settings" on public.ppm_evm_settings;
create policy "PPM users read evm settings" on public.ppm_evm_settings for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM project members manage evm settings" on public.ppm_evm_settings;
create policy "PPM project members manage evm settings" on public.ppm_evm_settings for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));

drop policy if exists "PPM users read time phased budgets" on public.ppm_time_phased_budgets;
create policy "PPM users read time phased budgets" on public.ppm_time_phased_budgets for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM project members manage time phased budgets" on public.ppm_time_phased_budgets;
create policy "PPM project members manage time phased budgets" on public.ppm_time_phased_budgets for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));

drop policy if exists "PPM users read evm snapshots" on public.ppm_evm_snapshots;
create policy "PPM users read evm snapshots" on public.ppm_evm_snapshots for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM project members manage evm snapshots" on public.ppm_evm_snapshots;
create policy "PPM project members manage evm snapshots" on public.ppm_evm_snapshots for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));
