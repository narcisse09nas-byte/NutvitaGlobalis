-- PDM and budget cascade refinements. Safe to run more than once.
alter table public.ppm_result_chains add column if not exists work_package_ids uuid[] not null default '{}';
alter table public.ppm_sites add column if not exists site_code text;
alter table public.ppm_sites add column if not exists beneficiary_count integer check (beneficiary_count is null or beneficiary_count >= 0);
alter table public.ppm_sites add column if not exists site_type text;
alter table public.ppm_sites add column if not exists contact_name text;
alter table public.ppm_sites add column if not exists contact_phone text;
create unique index if not exists ppm_sites_project_code_unique on public.ppm_sites(project_id, site_code) where site_code is not null;
alter table public.ppm_activities add column if not exists site_id uuid references public.ppm_sites(id) on delete set null;
alter table public.ppm_activities add column if not exists dependency_ids uuid[] not null default '{}';
alter table public.ppm_activities add column if not exists dependency_type text not null default 'FS';
alter table public.ppm_activities add column if not exists dependency_lag_days integer not null default 0;
do $$ begin alter table public.ppm_activities add constraint ppm_activities_dependency_type_check check (dependency_type in ('FS','SS','FF','SF')); exception when duplicate_object then null; end $$;
create index if not exists ppm_activities_site on public.ppm_activities(site_id);
create table if not exists public.ppm_organization_grants (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.ppm_organizations(id) on delete cascade,
 donor_id uuid not null references public.ppm_organization_donors(id) on delete cascade, reference text not null, title text,
 status text not null default 'active' check(status in ('active','inactive')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id, reference)
);
alter table public.ppm_organization_grants enable row level security;
drop policy if exists "PPM users read organization grants" on public.ppm_organization_grants;
create policy "PPM users read organization grants" on public.ppm_organization_grants for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM admins manage organization grants" on public.ppm_organization_grants;
create policy "PPM admins manage organization grants" on public.ppm_organization_grants for all to authenticated using(public.ppm_role_matches(array['super_admin','org_admin'],'organization',organization_id)) with check(public.ppm_role_matches(array['super_admin','org_admin'],'organization',organization_id));
alter table public.ppm_budget_lines add column if not exists donor_id uuid references public.ppm_organization_donors(id) on delete set null;
alter table public.ppm_budget_lines add column if not exists grant_id uuid references public.ppm_organization_grants(id) on delete set null;