-- Operations Management (Wave 2): Cadrage — sites detail, rations, menus/ingredients,
-- ingredient price history, cooperatives, school-cooperative contracts.
-- Run after ppm-ops-foundation.sql.

create table if not exists public.ppm_ops_site_payment_accounts (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.ppm_ops_sites(id) on delete cascade,
  account_type text not null check(account_type in ('mobile_money','bank','other')),
  account_name text not null,
  account_number text not null,
  provider text,
  is_default boolean not null default true,
  created_at timestamptz not null default now()
);

-- "equipe de distribution" (non-SF) / COGES roster (SF) for one site. user_id is filled once the
-- person accepts an invite to the external distribution-partner portal (Wave 7).
create table if not exists public.ppm_ops_site_team_members (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.ppm_ops_sites(id) on delete cascade,
  full_name text not null,
  role text not null check(role in ('coges_president','coges_member','distribution_officer','delivery_team','other')),
  phone text,
  email text,
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active' check(status in ('active','inactive')),
  created_at timestamptz not null default now()
);

create table if not exists public.ppm_ops_rations (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.ppm_ops_operations(id) on delete cascade,
  product_id uuid not null references public.ppm_ops_products(id),
  ration_per_beneficiary_per_day numeric(12,4) not null,
  unit text not null,
  notes text,
  created_at timestamptz not null default now()
);

-- SF/HGSF only. Named, reusable templates (not tied to a fixed weekday) — a menu is assigned to
-- specific dates later via the Planification daily grid / PO daily lines (Waves 3 and 5).
create table if not exists public.ppm_ops_menus (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.ppm_ops_operations(id) on delete cascade,
  name text not null,
  notes text,
  status text not null default 'active' check(status in ('active','inactive')),
  created_at timestamptz not null default now()
);

create table if not exists public.ppm_ops_menu_ingredients (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.ppm_ops_menus(id) on delete cascade,
  product_id uuid not null references public.ppm_ops_products(id),
  quantity_per_child_per_day numeric(12,4) not null,
  unit text not null,
  created_at timestamptz not null default now()
);

-- Cooperatives/GICs — organization-scoped catalog, reusable across schools and operations
-- (a supplier isn't re-registered per cycle).
create table if not exists public.ppm_ops_cooperatives (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  organization_id uuid not null references public.ppm_organizations(id) on delete cascade,
  name text not null,
  address text,
  phone text,
  email text,
  default_payment_account_type text check(default_payment_account_type in ('mobile_money','bank','other')),
  default_payment_account_number text,
  default_payment_account_name text,
  stamp_image_path text,
  status text not null default 'active' check(status in ('active','suspended','closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.ppm_ops_cooperative_contacts (
  id uuid primary key default gen_random_uuid(),
  cooperative_id uuid not null references public.ppm_ops_cooperatives(id) on delete cascade,
  full_name text not null,
  role text,
  phone text,
  email text,
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'active' check(status in ('active','inactive')),
  created_at timestamptz not null default now()
);

create table if not exists public.ppm_ops_school_cooperative_contracts (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.ppm_ops_sites(id) on delete cascade,
  cooperative_id uuid not null references public.ppm_ops_cooperatives(id) on delete cascade,
  start_date date not null,
  end_date date,
  document_file_path text,
  status text not null default 'draft' check(status in ('draft','active','expired','terminated')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Append-only ingredient price history: updating an approved price never mutates that row — it
-- inserts a new pending row and stamps the old one superseded_at/superseded_by_price_id, so a
-- full price history is always preservable (see IngredientPriceManager.tsx).
create table if not exists public.ppm_ops_ingredient_prices (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.ppm_ops_operations(id) on delete cascade,
  product_id uuid not null references public.ppm_ops_products(id),
  unit_price numeric(14,2) not null,
  currency text not null,
  status text not null default 'pending' check(status in ('pending','approved','superseded')),
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  superseded_at timestamptz,
  superseded_by_price_id uuid references public.ppm_ops_ingredient_prices(id),
  effective_from date not null default current_date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Deferred from Wave 1 (ppm_ops_cooperatives didn't exist yet): a site's current primary supplier.
alter table public.ppm_ops_sites add column if not exists cooperative_id uuid references public.ppm_ops_cooperatives(id) on delete set null;

create index if not exists ppm_ops_site_payment_accounts_site on public.ppm_ops_site_payment_accounts(site_id);
create index if not exists ppm_ops_site_team_members_site on public.ppm_ops_site_team_members(site_id);
create index if not exists ppm_ops_rations_operation on public.ppm_ops_rations(operation_id);
create index if not exists ppm_ops_menus_operation on public.ppm_ops_menus(operation_id);
create index if not exists ppm_ops_menu_ingredients_menu on public.ppm_ops_menu_ingredients(menu_id);
create index if not exists ppm_ops_cooperatives_organization on public.ppm_ops_cooperatives(organization_id);
create index if not exists ppm_ops_cooperative_contacts_cooperative on public.ppm_ops_cooperative_contacts(cooperative_id);
create index if not exists ppm_ops_school_coop_contracts_site on public.ppm_ops_school_cooperative_contracts(site_id);
create index if not exists ppm_ops_school_coop_contracts_cooperative on public.ppm_ops_school_cooperative_contracts(cooperative_id);
create index if not exists ppm_ops_ingredient_prices_operation on public.ppm_ops_ingredient_prices(operation_id, product_id);

alter table public.ppm_ops_site_payment_accounts enable row level security;
alter table public.ppm_ops_site_team_members enable row level security;
alter table public.ppm_ops_rations enable row level security;
alter table public.ppm_ops_menus enable row level security;
alter table public.ppm_ops_menu_ingredients enable row level security;
alter table public.ppm_ops_cooperatives enable row level security;
alter table public.ppm_ops_cooperative_contacts enable row level security;
alter table public.ppm_ops_school_cooperative_contracts enable row level security;
alter table public.ppm_ops_ingredient_prices enable row level security;

drop policy if exists "PPM users read ops site payment accounts" on public.ppm_ops_site_payment_accounts;
create policy "PPM users read ops site payment accounts" on public.ppm_ops_site_payment_accounts
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage ops site payment accounts" on public.ppm_ops_site_payment_accounts;
create policy "PPM managers manage ops site payment accounts" on public.ppm_ops_site_payment_accounts for all to authenticated
  using(exists(select 1 from public.ppm_ops_sites s where s.id = site_id and public.ppm_ops_access(s.operation_id)))
  with check(exists(select 1 from public.ppm_ops_sites s where s.id = site_id and public.ppm_ops_access(s.operation_id)));

drop policy if exists "PPM users read ops site team members" on public.ppm_ops_site_team_members;
create policy "PPM users read ops site team members" on public.ppm_ops_site_team_members
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage ops site team members" on public.ppm_ops_site_team_members;
create policy "PPM managers manage ops site team members" on public.ppm_ops_site_team_members for all to authenticated
  using(exists(select 1 from public.ppm_ops_sites s where s.id = site_id and public.ppm_ops_access(s.operation_id)))
  with check(exists(select 1 from public.ppm_ops_sites s where s.id = site_id and public.ppm_ops_access(s.operation_id)));

drop policy if exists "PPM users read ops rations" on public.ppm_ops_rations;
create policy "PPM users read ops rations" on public.ppm_ops_rations
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage ops rations" on public.ppm_ops_rations;
create policy "PPM managers manage ops rations" on public.ppm_ops_rations
  for all to authenticated using(public.ppm_ops_access(operation_id)) with check(public.ppm_ops_access(operation_id));

drop policy if exists "PPM users read ops menus" on public.ppm_ops_menus;
create policy "PPM users read ops menus" on public.ppm_ops_menus
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage ops menus" on public.ppm_ops_menus;
create policy "PPM managers manage ops menus" on public.ppm_ops_menus
  for all to authenticated using(public.ppm_ops_access(operation_id)) with check(public.ppm_ops_access(operation_id));

drop policy if exists "PPM users read ops menu ingredients" on public.ppm_ops_menu_ingredients;
create policy "PPM users read ops menu ingredients" on public.ppm_ops_menu_ingredients
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage ops menu ingredients" on public.ppm_ops_menu_ingredients;
create policy "PPM managers manage ops menu ingredients" on public.ppm_ops_menu_ingredients for all to authenticated
  using(exists(select 1 from public.ppm_ops_menus m where m.id = menu_id and public.ppm_ops_access(m.operation_id)))
  with check(exists(select 1 from public.ppm_ops_menus m where m.id = menu_id and public.ppm_ops_access(m.operation_id)));

drop policy if exists "PPM users read ops ingredient prices" on public.ppm_ops_ingredient_prices;
create policy "PPM users read ops ingredient prices" on public.ppm_ops_ingredient_prices
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage ops ingredient prices" on public.ppm_ops_ingredient_prices;
create policy "PPM managers manage ops ingredient prices" on public.ppm_ops_ingredient_prices
  for all to authenticated using(public.ppm_ops_access(operation_id)) with check(public.ppm_ops_access(operation_id));

drop policy if exists "PPM users read ops cooperatives" on public.ppm_ops_cooperatives;
create policy "PPM users read ops cooperatives" on public.ppm_ops_cooperatives
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage ops cooperatives" on public.ppm_ops_cooperatives;
create policy "PPM managers manage ops cooperatives" on public.ppm_ops_cooperatives for all to authenticated
  using(public.ppm_role_matches(array['super_admin','org_admin'],'organization',organization_id))
  with check(public.ppm_role_matches(array['super_admin','org_admin'],'organization',organization_id));

drop policy if exists "PPM users read ops cooperative contacts" on public.ppm_ops_cooperative_contacts;
create policy "PPM users read ops cooperative contacts" on public.ppm_ops_cooperative_contacts
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage ops cooperative contacts" on public.ppm_ops_cooperative_contacts;
create policy "PPM managers manage ops cooperative contacts" on public.ppm_ops_cooperative_contacts for all to authenticated
  using(exists(select 1 from public.ppm_ops_cooperatives c where c.id = cooperative_id and public.ppm_role_matches(array['super_admin','org_admin'],'organization',c.organization_id)))
  with check(exists(select 1 from public.ppm_ops_cooperatives c where c.id = cooperative_id and public.ppm_role_matches(array['super_admin','org_admin'],'organization',c.organization_id)));

drop policy if exists "PPM users read ops school cooperative contracts" on public.ppm_ops_school_cooperative_contracts;
create policy "PPM users read ops school cooperative contracts" on public.ppm_ops_school_cooperative_contracts
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage ops school cooperative contracts" on public.ppm_ops_school_cooperative_contracts;
create policy "PPM managers manage ops school cooperative contracts" on public.ppm_ops_school_cooperative_contracts for all to authenticated
  using(exists(select 1 from public.ppm_ops_sites s where s.id = site_id and public.ppm_ops_access(s.operation_id)))
  with check(exists(select 1 from public.ppm_ops_sites s where s.id = site_id and public.ppm_ops_access(s.operation_id)));
