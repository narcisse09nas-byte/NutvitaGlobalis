-- Sprint 15: Risk Register + Issues (kept as two separate tables per spec section 19:
-- "Separer les Risques des Issues/Problemes").
-- Run after ppm-procurement-quality.sql (reuses public.ppm_project_access).

create table if not exists public.ppm_risks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  work_package_id uuid references public.ppm_wbs_nodes(id) on delete set null,
  code text,
  title text not null,
  category text,
  cause text,
  event text,
  consequence text,
  probability integer not null default 3 check(probability between 1 and 5),
  impact integer not null default 3 check(impact between 1 and 5),
  owner_name text,
  response_strategy text check(response_strategy in ('avoid','mitigate','transfer','accept')),
  mitigation_plan text,
  deadline date,
  cost numeric(14,2),
  residual_probability integer check(residual_probability between 1 and 5),
  residual_impact integer check(residual_impact between 1 and 5),
  status text not null default 'open' check(status in ('open','monitoring','closed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ppm_issues (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  work_package_id uuid references public.ppm_wbs_nodes(id) on delete set null,
  activity_id uuid references public.ppm_activities(id) on delete set null,
  title text not null,
  description text,
  category text,
  raised_by_name text,
  priority text not null default 'medium' check(priority in ('low','medium','high','critical')),
  owner_name text,
  resolution_plan text,
  due_date date,
  status text not null default 'open' check(status in ('open','in_progress','resolved','closed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ppm_risks_project on public.ppm_risks(project_id,status);
create index if not exists ppm_issues_project on public.ppm_issues(project_id,status);

alter table public.ppm_risks enable row level security;
alter table public.ppm_issues enable row level security;

drop policy if exists "PPM users read risks" on public.ppm_risks;
create policy "PPM users read risks" on public.ppm_risks for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage risks" on public.ppm_risks;
create policy "PPM managers manage risks" on public.ppm_risks for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));

drop policy if exists "PPM users read issues" on public.ppm_issues;
create policy "PPM users read issues" on public.ppm_issues for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage issues" on public.ppm_issues;
create policy "PPM managers manage issues" on public.ppm_issues for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));
