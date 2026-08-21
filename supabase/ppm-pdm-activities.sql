-- Sprint 9: PDM + activites + taches. Sprint 10 (Gantt/calendrier/Kanban) reuses this same
-- table as three different views — no additional schema needed for those.
-- Run after ppm-wbs-baseline-change.sql and ppm-results-governance.sql.

-- Work Package -> Activite -> Sous-activite -> Tache is modelled as one self-referencing
-- table (kind + parent_id) rather than three separate tables, consistent with the
-- ppm_wbs_nodes tree pattern from Sprint 7.
create table if not exists public.ppm_activities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  work_package_id uuid references public.ppm_wbs_nodes(id) on delete set null,
  parent_id uuid references public.ppm_activities(id) on delete cascade,
  kind text not null default 'activity' check(kind in ('activity','sub_activity','task')),
  title text not null,
  description text,
  output_id uuid references public.ppm_result_chains(id) on delete set null,
  responsible_name text,
  co_responsible text[] not null default '{}',
  location text,
  target_population text,
  beneficiaries integer,
  planned_start date,
  planned_end date,
  actual_start date,
  actual_end date,
  is_milestone boolean not null default false,
  planned_budget numeric(14,2),
  actual_expense numeric(14,2),
  progress_percent numeric(5,2) check(progress_percent between 0 and 100),
  status text not null default 'not_started' check(status in ('not_started','in_progress','completed','delayed','blocked','cancelled')),
  indicator_id uuid references public.ppm_indicators(id) on delete set null,
  target_value text,
  deliverable text,
  evidence_path text,
  risk_note text,
  comment text,
  delay_reason text,
  corrective_action text,
  new_deadline date,
  order_index integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ppm_activities_project on public.ppm_activities(project_id,parent_id,order_index);
create index if not exists ppm_activities_work_package on public.ppm_activities(work_package_id);
create index if not exists ppm_activities_dates on public.ppm_activities(project_id,planned_start,planned_end);

alter table public.ppm_activities enable row level security;

drop policy if exists "PPM users read activities" on public.ppm_activities;
create policy "PPM users read activities" on public.ppm_activities for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage activities" on public.ppm_activities;
create policy "PPM managers manage activities" on public.ppm_activities for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));
