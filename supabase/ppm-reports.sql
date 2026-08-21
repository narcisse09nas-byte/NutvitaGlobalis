-- Sprint 19: Reporting engine (spec section 26) — structured narrative + financial reports.
-- Run after ppm-deliverables-documents.sql (reuses public.ppm_project_access).
-- Sprint 20's consolidated dashboards are pure read-time aggregations over existing tables
-- (budget, risks, procurement, quality, activities, indicators) and need no table of their own.

create table if not exists public.ppm_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  type text not null default 'monthly' check(type in (
    'weekly','monthly','quarterly','donor','steering_committee','final','custom'
  )),
  title text not null,
  period_start date,
  period_end date,
  summary text,
  achievements text,
  challenges text,
  next_steps text,
  financial_summary text,
  generated_by_name text,
  status text not null default 'draft' check(status in ('draft','final','submitted')),
  file_path text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ppm_reports_project on public.ppm_reports(project_id,type);

alter table public.ppm_reports enable row level security;

drop policy if exists "PPM users read reports" on public.ppm_reports;
create policy "PPM users read reports" on public.ppm_reports for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage reports" on public.ppm_reports;
create policy "PPM managers manage reports" on public.ppm_reports for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));
