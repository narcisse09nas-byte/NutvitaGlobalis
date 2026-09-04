-- HGSF V3 wave 1. Additive and rerunnable.
create table if not exists public.ppm_ops_operation_partners (
 id uuid primary key default gen_random_uuid(),
 operation_id uuid not null references public.ppm_ops_operations(id) on delete cascade,
 organization_id uuid not null references public.ppm_organizations(id) on delete cascade,
 partner_role text not null check(partner_role in ('owner','donor','implementing_partner','public_institution','cooperative','other')),
 valid_from date not null default current_date, valid_to date,
 status text not null default 'active' check(status in ('active','inactive','archived')),
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(valid_to is null or valid_to>=valid_from), unique(operation_id,organization_id,partner_role,valid_from)
);

-- Lot 2: explicit role + scope + validity period.
create table if not exists public.ppm_ops_access_assignments (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 operation_id uuid references public.ppm_ops_operations(id) on delete cascade,
 partner_organization_id uuid references public.ppm_organizations(id) on delete cascade,
 site_id uuid references public.ppm_ops_sites(id) on delete cascade,
 cooperative_id uuid references public.ppm_ops_cooperatives(id) on delete cascade,
 access_role text not null check(access_role in ('super_admin','admin','donor_viewer','implementing_partner','school_user','school_director','coges_verifier','storekeeper','cooperative_user','cooperative_billing','supervisor','monitoring_manager','finance_user','stakeholder_viewer')),
 access_level text not null default 'read' check(access_level in ('read','contribute','verify','approve','admin')),
 valid_from date not null default current_date, valid_to date,
 status text not null default 'active' check(status in ('active','suspended','revoked')),
 created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(valid_to is null or valid_to>=valid_from)
);
create index if not exists ppm_ops_access_user_idx on public.ppm_ops_access_assignments(user_id,status);

create or replace function public.ppm_ops_hgsf_access(p_operation_id uuid,p_site_id uuid default null)
returns boolean language sql stable security definer set search_path=public as $$
 select case when exists(select 1 from public.ppm_ops_access_assignments x where x.user_id=auth.uid() and x.operation_id=p_operation_id)
 then exists(select 1 from public.ppm_ops_access_assignments a where a.user_id=auth.uid() and a.operation_id=p_operation_id and a.status='active'
  and current_date>=a.valid_from and (a.valid_to is null or current_date<=a.valid_to)
  and (p_site_id is null or a.site_id is null or a.site_id=p_site_id))
 else public.ppm_ops_access(p_operation_id) end
$$;
revoke all on function public.ppm_ops_hgsf_access(uuid,uuid) from public;
grant execute on function public.ppm_ops_hgsf_access(uuid,uuid) to authenticated;

-- Lot 3: historical partner-to-school perimeter.
create table if not exists public.ppm_ops_partner_site_assignments (
 id uuid primary key default gen_random_uuid(),
 operation_partner_id uuid not null references public.ppm_ops_operation_partners(id) on delete cascade,
 site_id uuid not null references public.ppm_ops_sites(id) on delete cascade,
 valid_from date not null default current_date, valid_to date,
 status text not null default 'active' check(status in ('active','inactive','archived')),
 created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(),
 check(valid_to is null or valid_to>=valid_from), unique(operation_partner_id,site_id,valid_from)
);

-- Lot 4: food diversity reference and menu versioning.
create table if not exists public.ppm_ops_food_groups (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.ppm_organizations(id) on delete cascade,
 code text not null, name_fr text not null, name_en text not null, sort_order smallint not null default 0,
 status text not null default 'active' check(status in ('active','inactive')), unique(organization_id,code)
);
create table if not exists public.ppm_ops_product_food_groups (
 product_id uuid not null references public.ppm_ops_products(id) on delete cascade,
 food_group_id uuid not null references public.ppm_ops_food_groups(id) on delete cascade,
 primary key(product_id,food_group_id)
);
create table if not exists public.ppm_ops_menu_versions (
 id uuid primary key default gen_random_uuid(), menu_id uuid not null references public.ppm_ops_menus(id) on delete cascade,
 version_no integer not null, effective_from date not null, effective_to date,
 status text not null default 'draft' check(status in ('draft','submitted','verified','validated','returned','rejected','superseded')),
 notes text, created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(),
 check(effective_to is null or effective_to>=effective_from), unique(menu_id,version_no)
);

-- Lot 5: deterministic daily needs.
create table if not exists public.ppm_ops_daily_needs (
 id uuid primary key default gen_random_uuid(), business_id text unique not null,
 operation_id uuid not null references public.ppm_ops_operations(id) on delete cascade,
 project_id uuid references public.ppm_projects(id) on delete set null,
 partner_organization_id uuid references public.ppm_organizations(id) on delete set null,
 site_id uuid not null references public.ppm_ops_sites(id), need_date date not null,
 menu_id uuid not null references public.ppm_ops_menus(id), planned_children integer not null check(planned_children>=0),
 status text not null default 'draft' check(status in ('draft','submitted','verified','validated','ready_for_issue','returned','rejected','cancelled')),
 created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(operation_id,site_id,need_date,menu_id)
);
create table if not exists public.ppm_ops_daily_need_items (
 id uuid primary key default gen_random_uuid(), daily_need_id uuid not null references public.ppm_ops_daily_needs(id) on delete cascade,
 product_id uuid not null references public.ppm_ops_products(id), ration_per_child numeric(14,4) not null check(ration_per_child>=0),
 required_quantity numeric(14,4) not null check(required_quantity>=0), unit text not null,
 reference_price_id uuid references public.ppm_ops_ingredient_prices(id), unit_price_snapshot numeric(16,4), currency_snapshot text,
 total_value numeric(18,4), unique(daily_need_id,product_id)
);
create table if not exists public.ppm_ops_stock_movements (
 id bigint generated always as identity primary key, operation_id uuid not null references public.ppm_ops_operations(id) on delete cascade,
 site_id uuid not null references public.ppm_ops_sites(id), product_id uuid not null references public.ppm_ops_products(id),
 movement_type text not null check(movement_type in ('opening','receipt','issue','transfer_in','transfer_out','return','loss','damage','adjustment','correction')),
 quantity numeric(14,4) not null check(quantity>0),
 signed_quantity numeric(14,4) generated always as(case when movement_type in ('issue','transfer_out','loss','damage') then -quantity else quantity end) stored,
 reference_type text, reference_id text, reason text, occurred_at timestamptz not null default now(), created_by uuid references auth.users(id) on delete set null
);
create unique index if not exists ppm_ops_stock_movement_dedupe on public.ppm_ops_stock_movements(site_id,product_id,movement_type,reference_type,reference_id) where reference_id is not null;
create or replace view public.ppm_ops_stock_balances as select operation_id,site_id,product_id,sum(signed_quantity) quantity_on_hand,max(occurred_at) last_movement_at from public.ppm_ops_stock_movements group by operation_id,site_id,product_id;

-- Lot 6: one daily service report per school and date.
create table if not exists public.ppm_ops_daily_service_reports (
 id uuid primary key default gen_random_uuid(), business_id text unique not null,
 operation_id uuid not null references public.ppm_ops_operations(id) on delete cascade,
 project_id uuid references public.ppm_projects(id) on delete set null,
 partner_organization_id uuid references public.ppm_organizations(id) on delete set null,
 site_id uuid not null references public.ppm_ops_sites(id), service_date date not null,
 menu_id uuid not null references public.ppm_ops_menus(id), daily_need_id uuid references public.ppm_ops_daily_needs(id),
 target_children integer not null default 0 check(target_children>=0), present_children integer not null default 0 check(present_children>=0),
 served_children integer not null default 0 check(served_children>=0), meals_served integer not null default 0 check(meals_served>=0),
 food_group_count smallint check(food_group_count between 0 and 5), comment text,
 status text not null default 'draft' check(status in ('draft','submitted','verified','validated','returned','rejected','locked')),
 created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(operation_id,site_id,service_date)
);
create table if not exists public.ppm_ops_daily_service_demographics (
 id uuid primary key default gen_random_uuid(), report_id uuid not null references public.ppm_ops_daily_service_reports(id) on delete cascade,
 age_band text not null check(age_band in ('2_5','6_11','12_17','18_plus')),
 sex text not null check(sex in ('male','female')), served_count integer not null default 0 check(served_count>=0),
 unique(report_id,age_band,sex)
);
create table if not exists public.ppm_ops_variance_flags (
 id uuid primary key default gen_random_uuid(), operation_id uuid not null references public.ppm_ops_operations(id) on delete cascade,
 site_id uuid references public.ppm_ops_sites(id), entity_type text not null, entity_id text not null,
 expected_value numeric(18,4), actual_value numeric(18,4), variance_value numeric(18,4), variance_pct numeric(10,4),
 severity text not null check(severity in ('info','warning','critical')),
 status text not null default 'open' check(status in ('open','acknowledged','resolved','dismissed')),
 detected_at timestamptz not null default now(), resolved_at timestamptz, resolved_by uuid references auth.users(id) on delete set null
);

alter table public.ppm_ops_daily_needs enable row level security;
alter table public.ppm_ops_stock_movements enable row level security;
alter table public.ppm_ops_daily_service_reports enable row level security;
grant select,insert,update on public.ppm_ops_daily_needs,public.ppm_ops_stock_movements,public.ppm_ops_daily_service_reports to authenticated;
grant usage,select on sequence public.ppm_ops_stock_movements_id_seq to authenticated;
revoke insert,update,delete,truncate,references,trigger on public.ppm_ops_operation_partners,public.ppm_ops_access_assignments,public.ppm_ops_partner_site_assignments,public.ppm_ops_food_groups,public.ppm_ops_product_food_groups,public.ppm_ops_menu_versions,public.ppm_ops_daily_needs,public.ppm_ops_daily_need_items,public.ppm_ops_stock_movements,public.ppm_ops_daily_service_reports,public.ppm_ops_daily_service_demographics,public.ppm_ops_variance_flags from anon;
drop policy if exists hgsf_scoped_daily_needs on public.ppm_ops_daily_needs;
create policy hgsf_scoped_daily_needs on public.ppm_ops_daily_needs for all to authenticated using(public.ppm_ops_hgsf_access(operation_id,site_id)) with check(public.ppm_ops_hgsf_access(operation_id,site_id));
drop policy if exists hgsf_scoped_stock_movements on public.ppm_ops_stock_movements;
create policy hgsf_scoped_stock_movements on public.ppm_ops_stock_movements for all to authenticated using(public.ppm_ops_hgsf_access(operation_id,site_id)) with check(public.ppm_ops_hgsf_access(operation_id,site_id));
drop policy if exists hgsf_scoped_daily_reports on public.ppm_ops_daily_service_reports;
create policy hgsf_scoped_daily_reports on public.ppm_ops_daily_service_reports for all to authenticated using(public.ppm_ops_hgsf_access(operation_id,site_id)) with check(public.ppm_ops_hgsf_access(operation_id,site_id));
