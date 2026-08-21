-- EVM add-on, Wave 2: Performance Measurement Baseline (PMB) versioning + Milestone-Weighted
-- EV method. Run after ppm-evm.sql (reuses public.ppm_project_access).
-- ScopeBaseline (Sprint 8) only versions scope text, never WBS/budget amounts, so a true
-- combined PMB needs its own versioned snapshot rather than reusing it.

alter table public.ppm_activities add column if not exists milestone_weights jsonb not null default '[]'::jsonb;
alter table public.ppm_activities drop constraint if exists ppm_activities_ev_method_check;
alter table public.ppm_activities add constraint ppm_activities_ev_method_check check(ev_method in (
  '0_100','50_50','20_80','percent_complete','units_complete','milestone_weighted'
));

create table if not exists public.ppm_pmb_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  version integer not null,
  status text not null default 'draft' check(status in ('draft','approved','superseded')),
  bac numeric(14,2),
  note text,
  change_request_id uuid references public.ppm_change_requests(id) on delete set null,
  approved_by_name text,
  approved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, version)
);

-- One frozen row per Work Package at the time a PMB version was created — never edited after
-- the fact, only superseded by a later version (spec: "ne jamais ecraser l'ancienne baseline").
create table if not exists public.ppm_pmb_work_package_snapshots (
  id uuid primary key default gen_random_uuid(),
  pmb_version_id uuid not null references public.ppm_pmb_versions(id) on delete cascade,
  work_package_id uuid references public.ppm_wbs_nodes(id) on delete set null,
  title text,
  bac numeric(14,2),
  planned_start date,
  planned_end date,
  created_at timestamptz not null default now()
);

create index if not exists ppm_pmb_versions_project on public.ppm_pmb_versions(project_id,status);
create index if not exists ppm_pmb_wp_snapshots_version on public.ppm_pmb_work_package_snapshots(pmb_version_id);

alter table public.ppm_pmb_versions enable row level security;
alter table public.ppm_pmb_work_package_snapshots enable row level security;

drop policy if exists "PPM users read pmb versions" on public.ppm_pmb_versions;
create policy "PPM users read pmb versions" on public.ppm_pmb_versions for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM project members manage pmb versions" on public.ppm_pmb_versions;
create policy "PPM project members manage pmb versions" on public.ppm_pmb_versions for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));

drop policy if exists "PPM users read pmb wp snapshots" on public.ppm_pmb_work_package_snapshots;
create policy "PPM users read pmb wp snapshots" on public.ppm_pmb_work_package_snapshots for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM project members manage pmb wp snapshots" on public.ppm_pmb_work_package_snapshots;
create policy "PPM project members manage pmb wp snapshots" on public.ppm_pmb_work_package_snapshots for all to authenticated using(
  exists(select 1 from public.ppm_pmb_versions v where v.id = pmb_version_id and public.ppm_project_access(v.project_id))
) with check(
  exists(select 1 from public.ppm_pmb_versions v where v.id = pmb_version_id and public.ppm_project_access(v.project_id))
);
