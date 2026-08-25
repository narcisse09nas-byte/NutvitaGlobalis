-- Operations Management (Wave 1): foundation for the new "Operations" domain, starting with the
-- Distribution Cycle operation type. Parallel to Project (ppm_projects) rather than nested under
-- it — project_id is optional ("rattache si applicable").
-- Run after ppm-organization-portfolio-program.sql and ppm-results-governance.sql
-- (reuses public.ppm_role_matches, public.ppm_project_access, public.platform_has_access).

create table if not exists public.ppm_ops_operations (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  organization_id uuid not null references public.ppm_organizations(id) on delete cascade,
  project_id uuid references public.ppm_projects(id) on delete set null,
  name text not null,
  description text,
  period_start date not null,
  period_end date not null,
  product_type text not null check(product_type in ('cash','food','nfi','other')),
  product_type_other text,
  activity_type text not null check(activity_type in ('gfd','ans','school_meal','other')),
  activity_type_other text,
  is_sf_hgsf boolean not null default false,
  currency text not null default 'XOF',
  status text not null default 'draft' check(status in ('draft','active','suspended','closed','cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Distribution site (school/community/other), scoped to one operation. Deliberately a new table
-- rather than a reuse of the generic public.ppm_sites (Country/Region/Division/Subdivision) —
-- ops sites carry many ops-specific fields (stamp image, short_initials for PO/invoice numbering)
-- that don't belong on the shared, project-agnostic site table. linked_ppm_site_id is an optional
-- pointer for organizations that already registered the school as a generic project site.
create table if not exists public.ppm_ops_sites (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  operation_id uuid not null references public.ppm_ops_operations(id) on delete cascade,
  linked_ppm_site_id uuid references public.ppm_sites(id) on delete set null,
  site_type text not null default 'school' check(site_type in ('school','health_center','community','other')),
  name text not null,
  short_initials text not null check(char_length(short_initials) <= 3),
  country text not null,
  region text,
  division text,
  subdivision text,
  stamp_image_path text,
  status text not null default 'active' check(status in ('active','suspended','closed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Master product catalog — organization-scoped so the same product (and its 8-char registry
-- code) is reused across every operation, not re-created per cycle.
create table if not exists public.ppm_ops_products (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  organization_id uuid not null references public.ppm_organizations(id) on delete cascade,
  name text not null,
  category text not null check(category in ('cash','food','nfi','other')),
  unit_of_measure text not null default 'kg',
  status text not null default 'active' check(status in ('active','inactive')),
  created_at timestamptz not null default now()
);

create index if not exists ppm_ops_operations_organization on public.ppm_ops_operations(organization_id);
create index if not exists ppm_ops_operations_project on public.ppm_ops_operations(project_id);
create index if not exists ppm_ops_sites_operation on public.ppm_ops_sites(operation_id);
create index if not exists ppm_ops_products_organization on public.ppm_ops_products(organization_id);

-- Access check mirroring public.ppm_project_access's shape: org-level roles, or (when the
-- operation is attached to a project) that project's own access chain.
create or replace function public.ppm_ops_access(p_operation_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.ppm_ops_operations o where o.id = p_operation_id and (
    public.ppm_role_matches(array['super_admin','org_admin'],'organization',o.organization_id)
    or (o.project_id is not null and public.ppm_project_access(o.project_id))
  ));
$$;

alter table public.ppm_ops_operations enable row level security;
alter table public.ppm_ops_sites enable row level security;
alter table public.ppm_ops_products enable row level security;

drop policy if exists "PPM users read operations" on public.ppm_ops_operations;
create policy "PPM users read operations" on public.ppm_ops_operations
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage operations" on public.ppm_ops_operations;
create policy "PPM managers manage operations" on public.ppm_ops_operations for all to authenticated
  using(public.ppm_role_matches(array['super_admin','org_admin'],'organization',organization_id) or (project_id is not null and public.ppm_project_access(project_id)))
  with check(public.ppm_role_matches(array['super_admin','org_admin'],'organization',organization_id) or (project_id is not null and public.ppm_project_access(project_id)));

drop policy if exists "PPM users read ops sites" on public.ppm_ops_sites;
create policy "PPM users read ops sites" on public.ppm_ops_sites
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage ops sites" on public.ppm_ops_sites;
create policy "PPM managers manage ops sites" on public.ppm_ops_sites
  for all to authenticated using(public.ppm_ops_access(operation_id)) with check(public.ppm_ops_access(operation_id));

drop policy if exists "PPM users read ops products" on public.ppm_ops_products;
create policy "PPM users read ops products" on public.ppm_ops_products
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage ops products" on public.ppm_ops_products;
create policy "PPM managers manage ops products" on public.ppm_ops_products for all to authenticated
  using(public.ppm_role_matches(array['super_admin','org_admin'],'organization',organization_id))
  with check(public.ppm_role_matches(array['super_admin','org_admin'],'organization',organization_id));

-- Extend the shared PPM audit trail with the Operations-module entity types, so this module
-- reuses the exact same table/RLS/history-viewer as the rest of PPM instead of a parallel one.
alter table public.ppm_history drop constraint if exists ppm_history_entity_type_check;
alter table public.ppm_history add constraint ppm_history_entity_type_check check(entity_type in (
  'organization','portfolio','program','project',
  'distribution_operation','distribution_site','ingredient_price','distribution_plan',
  'distribution_need','purchase_order','delivery_note','activity_report','invoice','partner_profile'
));
