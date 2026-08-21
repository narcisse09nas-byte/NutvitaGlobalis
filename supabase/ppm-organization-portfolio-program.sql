-- Sprint 2: Organisation / Portefeuille / Programme.
-- Real schema for the PPM module (see lib/ppm/types.ts for the matching TypeScript shapes).
-- Run after platform-unified-access.sql (reuses public.platform_has_access / public.is_admin).

create table if not exists public.ppm_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,
  description text,
  country text,
  status text not null default 'active' check(status in ('draft','active','on_hold','closed','cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ppm_portfolios (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.ppm_organizations(id) on delete cascade,
  name text not null,
  code text,
  description text,
  strategic_objectives text,
  manager_name text,
  manager_email text,
  start_date date,
  end_date date,
  countries text[] not null default '{}',
  total_budget numeric(14,2),
  currency text default 'XAF',
  status text not null default 'active' check(status in ('draft','active','on_hold','closed','cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ppm_programs (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.ppm_portfolios(id) on delete cascade,
  organization_id uuid not null references public.ppm_organizations(id) on delete cascade,
  name text not null,
  code text,
  description text,
  overall_objective text,
  expected_results text,
  manager_name text,
  manager_email text,
  donors text[] not null default '{}',
  partners text[] not null default '{}',
  target_population text,
  intervention_area text,
  start_date date,
  end_date date,
  budget numeric(14,2),
  currency text default 'XAF',
  status text not null default 'active' check(status in ('draft','active','on_hold','closed','cancelled')),
  progress_percent numeric(5,2) check(progress_percent between 0 and 100),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Role assignments: scope_id null means the role applies broadly within scope_type
-- (e.g. an org_admin not yet tied to one specific organization, granted while none exist).
create table if not exists public.ppm_role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check(role in (
    'super_admin','org_admin','portfolio_manager','program_manager','project_manager',
    'project_officer','meal_officer','finance_officer','procurement_officer','quality_officer',
    'technical_lead','team_member','viewer','auditor','donor_viewer'
  )),
  scope_type text not null check(scope_type in ('organization','portfolio','program','project')),
  scope_id uuid,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(user_id,role,scope_type,scope_id)
);

-- Append-only audit trail, matching the recruitment_history house pattern.
create table if not exists public.ppm_history (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check(entity_type in ('organization','portfolio','program','project')),
  entity_id uuid not null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  from_status text,
  to_status text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists ppm_portfolios_organization on public.ppm_portfolios(organization_id);
create index if not exists ppm_programs_portfolio on public.ppm_programs(portfolio_id);
create index if not exists ppm_programs_organization on public.ppm_programs(organization_id);
create index if not exists ppm_role_assignments_user on public.ppm_role_assignments(user_id);
create index if not exists ppm_role_assignments_scope on public.ppm_role_assignments(scope_type,scope_id);
create index if not exists ppm_history_entity on public.ppm_history(entity_type,entity_id,created_at desc);

-- Any role in p_roles, scoped to p_scope_type and either matching p_scope_id or granted
-- broadly (scope_id is null). Platform admins (admin_users, any active role) always pass.
create or replace function public.ppm_role_matches(p_roles text[], p_scope_type text, p_scope_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists(
    select 1 from public.ppm_role_assignments ra
    where ra.user_id = (select auth.uid())
      and ra.role = any(p_roles)
      and ra.scope_type = p_scope_type
      and (ra.scope_id is null or ra.scope_id = p_scope_id)
  );
$$;

alter table public.ppm_organizations enable row level security;
alter table public.ppm_portfolios enable row level security;
alter table public.ppm_programs enable row level security;
alter table public.ppm_role_assignments enable row level security;
alter table public.ppm_history enable row level security;

drop policy if exists "PPM users read organizations" on public.ppm_organizations;
create policy "PPM users read organizations" on public.ppm_organizations
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM admins manage organizations" on public.ppm_organizations;
create policy "PPM admins manage organizations" on public.ppm_organizations
  for all to authenticated
  using(public.ppm_role_matches(array['super_admin','org_admin'],'organization',id))
  with check(public.ppm_role_matches(array['super_admin','org_admin'],'organization',id));

drop policy if exists "PPM users read portfolios" on public.ppm_portfolios;
create policy "PPM users read portfolios" on public.ppm_portfolios
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage portfolios" on public.ppm_portfolios;
create policy "PPM managers manage portfolios" on public.ppm_portfolios
  for all to authenticated
  using(public.ppm_role_matches(array['super_admin','org_admin'],'organization',organization_id) or public.ppm_role_matches(array['portfolio_manager'],'portfolio',id))
  with check(public.ppm_role_matches(array['super_admin','org_admin'],'organization',organization_id) or public.ppm_role_matches(array['portfolio_manager'],'portfolio',id));

drop policy if exists "PPM users read programs" on public.ppm_programs;
create policy "PPM users read programs" on public.ppm_programs
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage programs" on public.ppm_programs;
create policy "PPM managers manage programs" on public.ppm_programs
  for all to authenticated
  using(
    public.ppm_role_matches(array['super_admin','org_admin'],'organization',organization_id)
    or public.ppm_role_matches(array['portfolio_manager'],'portfolio',portfolio_id)
    or public.ppm_role_matches(array['program_manager'],'program',id)
  )
  with check(
    public.ppm_role_matches(array['super_admin','org_admin'],'organization',organization_id)
    or public.ppm_role_matches(array['portfolio_manager'],'portfolio',portfolio_id)
    or public.ppm_role_matches(array['program_manager'],'program',id)
  );

drop policy if exists "PPM users read own role assignments" on public.ppm_role_assignments;
create policy "PPM users read own role assignments" on public.ppm_role_assignments
  for select to authenticated using(user_id=(select auth.uid()) or public.is_admin());
drop policy if exists "PPM admins manage role assignments" on public.ppm_role_assignments;
create policy "PPM admins manage role assignments" on public.ppm_role_assignments
  for all to authenticated using(public.is_admin()) with check(public.is_admin());

drop policy if exists "PPM users read history" on public.ppm_history;
create policy "PPM users read history" on public.ppm_history
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM users write own history" on public.ppm_history;
create policy "PPM users write own history" on public.ppm_history
  for insert to authenticated with check(actor_id=(select auth.uid()));
