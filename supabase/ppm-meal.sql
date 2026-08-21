-- Sprint 17: MEAL — Monitoring, Evaluation, Accountability, Learning (spec section 23).
-- Run after ppm-stakeholders-communication.sql (reuses public.ppm_project_access).

-- Periodic measurement of indicators defined in Sprint 6 (public.ppm_indicators): one row per
-- reporting period per indicator, keeping the indicator's own baseline/target/current_value as
-- the "latest known" summary while this table keeps the full time series.
create table if not exists public.ppm_meal_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  indicator_id uuid not null references public.ppm_indicators(id) on delete cascade,
  period_label text not null,
  period_start date,
  period_end date,
  target_value numeric(14,2),
  actual_value numeric(14,2),
  data_source text,
  collected_by_name text,
  collection_date date,
  comments text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ppm_evaluations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  type text not null default 'midline' check(type in ('baseline','midline','endline','final','ex_post')),
  title text not null,
  planned_date date,
  actual_date date,
  methodology text,
  key_findings text,
  recommendations text,
  status text not null default 'planned' check(status in ('planned','ongoing','completed','cancelled')),
  report_path text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Accountability to affected populations: complaints/feedback register (spec section 23).
create table if not exists public.ppm_feedback_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  source_name text,
  category text not null default 'feedback' check(category in ('complaint','suggestion','feedback','question')),
  channel text,
  description text not null,
  is_sensitive boolean not null default false,
  status text not null default 'received' check(status in ('received','under_review','resolved','closed')),
  response text,
  resolved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ppm_lessons_learned (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  category text,
  context text,
  description text not null,
  recommendation text,
  created_by_name text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ppm_meal_entries_project on public.ppm_meal_entries(project_id,indicator_id);
create index if not exists ppm_evaluations_project on public.ppm_evaluations(project_id,status);
create index if not exists ppm_feedback_entries_project on public.ppm_feedback_entries(project_id,status);
create index if not exists ppm_lessons_learned_project on public.ppm_lessons_learned(project_id);

alter table public.ppm_meal_entries enable row level security;
alter table public.ppm_evaluations enable row level security;
alter table public.ppm_feedback_entries enable row level security;
alter table public.ppm_lessons_learned enable row level security;

drop policy if exists "PPM users read meal entries" on public.ppm_meal_entries;
create policy "PPM users read meal entries" on public.ppm_meal_entries for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage meal entries" on public.ppm_meal_entries;
create policy "PPM managers manage meal entries" on public.ppm_meal_entries for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));

drop policy if exists "PPM users read evaluations" on public.ppm_evaluations;
create policy "PPM users read evaluations" on public.ppm_evaluations for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage evaluations" on public.ppm_evaluations;
create policy "PPM managers manage evaluations" on public.ppm_evaluations for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));

drop policy if exists "PPM users read feedback entries" on public.ppm_feedback_entries;
create policy "PPM users read feedback entries" on public.ppm_feedback_entries for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage feedback entries" on public.ppm_feedback_entries;
create policy "PPM managers manage feedback entries" on public.ppm_feedback_entries for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));

drop policy if exists "PPM users read lessons learned" on public.ppm_lessons_learned;
create policy "PPM users read lessons learned" on public.ppm_lessons_learned for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage lessons learned" on public.ppm_lessons_learned;
create policy "PPM managers manage lessons learned" on public.ppm_lessons_learned for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));
