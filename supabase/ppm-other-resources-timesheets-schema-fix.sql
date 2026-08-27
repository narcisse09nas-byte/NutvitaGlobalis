-- Promanage planning: other resources and flexible timesheets schema repair.
-- Safe to run repeatedly in the Supabase SQL Editor.

begin;

alter table public.ppm_resources
  add column if not exists type_other_detail text;

alter table public.ppm_timesheets
  add column if not exists week_start date,
  add column if not exists end_date date,
  add column if not exists days numeric(5,2),
  add column if not exists duration numeric(8,2),
  add column if not exists duration_unit text;

alter table public.ppm_timesheets
  drop constraint if exists ppm_timesheets_duration_unit_check;
alter table public.ppm_timesheets
  add constraint ppm_timesheets_duration_unit_check
  check (duration_unit is null or duration_unit in ('hour','day','week','month'));

update public.ppm_timesheets
set week_start = coalesce(week_start, entry_date),
    end_date = coalesce(end_date, week_start, entry_date),
    duration = coalesce(duration, days, hours),
    duration_unit = coalesce(
      duration_unit,
      case when days is not null then 'day' else 'hour' end
    )
where week_start is null
   or end_date is null
   or duration is null
   or duration_unit is null;

comment on column public.ppm_resources.type_other_detail is
  'Required detail when the planned resource type is other.';
comment on column public.ppm_timesheets.duration is
  'Work duration expressed in duration_unit.';
comment on column public.ppm_timesheets.duration_unit is
  'Unit for duration: hour, day, week or month.';

commit;

-- Supabase API schema cache refresh. The notification takes effect after commit.
notify pgrst, 'reload schema';