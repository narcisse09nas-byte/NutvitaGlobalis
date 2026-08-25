-- Operations Management (Wave 4): Mise en oeuvre, non-SF/HGSF path — per-site stock ledger and
-- needs (requisitions). Run after ppm-ops-planification.sql.

-- Single running ledger per site+product, feeding every "stock sur site" auto-fill in the module
-- (Needs, Activity Reports) — persists across operations/cycles (a school's storeroom doesn't
-- reset because a new distribution cycle starts).
create table if not exists public.ppm_ops_site_stock_ledger (
  id bigint generated always as identity primary key,
  site_id uuid not null references public.ppm_ops_sites(id) on delete cascade,
  product_id uuid not null references public.ppm_ops_products(id),
  transaction_type text not null check(transaction_type in ('received','distributed','damaged','returned','adjustment')),
  quantity numeric(14,4) not null,
  reference_type text,
  reference_id uuid,
  balance_after numeric(14,4) not null,
  recorded_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.ppm_ops_needs (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  plan_id uuid not null references public.ppm_ops_distribution_plans(id),
  operation_id uuid not null references public.ppm_ops_operations(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  status text not null default 'draft' check(status in ('draft','submitted','verified','approved','returned','rejected')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- "permettre d'avoir plusieurs sites sur un meme besoin".
create table if not exists public.ppm_ops_need_sites (
  id uuid primary key default gen_random_uuid(),
  need_id uuid not null references public.ppm_ops_needs(id) on delete cascade,
  site_id uuid not null references public.ppm_ops_sites(id),
  target_beneficiaries int not null,
  ration_days int not null,
  desired_start_date date not null
);

create table if not exists public.ppm_ops_need_products (
  id uuid primary key default gen_random_uuid(),
  need_site_id uuid not null references public.ppm_ops_need_sites(id) on delete cascade,
  product_id uuid not null references public.ppm_ops_products(id),
  on_site_stock numeric(14,4) not null default 0,
  quantity_required numeric(14,4) not null,
  quantity_needed numeric(14,4) not null
);

create index if not exists ppm_ops_stock_ledger_site_product on public.ppm_ops_site_stock_ledger(site_id, product_id, recorded_at desc);
create index if not exists ppm_ops_needs_plan on public.ppm_ops_needs(plan_id);
create index if not exists ppm_ops_needs_operation on public.ppm_ops_needs(operation_id);
create index if not exists ppm_ops_need_sites_need on public.ppm_ops_need_sites(need_id);
create index if not exists ppm_ops_need_products_need_site on public.ppm_ops_need_products(need_site_id);

alter table public.ppm_ops_site_stock_ledger enable row level security;
alter table public.ppm_ops_needs enable row level security;
alter table public.ppm_ops_need_sites enable row level security;
alter table public.ppm_ops_need_products enable row level security;

drop policy if exists "PPM users read ops stock ledger" on public.ppm_ops_site_stock_ledger;
create policy "PPM users read ops stock ledger" on public.ppm_ops_site_stock_ledger
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage ops stock ledger" on public.ppm_ops_site_stock_ledger;
create policy "PPM managers manage ops stock ledger" on public.ppm_ops_site_stock_ledger for all to authenticated
  using(exists(select 1 from public.ppm_ops_sites s where s.id = site_id and public.ppm_ops_access(s.operation_id)))
  with check(exists(select 1 from public.ppm_ops_sites s where s.id = site_id and public.ppm_ops_access(s.operation_id)));

drop policy if exists "PPM users read ops needs" on public.ppm_ops_needs;
create policy "PPM users read ops needs" on public.ppm_ops_needs
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage ops needs" on public.ppm_ops_needs;
create policy "PPM managers manage ops needs" on public.ppm_ops_needs
  for all to authenticated using(public.ppm_ops_access(operation_id)) with check(public.ppm_ops_access(operation_id));

drop policy if exists "PPM users read ops need sites" on public.ppm_ops_need_sites;
create policy "PPM users read ops need sites" on public.ppm_ops_need_sites
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage ops need sites" on public.ppm_ops_need_sites;
create policy "PPM managers manage ops need sites" on public.ppm_ops_need_sites for all to authenticated
  using(exists(select 1 from public.ppm_ops_needs n where n.id = need_id and public.ppm_ops_access(n.operation_id)))
  with check(exists(select 1 from public.ppm_ops_needs n where n.id = need_id and public.ppm_ops_access(n.operation_id)));

drop policy if exists "PPM users read ops need products" on public.ppm_ops_need_products;
create policy "PPM users read ops need products" on public.ppm_ops_need_products
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage ops need products" on public.ppm_ops_need_products;
create policy "PPM managers manage ops need products" on public.ppm_ops_need_products for all to authenticated
  using(exists(select 1 from public.ppm_ops_need_sites ns join public.ppm_ops_needs n on n.id = ns.need_id where ns.id = need_site_id and public.ppm_ops_access(n.operation_id)))
  with check(exists(select 1 from public.ppm_ops_need_sites ns join public.ppm_ops_needs n on n.id = ns.need_id where ns.id = need_site_id and public.ppm_ops_access(n.operation_id)));
