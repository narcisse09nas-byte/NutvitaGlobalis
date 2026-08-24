-- Refinement program, Wave 5: Ressources — resource-type-conditional fields and weekly timesheets.
-- Run after ppm-project-resources.sql (or equivalent Sprint 12 migration).

alter table public.ppm_resources add column if not exists condition_notes text;

alter table public.ppm_timesheets add column if not exists days numeric(5,2);
alter table public.ppm_timesheets add column if not exists week_start date;
