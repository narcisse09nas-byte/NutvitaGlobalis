-- NutVitaGlobalis catering commerce: public menus, service locations,
-- customer quotations, delivery workflow and finance hand-off.
-- Apply after maximus-access-control.sql and commerce-payments.sql.

create table if not exists public.catering_locations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check(kind in ('central_kitchen','sale_point','partner_hospital')),
  name_fr text not null,
  name_en text,
  country text,
  city text not null,
  address text,
  contact_name text,
  phone text,
  icon_key text not null default 'building',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catering_menus (
  id uuid primary key default gen_random_uuid(),
  name_fr text not null,
  name_en text,
  description_fr text not null default '',
  description_en text not null default '',
  image_url text,
  available_date date not null default current_date,
  city text not null,
  location_id uuid references public.catering_locations(id) on delete set null,
  base_price numeric(12,2),
  currency text not null default 'XAF',
  available_quantity integer check(available_quantity is null or available_quantity >= 0),
  published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catering_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('NVG-REST-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  client_id uuid not null references auth.users(id) on delete restrict,
  city text not null,
  delivery_address text not null,
  delivery_details text,
  contact_name text not null,
  contact_phone text not null,
  preferred_delivery_at timestamptz,
  status text not null default 'awaiting_review' check(status in (
    'awaiting_review','quoted','customer_confirmed','awaiting_delivery',
    'out_for_delivery','delivered','cancelled','rejected'
  )),
  subtotal numeric(12,2),
  delivery_fee numeric(12,2),
  additional_fee numeric(12,2) not null default 0,
  total_amount numeric(12,2),
  currency text not null default 'XAF',
  quote_note text,
  quoted_by uuid references auth.users(id) on delete set null,
  quoted_at timestamptz,
  confirmed_at timestamptz,
  assigned_driver_id uuid references auth.users(id) on delete set null,
  delivered_at timestamptz,
  delivery_note text,
  finance_status text not null default 'not_ready' check(finance_status in ('not_ready','receivable','received','reconciled')),
  finance_received_by uuid references auth.users(id) on delete set null,
  finance_received_at timestamptz,
  payment_method text,
  payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catering_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.catering_orders(id) on delete cascade,
  menu_id uuid not null references public.catering_menus(id) on delete restrict,
  menu_name text not null,
  quantity integer not null check(quantity > 0),
  quoted_unit_price numeric(12,2),
  line_total numeric(12,2),
  customer_note text
);

create table if not exists public.catering_order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.catering_orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  note text,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists catering_menus_public_idx on public.catering_menus(available_date,city,published);
create index if not exists catering_orders_client_idx on public.catering_orders(client_id,created_at desc);
create index if not exists catering_orders_status_idx on public.catering_orders(status,created_at);

alter table public.catering_locations enable row level security;
alter table public.catering_menus enable row level security;
alter table public.catering_orders enable row level security;
alter table public.catering_order_items enable row level security;
alter table public.catering_order_events enable row level security;

drop policy if exists "Public reads active catering locations" on public.catering_locations;
drop policy if exists "Public reads published catering menus" on public.catering_menus;
drop policy if exists "Clients read own catering orders" on public.catering_orders;
drop policy if exists "Clients create own catering orders" on public.catering_orders;
drop policy if exists "Clients confirm quoted catering orders" on public.catering_orders;
drop policy if exists "Clients read own catering items" on public.catering_order_items;
drop policy if exists "Clients create own catering items" on public.catering_order_items;
drop policy if exists "Order actors read catering events" on public.catering_order_events;
drop policy if exists "Maximus manages catering locations" on public.catering_locations;
drop policy if exists "Maximus manages catering menus" on public.catering_menus;
drop policy if exists "Maximus manages catering orders" on public.catering_orders;
drop policy if exists "Maximus manages catering items" on public.catering_order_items;
drop policy if exists "Maximus writes catering events" on public.catering_order_events;
create policy "Public reads active catering locations" on public.catering_locations
for select to anon,authenticated using(active or public.is_admin());
create policy "Public reads published catering menus" on public.catering_menus
for select to anon,authenticated using(published or public.is_admin());
create policy "Clients read own catering orders" on public.catering_orders
for select to authenticated using(client_id=(select auth.uid()) or public.is_admin() or public.maximus_has_access('sales/customer-orders','viewer'));
create policy "Clients create own catering orders" on public.catering_orders
for insert to authenticated with check(client_id=(select auth.uid()) and status='awaiting_review');
create policy "Clients confirm quoted catering orders" on public.catering_orders
for update to authenticated using(client_id=(select auth.uid()) and status='quoted')
with check(client_id=(select auth.uid()) and status='awaiting_delivery');
create policy "Clients read own catering items" on public.catering_order_items
for select to authenticated using(exists(select 1 from public.catering_orders o where o.id=order_id and (o.client_id=(select auth.uid()) or public.is_admin() or public.maximus_has_access('sales/customer-orders','viewer'))));
create policy "Clients create own catering items" on public.catering_order_items
for insert to authenticated with check(exists(select 1 from public.catering_orders o where o.id=order_id and o.client_id=(select auth.uid()) and o.status='awaiting_review'));
create policy "Order actors read catering events" on public.catering_order_events
for select to authenticated using(exists(select 1 from public.catering_orders o where o.id=order_id and (o.client_id=(select auth.uid()) or public.is_admin() or public.maximus_has_access('sales/customer-orders','viewer'))));

create policy "Maximus manages catering locations" on public.catering_locations
for all to authenticated using(public.is_admin() or public.maximus_has_access('sales/catering-locations','editor'))
with check(public.is_admin() or public.maximus_has_access('sales/catering-locations','editor'));
create policy "Maximus manages catering menus" on public.catering_menus
for all to authenticated using(public.is_admin() or public.maximus_has_access('sales/public-menus','editor'))
with check(public.is_admin() or public.maximus_has_access('sales/public-menus','editor'));
create policy "Maximus manages catering orders" on public.catering_orders
for all to authenticated using(public.is_admin() or public.maximus_has_access('sales/customer-orders','editor'))
with check(public.is_admin() or public.maximus_has_access('sales/customer-orders','editor'));
create policy "Maximus manages catering items" on public.catering_order_items
for all to authenticated using(public.is_admin() or public.maximus_has_access('sales/customer-orders','editor'))
with check(public.is_admin() or public.maximus_has_access('sales/customer-orders','editor'));
create policy "Maximus writes catering events" on public.catering_order_events
for insert to authenticated with check(public.is_admin() or public.maximus_has_access('sales/customer-orders','editor'));

drop trigger if exists set_updated_at on public.catering_locations;
create trigger set_updated_at before update on public.catering_locations for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.catering_menus;
create trigger set_updated_at before update on public.catering_menus for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.catering_orders;
create trigger set_updated_at before update on public.catering_orders for each row execute function public.set_updated_at();

-- Register catering as a first-class platform service.
alter table public.platform_service_access drop constraint if exists platform_service_access_service_key_check;
alter table public.platform_service_access add constraint platform_service_access_service_key_check check(service_key in (
  'client','academy','health','child_growth','teleconsultation','survey','project_management',
  'recruitment','nutritrack','maximus','catering','administration'
));

-- Homepage cards are organized around the four business categories.
update public.homepage_settings set
services='[
 {"title":"Suivi santé","text":"Consultations diététiques et nutritionnelles en présentiel ou en ligne, suivi santé autonome et suivi de la croissance de l enfant."},
 {"title":"Applications de support","text":"Applications dédiées à la malnutrition aiguë, aux enquêtes de sécurité alimentaire et nutrition et à la gestion de projets, programmes et portefeuilles."},
 {"title":"Formations certifiantes","text":"Parcours pratiques, évalués et certifiants conçus par des experts de la nutrition, de la santé et de la gestion."},
 {"title":"Service de restauration","text":"Consultez les menus disponibles dans votre ville et commandez des repas sains avec livraison."}
]'::jsonb,
services_en='[
 {"title":"Health services","text":"In-person or online dietetic and nutrition consultations, autonomous health monitoring and child growth monitoring."},
 {"title":"Support applications","text":"Applications for acute malnutrition care, food security and nutrition surveys, and project, programme and portfolio management."},
 {"title":"Certified training","text":"Practical, assessed certification pathways designed by nutrition, health and management experts."},
 {"title":"Catering service","text":"Browse menus available in your city and order healthy meals for delivery."}
]'::jsonb
where id=1;
-- Public menu photo album.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('catering-menu-images','catering-menu-images',true,8388608,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Public reads catering menu images" on storage.objects;
drop policy if exists "Maximus uploads catering menu images" on storage.objects;
drop policy if exists "Maximus updates catering menu images" on storage.objects;
drop policy if exists "Maximus deletes catering menu images" on storage.objects;
create policy "Public reads catering menu images" on storage.objects for select to anon,authenticated using(bucket_id='catering-menu-images');
create policy "Maximus uploads catering menu images" on storage.objects for insert to authenticated with check(bucket_id='catering-menu-images' and (public.is_admin() or public.maximus_has_access('sales/public-menus','creator')));
create policy "Maximus updates catering menu images" on storage.objects for update to authenticated using(bucket_id='catering-menu-images' and (public.is_admin() or public.maximus_has_access('sales/public-menus','editor')));
create policy "Maximus deletes catering menu images" on storage.objects for delete to authenticated using(bucket_id='catering-menu-images' and (public.is_admin() or public.maximus_has_access('sales/public-menus','validator')));