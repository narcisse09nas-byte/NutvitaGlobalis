-- Sprint 11: Budget management. Sprint 12: Resource management.
-- Run after ppm-pdm-activities.sql (reuses public.ppm_project_access).

-- Multi-level budget line: Bailleur -> Grant -> Projet -> Composante (wbs_node) -> Activite ->
-- Ligne budgetaire (spec section 16). wbs_node_id/activity_id are both nullable so a line can
-- sit at whichever level it actually belongs to.
create table if not exists public.ppm_budget_lines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  wbs_node_id uuid references public.ppm_wbs_nodes(id) on delete set null,
  activity_id uuid references public.ppm_activities(id) on delete set null,
  cost_category text,
  sub_category text,
  donor_name text,
  grant_reference text,
  description text not null,
  initial_budget numeric(14,2) not null default 0,
  revised_budget numeric(14,2),
  committed_amount numeric(14,2) not null default 0,
  spent_amount numeric(14,2) not null default 0,
  forecast_amount numeric(14,2),
  currency text default 'XAF',
  exchange_rate numeric(12,4) default 1,
  period_start date,
  period_end date,
  status text not null default 'active' check(status in ('draft','active','on_hold','closed','cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ppm_resources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  type text not null default 'human' check(type in ('human','consultant','equipment','vehicle','infrastructure')),
  name text not null,
  role_title text,
  skills text[] not null default '{}',
  availability_percent numeric(5,2) check(availability_percent between 0 and 100),
  weekly_capacity_hours numeric(6,2),
  cost_rate numeric(14,2),
  cost_unit text default 'day' check(cost_unit in ('hour','day','week','month','flat')),
  currency text default 'XAF',
  status text not null default 'active' check(status in ('draft','active','on_hold','closed','cancelled')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ppm_resource_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  resource_id uuid not null references public.ppm_resources(id) on delete cascade,
  activity_id uuid references public.ppm_activities(id) on delete set null,
  wbs_node_id uuid references public.ppm_wbs_nodes(id) on delete set null,
  allocation_percent numeric(5,2) check(allocation_percent between 0 and 100),
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists ppm_budget_lines_project on public.ppm_budget_lines(project_id);
create index if not exists ppm_budget_lines_wbs on public.ppm_budget_lines(wbs_node_id);
create index if not exists ppm_budget_lines_activity on public.ppm_budget_lines(activity_id);
create index if not exists ppm_resources_project on public.ppm_resources(project_id);
create index if not exists ppm_resource_assignments_project on public.ppm_resource_assignments(project_id,resource_id);

alter table public.ppm_budget_lines enable row level security;
alter table public.ppm_resources enable row level security;
alter table public.ppm_resource_assignments enable row level security;

drop policy if exists "PPM users read budget lines" on public.ppm_budget_lines;
create policy "PPM users read budget lines" on public.ppm_budget_lines for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage budget lines" on public.ppm_budget_lines;
create policy "PPM managers manage budget lines" on public.ppm_budget_lines for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));

drop policy if exists "PPM users read resources" on public.ppm_resources;
create policy "PPM users read resources" on public.ppm_resources for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage resources" on public.ppm_resources;
create policy "PPM managers manage resources" on public.ppm_resources for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));

drop policy if exists "PPM users read resource assignments" on public.ppm_resource_assignments;
create policy "PPM users read resource assignments" on public.ppm_resource_assignments for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage resource assignments" on public.ppm_resource_assignments;
create policy "PPM managers manage resource assignments" on public.ppm_resource_assignments for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));
