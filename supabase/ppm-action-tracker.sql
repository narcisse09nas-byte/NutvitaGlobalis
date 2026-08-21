-- Execution add-on, Phase L: Action Tracker Central (spec section 28) — a single registry for
-- follow-up actions raised from any module (achievement, meeting, communication, quality, NCR,
-- risk, issue, audit, stakeholder, management decision), referenced loosely via source_type/
-- source_id rather than one FK per possible origin.
-- Run after ppm-communication-stakeholder-actuals.sql (reuses public.ppm_project_access).

create table if not exists public.ppm_actions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  source_type text not null default 'other' check(source_type in (
    'achievement','meeting','communication','quality','ncr','risk','issue','audit',
    'stakeholder','management_decision','other'
  )),
  source_id uuid,
  source_label text,
  description text not null,
  responsible_name text,
  priority text not null default 'medium' check(priority in ('low','medium','high','critical')),
  due_date date,
  status text not null default 'open' check(status in ('open','in_progress','completed','verified','closed')),
  progress_percent numeric(5,2),
  evidence_note text,
  validated_by_name text,
  validated_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ppm_actions_project on public.ppm_actions(project_id,status);
create index if not exists ppm_actions_source on public.ppm_actions(source_type,source_id);

alter table public.ppm_actions enable row level security;

drop policy if exists "PPM users read actions" on public.ppm_actions;
create policy "PPM users read actions" on public.ppm_actions for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM project members manage actions" on public.ppm_actions;
create policy "PPM project members manage actions" on public.ppm_actions for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));
