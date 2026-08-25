-- Operations Management (Wave 3): Planification — age groups, distribution plans (+ site lines +
-- per-site product needs + SF/HGSF per-day menu/target-children grid).
-- Run after ppm-ops-cadrage.sql.

-- Configurable per operation (per spec: "groupe d'age a specifier depuis la planification"),
-- seeded with the six defaults when an operation is created.
create table if not exists public.ppm_ops_age_groups (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.ppm_ops_operations(id) on delete cascade,
  label text not null,
  sort_order int not null default 0
);

create table if not exists public.ppm_ops_distribution_plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  operation_id uuid not null references public.ppm_ops_operations(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  status text not null default 'draft' check(status in ('draft','submitted','verified','approved','returned','rejected')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per site on the plan ("add a site" — a plan can cover several sites/schools).
create table if not exists public.ppm_ops_distribution_plan_sites (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.ppm_ops_distribution_plans(id) on delete cascade,
  site_id uuid not null references public.ppm_ops_sites(id),
  target_beneficiaries int not null,
  ration_days int not null,
  period_start date not null,
  period_end date not null,
  distribution_start date,
  distribution_end date,
  unique(plan_id, site_id)
);

create table if not exists public.ppm_ops_distribution_plan_products (
  id uuid primary key default gen_random_uuid(),
  plan_site_id uuid not null references public.ppm_ops_distribution_plan_sites(id) on delete cascade,
  product_id uuid not null references public.ppm_ops_products(id),
  quantity_needed numeric(14,4) not null,
  unit text not null
);

-- SF/HGSF only: per-day-per-school menu + target children. same_for_period is a UI-side
-- convenience flag (the checkbox applies target_children to every date in range) — the actual
-- rows are still one-per-date so a later date can be edited independently.
create table if not exists public.ppm_ops_distribution_plan_daily (
  id uuid primary key default gen_random_uuid(),
  plan_site_id uuid not null references public.ppm_ops_distribution_plan_sites(id) on delete cascade,
  ration_date date not null,
  menu_id uuid not null references public.ppm_ops_menus(id),
  target_children int not null,
  same_for_period boolean not null default false,
  unique(plan_site_id, ration_date)
);

create index if not exists ppm_ops_age_groups_operation on public.ppm_ops_age_groups(operation_id);
create index if not exists ppm_ops_distribution_plans_operation on public.ppm_ops_distribution_plans(operation_id);
create index if not exists ppm_ops_plan_sites_plan on public.ppm_ops_distribution_plan_sites(plan_id);
create index if not exists ppm_ops_plan_products_plan_site on public.ppm_ops_distribution_plan_products(plan_site_id);
create index if not exists ppm_ops_plan_daily_plan_site on public.ppm_ops_distribution_plan_daily(plan_site_id, ration_date);

alter table public.ppm_ops_age_groups enable row level security;
alter table public.ppm_ops_distribution_plans enable row level security;
alter table public.ppm_ops_distribution_plan_sites enable row level security;
alter table public.ppm_ops_distribution_plan_products enable row level security;
alter table public.ppm_ops_distribution_plan_daily enable row level security;

drop policy if exists "PPM users read ops age groups" on public.ppm_ops_age_groups;
create policy "PPM users read ops age groups" on public.ppm_ops_age_groups
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage ops age groups" on public.ppm_ops_age_groups;
create policy "PPM managers manage ops age groups" on public.ppm_ops_age_groups
  for all to authenticated using(public.ppm_ops_access(operation_id)) with check(public.ppm_ops_access(operation_id));

drop policy if exists "PPM users read ops distribution plans" on public.ppm_ops_distribution_plans;
create policy "PPM users read ops distribution plans" on public.ppm_ops_distribution_plans
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage ops distribution plans" on public.ppm_ops_distribution_plans;
create policy "PPM managers manage ops distribution plans" on public.ppm_ops_distribution_plans
  for all to authenticated using(public.ppm_ops_access(operation_id)) with check(public.ppm_ops_access(operation_id));

drop policy if exists "PPM users read ops plan sites" on public.ppm_ops_distribution_plan_sites;
create policy "PPM users read ops plan sites" on public.ppm_ops_distribution_plan_sites
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage ops plan sites" on public.ppm_ops_distribution_plan_sites;
create policy "PPM managers manage ops plan sites" on public.ppm_ops_distribution_plan_sites for all to authenticated
  using(exists(select 1 from public.ppm_ops_distribution_plans p where p.id = plan_id and public.ppm_ops_access(p.operation_id)))
  with check(exists(select 1 from public.ppm_ops_distribution_plans p where p.id = plan_id and public.ppm_ops_access(p.operation_id)));

drop policy if exists "PPM users read ops plan products" on public.ppm_ops_distribution_plan_products;
create policy "PPM users read ops plan products" on public.ppm_ops_distribution_plan_products
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage ops plan products" on public.ppm_ops_distribution_plan_products;
create policy "PPM managers manage ops plan products" on public.ppm_ops_distribution_plan_products for all to authenticated
  using(exists(select 1 from public.ppm_ops_distribution_plan_sites ps join public.ppm_ops_distribution_plans p on p.id = ps.plan_id where ps.id = plan_site_id and public.ppm_ops_access(p.operation_id)))
  with check(exists(select 1 from public.ppm_ops_distribution_plan_sites ps join public.ppm_ops_distribution_plans p on p.id = ps.plan_id where ps.id = plan_site_id and public.ppm_ops_access(p.operation_id)));

drop policy if exists "PPM users read ops plan daily" on public.ppm_ops_distribution_plan_daily;
create policy "PPM users read ops plan daily" on public.ppm_ops_distribution_plan_daily
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage ops plan daily" on public.ppm_ops_distribution_plan_daily;
create policy "PPM managers manage ops plan daily" on public.ppm_ops_distribution_plan_daily for all to authenticated
  using(exists(select 1 from public.ppm_ops_distribution_plan_sites ps join public.ppm_ops_distribution_plans p on p.id = ps.plan_id where ps.id = plan_site_id and public.ppm_ops_access(p.operation_id)))
  with check(exists(select 1 from public.ppm_ops_distribution_plan_sites ps join public.ppm_ops_distribution_plans p on p.id = ps.plan_id where ps.id = plan_site_id and public.ppm_ops_access(p.operation_id)));
