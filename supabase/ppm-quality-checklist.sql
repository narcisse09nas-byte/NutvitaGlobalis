-- Execution add-on, Phase H: Quality Actuals (spec section 22) — a checklist + score + evidence
-- layered onto the existing Quality Requirement (Sprint 14) rather than a parallel table.
-- Run after ppm-expenses.sql (reuses public.ppm_project_access).

alter table public.ppm_quality_requirements drop constraint if exists ppm_quality_requirements_result_check;
alter table public.ppm_quality_requirements add constraint ppm_quality_requirements_result_check check(result in ('pending','conforme','non_conforme','non_applicable'));

-- Checklist criteria: [{criterion, result: 'conforme'|'non_conforme'|'non_applicable', comment}].
-- Kept as JSONB (not a child table) since criteria are edited as one unit alongside the
-- control and never queried independently — same reasoning as beneficiaries_breakdown.
alter table public.ppm_quality_requirements add column if not exists checklist jsonb not null default '[]'::jsonb;
alter table public.ppm_quality_requirements add column if not exists score numeric(5,2);

create table if not exists public.ppm_quality_evidence (
  id uuid primary key default gen_random_uuid(),
  quality_requirement_id uuid not null references public.ppm_quality_requirements(id) on delete cascade,
  title text not null,
  category text not null default 'document' check(category in ('report','photo','checklist','video','document','other')),
  file_path text,
  description text,
  uploaded_by_name text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ppm_quality_evidence_requirement on public.ppm_quality_evidence(quality_requirement_id);

alter table public.ppm_quality_evidence enable row level security;

drop policy if exists "PPM users read quality evidence" on public.ppm_quality_evidence;
create policy "PPM users read quality evidence" on public.ppm_quality_evidence for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM project members manage quality evidence" on public.ppm_quality_evidence;
create policy "PPM project members manage quality evidence" on public.ppm_quality_evidence for all to authenticated using(
  exists(select 1 from public.ppm_quality_requirements q where q.id = quality_requirement_id and public.ppm_project_access(q.project_id))
) with check(
  exists(select 1 from public.ppm_quality_requirements q where q.id = quality_requirement_id and public.ppm_project_access(q.project_id))
);
