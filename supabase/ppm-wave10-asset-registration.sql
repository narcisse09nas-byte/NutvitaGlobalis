-- Project Asset Management, Wave A: asset registration — origin tracking on ppm_resources
-- (equipment/vehicle/infrastructure), so a resource can be a mere planning placeholder
-- (origin_type is null) or a concretely-registered asset (origin_type set).
-- Run after ppm-wave9-staff-accounts.sql and ppm-procurement-quality.sql.

alter table public.ppm_resources add column if not exists asset_code text;
alter table public.ppm_resources add column if not exists origin_type text check(origin_type is null or origin_type in ('purchase','donation','transfer','internal_production','other'));
alter table public.ppm_resources add column if not exists origin_procurement_item_id uuid references public.ppm_procurement_items(id) on delete set null;
alter table public.ppm_resources add column if not exists origin_donor_name text;
alter table public.ppm_resources add column if not exists origin_transfer_project_id uuid references public.ppm_projects(id) on delete set null;
alter table public.ppm_resources add column if not exists origin_other_detail text;
alter table public.ppm_resources add column if not exists origin_notes text;
alter table public.ppm_resources add column if not exists current_location text;
alter table public.ppm_resources add column if not exists registered_at timestamptz;
alter table public.ppm_resources add column if not exists registered_by uuid references auth.users(id) on delete set null;

create unique index if not exists ppm_resources_asset_code_unique on public.ppm_resources(project_id, asset_code) where asset_code is not null;
create index if not exists ppm_resources_origin_procurement_item on public.ppm_resources(origin_procurement_item_id);

-- Own-row read for the new staff self-service portal (mon-espace-ppm) — a plain assigned-asset
-- staff member typically won't hold a platform_service_access grant for 'project_management' in
-- the broad sense, so this can't rely on platform_has_access() the way manager-facing reads do.
drop policy if exists "PPM staff read own resource row" on public.ppm_resources;
create policy "PPM staff read own resource row" on public.ppm_resources for select to authenticated
  using(user_id = (select auth.uid()));

-- Extend the shared PPM audit trail with the new asset entity types.
alter table public.ppm_history drop constraint if exists ppm_history_entity_type_check;
alter table public.ppm_history add constraint ppm_history_entity_type_check check(entity_type in (
  'organization','portfolio','program','project',
  'distribution_operation','distribution_site','ingredient_price','distribution_plan',
  'distribution_need','purchase_order','delivery_note','activity_report','invoice','partner_profile',
  'asset','asset_assignment','asset_inventory_session'
));
