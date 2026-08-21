-- Sprint 6: Cadre de resultats (Impact -> Outcome -> Output -> Indicator) + Gouvernance + RACI.
-- Run after ppm-project-cadrage.sql.

create table if not exists public.ppm_result_chains (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  parent_id uuid references public.ppm_result_chains(id) on delete cascade,
  level text not null check(level in ('impact','outcome','output')),
  title text not null,
  description text,
  order_index integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ppm_indicators (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  result_chain_id uuid references public.ppm_result_chains(id) on delete set null,
  code text,
  name text not null,
  definition text,
  unit text,
  baseline numeric,
  target numeric,
  current_value numeric,
  verification_source text,
  frequency text,
  responsible_name text,
  disaggregations text[] not null default '{}',
  comments text,
  status text not null default 'active' check(status in ('draft','active','on_hold','closed','cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ppm_governance_roles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  role_type text not null check(role_type in ('sponsor','steering_committee','project_director','project_manager','technical_lead','finance','procurement','meal','qa','other')),
  role_label text,
  name text not null,
  email text,
  organization text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.ppm_raci_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  area text not null,
  governance_role_id uuid not null references public.ppm_governance_roles(id) on delete cascade,
  raci_type text not null check(raci_type in ('R','A','C','I')),
  created_at timestamptz not null default now(),
  unique(project_id,area,governance_role_id)
);

create index if not exists ppm_result_chains_project on public.ppm_result_chains(project_id,parent_id);
create index if not exists ppm_indicators_project on public.ppm_indicators(project_id);
create index if not exists ppm_governance_roles_project on public.ppm_governance_roles(project_id);
create index if not exists ppm_raci_entries_project on public.ppm_raci_entries(project_id,area);

alter table public.ppm_result_chains enable row level security;
alter table public.ppm_indicators enable row level security;
alter table public.ppm_governance_roles enable row level security;
alter table public.ppm_raci_entries enable row level security;

-- Shared project-scoped access check, reused by every Sprint 6+ table below.
create or replace function public.ppm_project_access(p_project_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.ppm_projects p where p.id = p_project_id and (
    public.ppm_role_matches(array['super_admin','org_admin'],'organization',p.organization_id)
    or public.ppm_role_matches(array['portfolio_manager'],'portfolio',p.portfolio_id)
    or (p.program_id is not null and public.ppm_role_matches(array['program_manager'],'program',p.program_id))
    or public.ppm_role_matches(array['project_manager','project_officer'],'project',p.id)
  ));
$$;

drop policy if exists "PPM users read result chains" on public.ppm_result_chains;
create policy "PPM users read result chains" on public.ppm_result_chains for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage result chains" on public.ppm_result_chains;
create policy "PPM managers manage result chains" on public.ppm_result_chains for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));

drop policy if exists "PPM users read indicators" on public.ppm_indicators;
create policy "PPM users read indicators" on public.ppm_indicators for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage indicators" on public.ppm_indicators;
create policy "PPM managers manage indicators" on public.ppm_indicators for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));

drop policy if exists "PPM users read governance roles" on public.ppm_governance_roles;
create policy "PPM users read governance roles" on public.ppm_governance_roles for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage governance roles" on public.ppm_governance_roles;
create policy "PPM managers manage governance roles" on public.ppm_governance_roles for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));

drop policy if exists "PPM users read raci entries" on public.ppm_raci_entries;
create policy "PPM users read raci entries" on public.ppm_raci_entries for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage raci entries" on public.ppm_raci_entries;
create policy "PPM managers manage raci entries" on public.ppm_raci_entries for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));
