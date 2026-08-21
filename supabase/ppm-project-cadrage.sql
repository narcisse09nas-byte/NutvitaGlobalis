-- Sprints 3-5: Creation du projet + fiche projet, Cadrage (Identification + Contexte +
-- Project Charter), Requirements Register + Scope Statement.
-- Run after ppm-organization-portfolio-program.sql.

create table if not exists public.ppm_projects (
  id uuid primary key default gen_random_uuid(),
  -- Identification (spec 7.1)
  name text not null,
  code text,
  acronym text,
  short_description text,
  type text not null default 'other' check(type in ('development','humanitarian','health','nutrition','food_security','research','other')),
  priority text not null default 'medium' check(priority in ('low','medium','high','critical')),
  portfolio_id uuid not null references public.ppm_portfolios(id) on delete cascade,
  program_id uuid references public.ppm_programs(id) on delete set null,
  organization_id uuid not null references public.ppm_organizations(id) on delete cascade,
  project_manager_name text,
  project_manager_email text,
  sponsor_name text,
  sponsor_email text,
  responsible_unit text,
  start_date date,
  end_date date,
  duration_months integer,
  country text,
  regions text[] not null default '{}',
  sites text[] not null default '{}',
  target_population text,
  direct_beneficiaries integer,
  indirect_beneficiaries integer,
  donor_name text,
  grant_award_id text,
  total_budget numeric(14,2),
  currency text default 'XAF',
  -- Contexte & justification (spec 7.2)
  context text,
  central_problem text,
  identified_needs text,
  available_data text,
  causes text,
  consequences text,
  justification text,
  opportunity text,
  expected_benefits text,
  strategic_alignment text,
  national_alignment text,
  sdgs text[] not null default '{}',
  added_value text,
  -- Lifecycle
  status text not null default 'draft' check(status in ('draft','active','on_hold','closed','cancelled')),
  progress_percent numeric(5,2) check(progress_percent between 0 and 100),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Versioned Project Charter (spec 7.3). Only the latest version of an approved chain is
-- editable in draft form; an approved charter is locked and a new version is created for
-- further changes, preserving full history per project.
create table if not exists public.ppm_project_charters (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  version integer not null default 1,
  status text not null default 'draft' check(status in ('draft','under_review','approved')),
  purpose text,
  overall_objective text,
  specific_objectives text[] not null default '{}',
  expected_results text,
  key_deliverables text[] not null default '{}',
  high_level_scope text,
  indicative_budget numeric(14,2),
  timeline_summary text,
  initial_risks text,
  assumptions text,
  constraints text,
  key_stakeholders text,
  project_manager_authority text,
  governance text,
  success_criteria text,
  prepared_by_name text,
  reviewed_by_name text,
  approved_by_name text,
  approved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id,version)
);

create table if not exists public.ppm_requirements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  title text not null,
  description text,
  source text,
  source_stakeholder text,
  type text not null default 'functional' check(type in (
    'contractual','donor','technical','functional','regulatory','quality','reporting',
    'environmental','social','security','operational'
  )),
  priority text not null default 'medium' check(priority in ('low','medium','high','critical')),
  mandatory boolean not null default false,
  justification text,
  acceptance_criteria text,
  responsible_name text,
  status text not null default 'draft' check(status in ('draft','active','on_hold','closed','cancelled')),
  attachment_path text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One current scope statement per project (spec 9); it becomes part of the Scope Baseline
-- (Sprint 8, alongside WBS + WBS Dictionary), which is why status re-uses draft/active as
-- "not yet baselined / baselined" until Sprint 8 introduces the full baseline workflow.
create table if not exists public.ppm_scope_statements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.ppm_projects(id) on delete cascade,
  in_scope text,
  out_of_scope text,
  deliverables text,
  acceptance_criteria text,
  constraints text,
  assumptions text,
  dependencies text,
  geographic_limits text,
  time_limits text,
  budget_limits text,
  status text not null default 'draft' check(status in ('draft','active','on_hold','closed','cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ppm_projects_portfolio on public.ppm_projects(portfolio_id);
create index if not exists ppm_projects_program on public.ppm_projects(program_id);
create index if not exists ppm_projects_organization on public.ppm_projects(organization_id);
create index if not exists ppm_project_charters_project on public.ppm_project_charters(project_id,version desc);
create index if not exists ppm_requirements_project on public.ppm_requirements(project_id);

alter table public.ppm_projects enable row level security;
alter table public.ppm_project_charters enable row level security;
alter table public.ppm_requirements enable row level security;
alter table public.ppm_scope_statements enable row level security;

drop policy if exists "PPM users read projects" on public.ppm_projects;
create policy "PPM users read projects" on public.ppm_projects
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage projects" on public.ppm_projects;
create policy "PPM managers manage projects" on public.ppm_projects
  for all to authenticated
  using(
    public.ppm_role_matches(array['super_admin','org_admin'],'organization',organization_id)
    or public.ppm_role_matches(array['portfolio_manager'],'portfolio',portfolio_id)
    or (program_id is not null and public.ppm_role_matches(array['program_manager'],'program',program_id))
    or public.ppm_role_matches(array['project_manager'],'project',id)
  )
  with check(
    public.ppm_role_matches(array['super_admin','org_admin'],'organization',organization_id)
    or public.ppm_role_matches(array['portfolio_manager'],'portfolio',portfolio_id)
    or (program_id is not null and public.ppm_role_matches(array['program_manager'],'program',program_id))
    or public.ppm_role_matches(array['project_manager'],'project',id)
  );

drop policy if exists "PPM users read charters" on public.ppm_project_charters;
create policy "PPM users read charters" on public.ppm_project_charters
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage charters" on public.ppm_project_charters;
create policy "PPM managers manage charters" on public.ppm_project_charters
  for all to authenticated
  using(exists(select 1 from public.ppm_projects p where p.id=project_id and (
    public.ppm_role_matches(array['super_admin','org_admin'],'organization',p.organization_id)
    or public.ppm_role_matches(array['portfolio_manager'],'portfolio',p.portfolio_id)
    or (p.program_id is not null and public.ppm_role_matches(array['program_manager'],'program',p.program_id))
    or public.ppm_role_matches(array['project_manager'],'project',p.id)
  )))
  with check(exists(select 1 from public.ppm_projects p where p.id=project_id and (
    public.ppm_role_matches(array['super_admin','org_admin'],'organization',p.organization_id)
    or public.ppm_role_matches(array['portfolio_manager'],'portfolio',p.portfolio_id)
    or (p.program_id is not null and public.ppm_role_matches(array['program_manager'],'program',p.program_id))
    or public.ppm_role_matches(array['project_manager'],'project',p.id)
  )));

drop policy if exists "PPM users read requirements" on public.ppm_requirements;
create policy "PPM users read requirements" on public.ppm_requirements
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage requirements" on public.ppm_requirements;
create policy "PPM managers manage requirements" on public.ppm_requirements
  for all to authenticated
  using(exists(select 1 from public.ppm_projects p where p.id=project_id and (
    public.ppm_role_matches(array['super_admin','org_admin'],'organization',p.organization_id)
    or public.ppm_role_matches(array['portfolio_manager'],'portfolio',p.portfolio_id)
    or (p.program_id is not null and public.ppm_role_matches(array['program_manager'],'program',p.program_id))
    or public.ppm_role_matches(array['project_manager','project_officer'],'project',p.id)
  )))
  with check(exists(select 1 from public.ppm_projects p where p.id=project_id and (
    public.ppm_role_matches(array['super_admin','org_admin'],'organization',p.organization_id)
    or public.ppm_role_matches(array['portfolio_manager'],'portfolio',p.portfolio_id)
    or (p.program_id is not null and public.ppm_role_matches(array['program_manager'],'program',p.program_id))
    or public.ppm_role_matches(array['project_manager','project_officer'],'project',p.id)
  )));

drop policy if exists "PPM users read scope statements" on public.ppm_scope_statements;
create policy "PPM users read scope statements" on public.ppm_scope_statements
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage scope statements" on public.ppm_scope_statements;
create policy "PPM managers manage scope statements" on public.ppm_scope_statements
  for all to authenticated
  using(exists(select 1 from public.ppm_projects p where p.id=project_id and (
    public.ppm_role_matches(array['super_admin','org_admin'],'organization',p.organization_id)
    or public.ppm_role_matches(array['portfolio_manager'],'portfolio',p.portfolio_id)
    or (p.program_id is not null and public.ppm_role_matches(array['program_manager'],'program',p.program_id))
    or public.ppm_role_matches(array['project_manager'],'project',p.id)
  )))
  with check(exists(select 1 from public.ppm_projects p where p.id=project_id and (
    public.ppm_role_matches(array['super_admin','org_admin'],'organization',p.organization_id)
    or public.ppm_role_matches(array['portfolio_manager'],'portfolio',p.portfolio_id)
    or (p.program_id is not null and public.ppm_role_matches(array['program_manager'],'program',p.program_id))
    or public.ppm_role_matches(array['project_manager'],'project',p.id)
  )));
