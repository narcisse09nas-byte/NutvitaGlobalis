-- Refinement program, Wave 1: Suppliers get a real directory (previously a free-text name on
-- expenses/procurement) and implementation Sites get a proper Country/Region/Division/
-- Subdivision/Site hierarchy (previously a free-text "Localisation" field everywhere).
-- Run after ppm-stakeholders-communication.sql (reuses public.ppm_project_access).

create table if not exists public.ppm_suppliers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  name text not null,
  category text not null default 'goods' check(category in ('goods','services','works','consultancy','logistics','other')),
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,
  tax_id text,
  notes text,
  status text not null default 'active' check(status in ('draft','active','on_hold','closed','cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ppm_sites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  country text not null,
  region text,
  division text,
  subdivision text,
  site_name text not null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ppm_suppliers_project on public.ppm_suppliers(project_id,status);
create index if not exists ppm_sites_project on public.ppm_sites(project_id);

alter table public.ppm_suppliers enable row level security;
alter table public.ppm_sites enable row level security;

drop policy if exists "PPM users read suppliers" on public.ppm_suppliers;
create policy "PPM users read suppliers" on public.ppm_suppliers for select to authenticated using(public.ppm_project_access(project_id));
drop policy if exists "PPM managers manage suppliers" on public.ppm_suppliers;
create policy "PPM managers manage suppliers" on public.ppm_suppliers for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));

drop policy if exists "PPM users read sites" on public.ppm_sites;
create policy "PPM users read sites" on public.ppm_sites for select to authenticated using(public.ppm_project_access(project_id));
drop policy if exists "PPM managers manage sites" on public.ppm_sites;
create policy "PPM managers manage sites" on public.ppm_sites for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));
