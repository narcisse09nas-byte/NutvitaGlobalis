-- Sprint 7: WBS 4 niveaux + WBS Dictionary. Sprint 8: Scope Baseline + Change Control.
-- Run after ppm-results-governance.sql (reuses public.ppm_project_access).

-- The first arbitrary-depth tree in this codebase: self-referencing parent_id + explicit
-- level (1-4) + order_index for sibling ordering. Codes ("1.1.1.2") are computed on read
-- from the tree shape, never stored, so reordering/inserting nodes never requires a
-- renumbering pass.
create table if not exists public.ppm_wbs_nodes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  parent_id uuid references public.ppm_wbs_nodes(id) on delete cascade,
  level integer not null check(level between 1 and 4),
  title text not null,
  order_index integer not null default 0,
  -- WBS Dictionary (spec section 13) — most meaningful at level 4 (Work Package), but kept
  -- on every level so a composante/sous-composante can also carry a short description.
  description text,
  scope_included text,
  scope_excluded text,
  responsible_name text,
  expected_result text,
  deliverables text,
  acceptance_criteria text,
  estimated_duration_days integer,
  estimated_cost numeric(14,2),
  status text not null default 'active' check(status in ('draft','active','on_hold','closed','cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Scope Statement (Sprint 5) + WBS + WBS Dictionary = Scope Baseline (spec section 14).
-- Draft -> Review -> Approved -> Baseline; once at "baseline" the WBS/dictionary/scope
-- statement are locked in the UI and further changes must go through a Change Request.
create table if not exists public.ppm_scope_baselines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  version integer not null default 1,
  status text not null default 'draft' check(status in ('draft','review','approved','baseline')),
  note text,
  approved_by_name text,
  approved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id,version)
);

create table if not exists public.ppm_change_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  title text not null,
  description text,
  requested_by_name text,
  impact_scope text,
  impact_schedule text,
  impact_budget text,
  impact_resources text,
  impact_procurement text,
  impact_indicators text,
  impact_risks text,
  impact_quality text,
  status text not null default 'draft' check(status in ('draft','submitted','impact_assessed','approved','rejected','implemented')),
  decision_note text,
  decided_by_name text,
  decided_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ppm_wbs_nodes_project on public.ppm_wbs_nodes(project_id,parent_id,order_index);
create index if not exists ppm_scope_baselines_project on public.ppm_scope_baselines(project_id,version desc);
create index if not exists ppm_change_requests_project on public.ppm_change_requests(project_id,created_at desc);

alter table public.ppm_wbs_nodes enable row level security;
alter table public.ppm_scope_baselines enable row level security;
alter table public.ppm_change_requests enable row level security;

drop policy if exists "PPM users read wbs nodes" on public.ppm_wbs_nodes;
create policy "PPM users read wbs nodes" on public.ppm_wbs_nodes for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage wbs nodes" on public.ppm_wbs_nodes;
create policy "PPM managers manage wbs nodes" on public.ppm_wbs_nodes for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));

drop policy if exists "PPM users read scope baselines" on public.ppm_scope_baselines;
create policy "PPM users read scope baselines" on public.ppm_scope_baselines for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage scope baselines" on public.ppm_scope_baselines;
create policy "PPM managers manage scope baselines" on public.ppm_scope_baselines for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));

drop policy if exists "PPM users read change requests" on public.ppm_change_requests;
create policy "PPM users read change requests" on public.ppm_change_requests for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage change requests" on public.ppm_change_requests;
create policy "PPM managers manage change requests" on public.ppm_change_requests for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));
