-- Promanage achievements: explicit reporting period.
-- Safe to run repeatedly in the Supabase SQL Editor.

begin;

alter table public.ppm_achievements
  add column if not exists reporting_period_start date,
  add column if not exists reporting_period_end date;

alter table public.ppm_achievements
  drop constraint if exists ppm_achievements_reporting_period_check;
alter table public.ppm_achievements
  add constraint ppm_achievements_reporting_period_check
  check (
    reporting_period_start is null
    or reporting_period_end is null
    or reporting_period_end >= reporting_period_start
  );

comment on column public.ppm_achievements.reporting_period_start is
  'Start date of the reporting period.';
comment on column public.ppm_achievements.reporting_period_end is
  'End date of the reporting period.';

commit;
notify pgrst, 'reload schema';
