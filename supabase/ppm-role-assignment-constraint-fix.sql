-- Align ppm_role_assignments with the role vocabulary exposed by Promanage.
-- Safe to run more than once.
alter table public.ppm_role_assignments add column if not exists custom_role_label text;
alter table public.ppm_role_assignments drop constraint if exists ppm_role_assignments_role_check;
alter table public.ppm_role_assignments add constraint ppm_role_assignments_role_check check(role in (
  'super_admin','org_admin','portfolio_manager','program_manager','project_manager',
  'project_officer','meal_officer','finance_officer','procurement_officer','quality_officer',
  'technical_lead','team_member','viewer','auditor','donor_viewer','asset_manager','other'
));
alter table public.ppm_role_assignments drop constraint if exists ppm_role_assignments_custom_role_check;
alter table public.ppm_role_assignments add constraint ppm_role_assignments_custom_role_check check(
  role <> 'other' or nullif(trim(custom_role_label), '') is not null
);