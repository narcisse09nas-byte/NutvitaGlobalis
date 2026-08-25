-- Operations Management (Wave 7): external cooperative/COGES portal — invite-based partner
-- profiles + site scoping, mirroring the dietitian_profiles/requirePartner() pattern.
-- Run after ppm-ops-reporting-invoicing.sql.

create table if not exists public.ppm_ops_partner_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  candidate_id uuid not null references auth.users(id) unique,
  partner_type text not null check(partner_type in ('coges','cooperative')),
  cooperative_id uuid references public.ppm_ops_cooperatives(id),
  full_name text not null,
  phone text,
  status text not null default 'active' check(status in ('invited','active','suspended')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Many-to-many: which school(s) a partner can see/act on. `role` carries the COGES seat
-- (president/member) for coges-type partners; null for cooperative-type partners.
create table if not exists public.ppm_ops_partner_site_links (
  id uuid primary key default gen_random_uuid(),
  partner_profile_id uuid not null references public.ppm_ops_partner_profiles(id) on delete cascade,
  site_id uuid not null references public.ppm_ops_sites(id) on delete cascade,
  role text,
  unique(partner_profile_id, site_id)
);

create index if not exists ppm_ops_partner_site_links_partner on public.ppm_ops_partner_site_links(partner_profile_id);
create index if not exists ppm_ops_partner_site_links_site on public.ppm_ops_partner_site_links(site_id);

alter table public.ppm_ops_partner_profiles enable row level security;
alter table public.ppm_ops_partner_site_links enable row level security;

drop policy if exists "PPM partners read own profile" on public.ppm_ops_partner_profiles;
create policy "PPM partners read own profile" on public.ppm_ops_partner_profiles
  for select to authenticated using(candidate_id = (select auth.uid()) or public.platform_has_access('project_management'));
-- Invites are actually authorized in application code (the invite route checks the caller's
-- org/project role before using the service-role client) — this policy is a simple secondary
-- guard, not the primary authorization, since cooperative_id is null for coges-type partners and
-- so can't always resolve an organization to check a scoped role against.
drop policy if exists "PPM staff manage partner profiles" on public.ppm_ops_partner_profiles;
create policy "PPM staff manage partner profiles" on public.ppm_ops_partner_profiles for all to authenticated
  using(public.is_admin()) with check(public.is_admin());

drop policy if exists "PPM partners read own site links" on public.ppm_ops_partner_site_links;
create policy "PPM partners read own site links" on public.ppm_ops_partner_site_links
  for select to authenticated using(
    exists(select 1 from public.ppm_ops_partner_profiles p where p.id = partner_profile_id and p.candidate_id = (select auth.uid()))
    or public.platform_has_access('project_management')
  );
drop policy if exists "PPM staff manage partner site links" on public.ppm_ops_partner_site_links;
create policy "PPM staff manage partner site links" on public.ppm_ops_partner_site_links
  for all to authenticated using(public.is_admin()) with check(public.is_admin());

-- External partner visibility on the documents addressed to them — a cooperative/COGES contact
-- sees/acts on a PO, delivery note or invoice only for a site they're linked to.
create or replace function public.ppm_ops_partner_site_access(p_site_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.ppm_ops_partner_profiles p
    join public.ppm_ops_partner_site_links l on l.partner_profile_id = p.id
    where p.candidate_id = (select auth.uid()) and p.status = 'active' and l.site_id = p_site_id
  );
$$;

drop policy if exists "PPM partners view their purchase orders" on public.ppm_ops_purchase_orders;
create policy "PPM partners view their purchase orders" on public.ppm_ops_purchase_orders
  for select to authenticated using(public.ppm_ops_partner_site_access(site_id));
drop policy if exists "PPM partners update their purchase orders" on public.ppm_ops_purchase_orders;
create policy "PPM partners update their purchase orders" on public.ppm_ops_purchase_orders
  for update to authenticated using(public.ppm_ops_partner_site_access(site_id)) with check(public.ppm_ops_partner_site_access(site_id));

drop policy if exists "PPM partners view their delivery notes" on public.ppm_ops_delivery_notes;
create policy "PPM partners view their delivery notes" on public.ppm_ops_delivery_notes
  for select to authenticated using(public.ppm_ops_partner_site_access(site_id));
drop policy if exists "PPM partners update their delivery notes" on public.ppm_ops_delivery_notes;
create policy "PPM partners update their delivery notes" on public.ppm_ops_delivery_notes
  for update to authenticated using(public.ppm_ops_partner_site_access(site_id)) with check(public.ppm_ops_partner_site_access(site_id));

-- A cooperative-type partner may update their own cooperative's own record (used by the
-- "Mon profil" page to keep the payment account current) — read access to the wider org's
-- cooperative catalog is still gated by the existing org-role policy above.
drop policy if exists "PPM cooperative partners update own cooperative" on public.ppm_ops_cooperatives;
create policy "PPM cooperative partners update own cooperative" on public.ppm_ops_cooperatives
  for update to authenticated using(
    exists(select 1 from public.ppm_ops_partner_profiles p where p.cooperative_id = id and p.candidate_id = (select auth.uid()) and p.status = 'active')
  ) with check(
    exists(select 1 from public.ppm_ops_partner_profiles p where p.cooperative_id = id and p.candidate_id = (select auth.uid()) and p.status = 'active')
  );

drop policy if exists "PPM partners view their invoices" on public.ppm_ops_invoices;
create policy "PPM partners view their invoices" on public.ppm_ops_invoices
  for select to authenticated using(public.ppm_ops_partner_site_access(site_id));
drop policy if exists "PPM partners update their invoices" on public.ppm_ops_invoices;
create policy "PPM partners update their invoices" on public.ppm_ops_invoices
  for update to authenticated using(public.ppm_ops_partner_site_access(site_id)) with check(public.ppm_ops_partner_site_access(site_id));
