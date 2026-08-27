-- Resource RLS, budget workflow and flexible timesheets.
-- Safe to run more than once; run after ppm-wave11-asset-assignment.sql.

-- Avoid recursive RLS: the policy on ppm_resources must not query ppm_resources directly.
create or replace function public.ppm_can_read_assigned_asset(p_resource_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.ppm_equipment_checkouts c
    join public.ppm_resources staff_r on staff_r.id = c.assigned_resource_id
    where c.resource_id = p_resource_id
      and staff_r.user_id = (select auth.uid())
  );
$$;
revoke all on function public.ppm_can_read_assigned_asset(uuid) from public;
grant execute on function public.ppm_can_read_assigned_asset(uuid) to authenticated;
drop policy if exists "PPM staff read assigned asset resources" on public.ppm_resources;
create policy "PPM staff read assigned asset resources" on public.ppm_resources
for select to authenticated using (public.ppm_can_read_assigned_asset(id));

-- Broader resource catalogue requested by the planning form.
alter table public.ppm_resources drop constraint if exists ppm_resources_type_check;
alter table public.ppm_resources add constraint ppm_resources_type_check
check(type in ('human','consultant','equipment','vehicle','infrastructure','service','consumable','material','other'));

-- Budget lines use the standard submit -> verify -> approve workflow.
alter table public.ppm_budget_lines drop constraint if exists ppm_budget_lines_status_check;
update public.ppm_budget_lines set status='approved' where status in ('active','closed');
update public.ppm_budget_lines set status='draft' where status='on_hold';
alter table public.ppm_budget_lines add constraint ppm_budget_lines_status_check
check(status in ('draft','submitted','verified','approved','returned','rejected','cancelled'));
alter table public.ppm_budget_lines alter column status set default 'draft';
alter table public.ppm_budget_lines add column if not exists submitted_at timestamptz;
alter table public.ppm_budget_lines add column if not exists verified_at timestamptz;
alter table public.ppm_budget_lines add column if not exists verified_by_name text;
alter table public.ppm_budget_lines add column if not exists approved_at timestamptz;
alter table public.ppm_budget_lines add column if not exists approved_by_name text;
alter table public.ppm_budget_lines add column if not exists workflow_note text;

-- Flexible duration and explicit period for timesheets; legacy columns remain compatible.
alter table public.ppm_timesheets add column if not exists end_date date;
alter table public.ppm_timesheets add column if not exists duration numeric(8,2);
alter table public.ppm_timesheets add column if not exists duration_unit text;
do $$ begin
  alter table public.ppm_timesheets add constraint ppm_timesheets_duration_unit_check
  check(duration_unit is null or duration_unit in ('hour','day','week','month'));
exception when duplicate_object then null; end $$;
update public.ppm_timesheets
set end_date=coalesce(end_date, week_start, entry_date),
    duration=coalesce(duration, days, hours),
    duration_unit=coalesce(duration_unit, case when days is not null then 'day' else 'hour' end)
where end_date is null or duration is null or duration_unit is null;
