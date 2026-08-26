-- Project Asset Management, Wave B: asset assignment workflow — a real FK to the assigned staff
-- member (replacing free-text user_name), an endorse-from-own-interface step, a return-request/
-- return-endorse workflow, and the asset_manager role that can endorse returns without needing
-- full project access.
-- Run after ppm-wave10-asset-registration.sql and ppm-resources-timesheets.sql.

alter table public.ppm_equipment_checkouts add column if not exists assigned_resource_id uuid references public.ppm_resources(id) on delete set null;
alter table public.ppm_equipment_checkouts add column if not exists assigned_by uuid references auth.users(id) on delete set null;
alter table public.ppm_equipment_checkouts add column if not exists endorsed_at timestamptz;
alter table public.ppm_equipment_checkouts add column if not exists return_requested_at timestamptz;
alter table public.ppm_equipment_checkouts add column if not exists return_requested_note text;
alter table public.ppm_equipment_checkouts add column if not exists return_endorsed_at timestamptz;
alter table public.ppm_equipment_checkouts add column if not exists return_endorsed_by uuid references auth.users(id) on delete set null;

alter table public.ppm_equipment_checkouts drop constraint if exists ppm_equipment_checkouts_status_check;
alter table public.ppm_equipment_checkouts add constraint ppm_equipment_checkouts_status_check check(status in (
  'pending_endorsement','checked_out','return_requested','returned','lost','damaged'
));

create index if not exists ppm_equipment_checkouts_assigned_resource on public.ppm_equipment_checkouts(assigned_resource_id, status);

-- Staff self-service: read own assignment rows, resolved through their own linked
-- ppm_resources.user_id (mirrors ppm_ops_partner_site_access's shape from the sibling Operations
-- Management sub-module).
drop policy if exists "PPM staff read own assignments" on public.ppm_equipment_checkouts;
create policy "PPM staff read own assignments" on public.ppm_equipment_checkouts for select to authenticated
  using(exists(select 1 from public.ppm_resources r where r.id = assigned_resource_id and r.user_id = (select auth.uid())));

drop policy if exists "PPM staff read assigned asset resources" on public.ppm_resources;
create policy "PPM staff read assigned asset resources" on public.ppm_resources for select to authenticated
  using(exists(
    select 1 from public.ppm_equipment_checkouts c
    join public.ppm_resources staff_r on staff_r.id = c.assigned_resource_id
    where c.resource_id = ppm_resources.id and staff_r.user_id = (select auth.uid())
  ));

-- Two narrow, transition-specific policies — a plain assignee may endorse their own receipt
-- (pending_endorsement -> checked_out) and request a return (checked_out -> return_requested),
-- but cannot mark their own return as fully 'returned' — that requires the asset_manager policy
-- below (or full ppm_project_access, already granted by the existing "PPM project members manage
-- equipment checkouts" policy).
drop policy if exists "PPM staff endorse own assignment" on public.ppm_equipment_checkouts;
create policy "PPM staff endorse own assignment" on public.ppm_equipment_checkouts for update to authenticated
  using(status = 'pending_endorsement' and exists(select 1 from public.ppm_resources r where r.id = assigned_resource_id and r.user_id = (select auth.uid())))
  with check(status = 'checked_out' and exists(select 1 from public.ppm_resources r where r.id = assigned_resource_id and r.user_id = (select auth.uid())));

drop policy if exists "PPM staff request own return" on public.ppm_equipment_checkouts;
create policy "PPM staff request own return" on public.ppm_equipment_checkouts for update to authenticated
  using(status = 'checked_out' and exists(select 1 from public.ppm_resources r where r.id = assigned_resource_id and r.user_id = (select auth.uid())))
  with check(status = 'return_requested' and exists(select 1 from public.ppm_resources r where r.id = assigned_resource_id and r.user_id = (select auth.uid())));

-- New role: asset_manager may endorse returns (and otherwise manage checkouts) without needing
-- full ppm_project_access. Scoped ONLY to this table, not folded into ppm_project_access(), so
-- holding this role doesn't widen access to any other PPM table.
drop policy if exists "PPM asset managers manage equipment checkouts" on public.ppm_equipment_checkouts;
create policy "PPM asset managers manage equipment checkouts" on public.ppm_equipment_checkouts for all to authenticated
  using(public.ppm_role_matches(array['asset_manager'],'project',project_id))
  with check(public.ppm_role_matches(array['asset_manager'],'project',project_id));
