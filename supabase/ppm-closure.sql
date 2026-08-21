-- Sprint 23: Project closure workflow (spec section: cloture — verification perimetre,
-- cloture procurement/contrats/financiere, evaluation finale, lessons learned, handover,
-- archivage). One row per project; the checklist booleans are confirmed manually by the PM
-- while the underlying stats (deliverables, procurement, budget) are computed live in the UI
-- from tables that already exist (sprints 11-19) rather than duplicated here.
-- Run after ppm-notifications-approvals.sql (reuses public.ppm_project_access).

create table if not exists public.ppm_project_closures (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.ppm_projects(id) on delete cascade,
  scope_verified boolean not null default false,
  scope_verification_note text,
  procurement_closed boolean not null default false,
  procurement_closure_note text,
  financial_closed boolean not null default false,
  financial_closure_note text,
  final_evaluation_id uuid references public.ppm_evaluations(id) on delete set null,
  handover_to_name text,
  handover_to_organization text,
  handover_date date,
  handover_notes text,
  archive_reference text,
  status text not null default 'draft' check(status in ('draft','in_progress','completed')),
  closed_by_name text,
  closed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ppm_project_closures enable row level security;

drop policy if exists "PPM users read project closures" on public.ppm_project_closures;
create policy "PPM users read project closures" on public.ppm_project_closures for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage project closures" on public.ppm_project_closures;
create policy "PPM managers manage project closures" on public.ppm_project_closures for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));
