-- Operations Management (Wave 5): Mise en oeuvre, SF/HGSF path — purchase orders (+ daily lines +
-- generated ingredient table) and delivery notes (+ lines + receivers), used by both paths.
-- Run after ppm-ops-mise-en-oeuvre-non-sf.sql.

-- Per-site, per-kind, per-month sequence counter — backs the spec-mandated human-readable PO
-- ("INI/MM/YY/NN") and invoice ("Fact n deg INI/NN/MM/AA") numbers. `for update` row locking in
-- public.ppm_ops_next_sequence (below) keeps concurrent submissions from racing on the same
-- counter, unlike a plain count(*)+1 query.
create table if not exists public.ppm_ops_sequence_counters (
  site_id uuid not null references public.ppm_ops_sites(id) on delete cascade,
  kind text not null check(kind in ('purchase_order','invoice')),
  year int not null,
  month int not null,
  last_seq int not null default 0,
  primary key(site_id, kind, year, month)
);

create or replace function public.ppm_ops_next_sequence(p_site_id uuid, p_kind text, p_year int, p_month int)
returns int language plpgsql security definer set search_path = public as $$
declare v_next int;
begin
  insert into public.ppm_ops_sequence_counters(site_id, kind, year, month, last_seq)
  values (p_site_id, p_kind, p_year, p_month, 1)
  on conflict (site_id, kind, year, month) do update set last_seq = public.ppm_ops_sequence_counters.last_seq + 1
  returning last_seq into v_next;
  return v_next;
end;
$$;

create table if not exists public.ppm_ops_purchase_orders (
  id text primary key,
  plan_id uuid not null references public.ppm_ops_distribution_plans(id),
  site_id uuid not null references public.ppm_ops_sites(id),
  cooperative_id uuid not null references public.ppm_ops_cooperatives(id),
  cooperative_address_snapshot text,
  cooperative_phone_snapshot text,
  cooperative_email_snapshot text,
  period_start date not null,
  period_end date not null,
  status text not null default 'draft' check(status in ('draft','submitted','coges_approved','endorsed_by_cooperative','returned','rejected','cancelled')),
  endorsed_at timestamptz,
  endorsed_by_contact_id uuid references public.ppm_ops_cooperative_contacts(id),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Days-to-cover checkboxes: menu/student_count prefilled from ppm_ops_distribution_plan_daily,
-- still editable per the spec ("prerempli... mais modifiable").
create table if not exists public.ppm_ops_po_daily_lines (
  id uuid primary key default gen_random_uuid(),
  po_id text not null references public.ppm_ops_purchase_orders(id) on delete cascade,
  ration_date date not null,
  menu_id uuid not null references public.ppm_ops_menus(id),
  student_count int not null,
  unique(po_id, ration_date)
);

-- Generated table: Ingredients / quantite en MT / prix au Kg / prix total — computed from the
-- daily lines' menus x student counts, price snapshotted from the currently-approved
-- ppm_ops_ingredient_prices row at PO creation time.
create table if not exists public.ppm_ops_po_ingredient_lines (
  id uuid primary key default gen_random_uuid(),
  po_id text not null references public.ppm_ops_purchase_orders(id) on delete cascade,
  product_id uuid not null references public.ppm_ops_products(id),
  quantity_mt numeric(14,4) not null,
  unit_price numeric(14,2) not null,
  total_price numeric(16,2) not null
);

-- Delivery notes — used by both the non-SF (need_id) and SF/HGSF (po_id) paths, mutually
-- exclusive per the check constraint below.
create table if not exists public.ppm_ops_delivery_notes (
  id text unique not null,
  id_pk uuid primary key default gen_random_uuid(),
  need_id uuid references public.ppm_ops_needs(id),
  po_id text references public.ppm_ops_purchase_orders(id),
  site_id uuid not null references public.ppm_ops_sites(id),
  delivery_date date not null,
  delivered_by_name text not null,
  generated_by text not null check(generated_by in ('logistics_team','cooperative')),
  monetary_value numeric(16,2),
  currency text,
  status text not null default 'draft' check(status in ('draft','submitted','received_pending','received_confirmed','approved','returned','rejected')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ppm_ops_delivery_notes_one_parent check((need_id is not null and po_id is null) or (need_id is null and po_id is not null))
);

create table if not exists public.ppm_ops_delivery_lines (
  id uuid primary key default gen_random_uuid(),
  delivery_note_id uuid not null references public.ppm_ops_delivery_notes(id_pk) on delete cascade,
  product_id uuid not null references public.ppm_ops_products(id),
  quantity_ordered numeric(14,4) not null,
  quantity_received numeric(14,4),
  unit_price numeric(14,2),
  total_value numeric(16,2),
  rejected_quantity numeric(14,4) not null default 0,
  rejection_reason text,
  conformity text check(conformity in ('conforme','non_conforme'))
);

-- "receptionneur 1, receptionneur 2, ...add".
create table if not exists public.ppm_ops_delivery_receivers (
  id uuid primary key default gen_random_uuid(),
  delivery_note_id uuid not null references public.ppm_ops_delivery_notes(id_pk) on delete cascade,
  full_name text not null,
  role text,
  user_id uuid references auth.users(id) on delete set null
);

create index if not exists ppm_ops_po_plan on public.ppm_ops_purchase_orders(plan_id);
create index if not exists ppm_ops_po_site on public.ppm_ops_purchase_orders(site_id);
create index if not exists ppm_ops_po_daily_lines_po on public.ppm_ops_po_daily_lines(po_id);
create index if not exists ppm_ops_po_ingredient_lines_po on public.ppm_ops_po_ingredient_lines(po_id);
create index if not exists ppm_ops_delivery_notes_site on public.ppm_ops_delivery_notes(site_id);
create index if not exists ppm_ops_delivery_notes_need on public.ppm_ops_delivery_notes(need_id);
create index if not exists ppm_ops_delivery_notes_po on public.ppm_ops_delivery_notes(po_id);
create index if not exists ppm_ops_delivery_lines_note on public.ppm_ops_delivery_lines(delivery_note_id);
create index if not exists ppm_ops_delivery_receivers_note on public.ppm_ops_delivery_receivers(delivery_note_id);

alter table public.ppm_ops_sequence_counters enable row level security;
alter table public.ppm_ops_purchase_orders enable row level security;
alter table public.ppm_ops_po_daily_lines enable row level security;
alter table public.ppm_ops_po_ingredient_lines enable row level security;
alter table public.ppm_ops_delivery_notes enable row level security;
alter table public.ppm_ops_delivery_lines enable row level security;
alter table public.ppm_ops_delivery_receivers enable row level security;

drop policy if exists "PPM users read ops sequence counters" on public.ppm_ops_sequence_counters;
create policy "PPM users read ops sequence counters" on public.ppm_ops_sequence_counters
  for select to authenticated using(public.platform_has_access('project_management'));

drop policy if exists "PPM users read ops purchase orders" on public.ppm_ops_purchase_orders;
create policy "PPM users read ops purchase orders" on public.ppm_ops_purchase_orders
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage ops purchase orders" on public.ppm_ops_purchase_orders;
create policy "PPM managers manage ops purchase orders" on public.ppm_ops_purchase_orders for all to authenticated
  using(exists(select 1 from public.ppm_ops_distribution_plans p where p.id = plan_id and public.ppm_ops_access(p.operation_id)))
  with check(exists(select 1 from public.ppm_ops_distribution_plans p where p.id = plan_id and public.ppm_ops_access(p.operation_id)));

drop policy if exists "PPM users read ops po daily lines" on public.ppm_ops_po_daily_lines;
create policy "PPM users read ops po daily lines" on public.ppm_ops_po_daily_lines
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage ops po daily lines" on public.ppm_ops_po_daily_lines;
create policy "PPM managers manage ops po daily lines" on public.ppm_ops_po_daily_lines for all to authenticated
  using(exists(select 1 from public.ppm_ops_purchase_orders po join public.ppm_ops_distribution_plans p on p.id = po.plan_id where po.id = po_id and public.ppm_ops_access(p.operation_id)))
  with check(exists(select 1 from public.ppm_ops_purchase_orders po join public.ppm_ops_distribution_plans p on p.id = po.plan_id where po.id = po_id and public.ppm_ops_access(p.operation_id)));

drop policy if exists "PPM users read ops po ingredient lines" on public.ppm_ops_po_ingredient_lines;
create policy "PPM users read ops po ingredient lines" on public.ppm_ops_po_ingredient_lines
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage ops po ingredient lines" on public.ppm_ops_po_ingredient_lines;
create policy "PPM managers manage ops po ingredient lines" on public.ppm_ops_po_ingredient_lines for all to authenticated
  using(exists(select 1 from public.ppm_ops_purchase_orders po join public.ppm_ops_distribution_plans p on p.id = po.plan_id where po.id = po_id and public.ppm_ops_access(p.operation_id)))
  with check(exists(select 1 from public.ppm_ops_purchase_orders po join public.ppm_ops_distribution_plans p on p.id = po.plan_id where po.id = po_id and public.ppm_ops_access(p.operation_id)));

drop policy if exists "PPM users read ops delivery notes" on public.ppm_ops_delivery_notes;
create policy "PPM users read ops delivery notes" on public.ppm_ops_delivery_notes
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage ops delivery notes" on public.ppm_ops_delivery_notes;
create policy "PPM managers manage ops delivery notes" on public.ppm_ops_delivery_notes for all to authenticated
  using(exists(select 1 from public.ppm_ops_sites s where s.id = site_id and public.ppm_ops_access(s.operation_id)))
  with check(exists(select 1 from public.ppm_ops_sites s where s.id = site_id and public.ppm_ops_access(s.operation_id)));

drop policy if exists "PPM users read ops delivery lines" on public.ppm_ops_delivery_lines;
create policy "PPM users read ops delivery lines" on public.ppm_ops_delivery_lines
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage ops delivery lines" on public.ppm_ops_delivery_lines;
create policy "PPM managers manage ops delivery lines" on public.ppm_ops_delivery_lines for all to authenticated
  using(exists(select 1 from public.ppm_ops_delivery_notes d join public.ppm_ops_sites s on s.id = d.site_id where d.id_pk = delivery_note_id and public.ppm_ops_access(s.operation_id)))
  with check(exists(select 1 from public.ppm_ops_delivery_notes d join public.ppm_ops_sites s on s.id = d.site_id where d.id_pk = delivery_note_id and public.ppm_ops_access(s.operation_id)));

drop policy if exists "PPM users read ops delivery receivers" on public.ppm_ops_delivery_receivers;
create policy "PPM users read ops delivery receivers" on public.ppm_ops_delivery_receivers
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage ops delivery receivers" on public.ppm_ops_delivery_receivers;
create policy "PPM managers manage ops delivery receivers" on public.ppm_ops_delivery_receivers for all to authenticated
  using(exists(select 1 from public.ppm_ops_delivery_notes d join public.ppm_ops_sites s on s.id = d.site_id where d.id_pk = delivery_note_id and public.ppm_ops_access(s.operation_id)))
  with check(exists(select 1 from public.ppm_ops_delivery_notes d join public.ppm_ops_sites s on s.id = d.site_id where d.id_pk = delivery_note_id and public.ppm_ops_access(s.operation_id)));
