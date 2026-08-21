-- Execution add-on, Phase K: Communication Actuals + Stakeholder Interactions (spec sections
-- 20-21). The Communication Plan and Stakeholder Register (Sprint 16) stay the Planned layer;
-- these two tables are their Reported/Actual counterpart.
-- Run after ppm-resources-timesheets.sql (reuses public.ppm_project_access).

create table if not exists public.ppm_communication_actuals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  communication_item_id uuid references public.ppm_communication_items(id) on delete set null,
  planned_date date,
  actual_date date,
  stakeholders text,
  participants text,
  channel text,
  subject text not null,
  key_messages text,
  information_shared text,
  feedback_received text,
  decisions text,
  actions text,
  responsible_name text,
  deadline date,
  minutes_reference text,
  status text not null default 'draft' check(status in ('draft','completed','validated')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ppm_stakeholder_interactions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  stakeholder_id uuid not null references public.ppm_stakeholders(id) on delete cascade,
  interaction_date date,
  interaction_type text,
  participants text,
  objective text,
  topics_discussed text,
  concerns text,
  expectations text,
  engagement_observed text,
  decisions text,
  actions text,
  responsible_name text,
  deadline date,
  proposed_influence_level text check(proposed_influence_level in ('low','medium','high')),
  proposed_interest_level text check(proposed_interest_level in ('low','medium','high')),
  proposed_position text check(proposed_position in ('champion','supporter','neutral','critic','blocker')),
  position_change_status text not null default 'not_proposed' check(position_change_status in ('not_proposed','proposed','approved','rejected')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ppm_communication_actuals_project on public.ppm_communication_actuals(project_id,status);
create index if not exists ppm_stakeholder_interactions_stakeholder on public.ppm_stakeholder_interactions(stakeholder_id);

alter table public.ppm_communication_actuals enable row level security;
alter table public.ppm_stakeholder_interactions enable row level security;

drop policy if exists "PPM users read communication actuals" on public.ppm_communication_actuals;
create policy "PPM users read communication actuals" on public.ppm_communication_actuals for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM project members manage communication actuals" on public.ppm_communication_actuals;
create policy "PPM project members manage communication actuals" on public.ppm_communication_actuals for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));

drop policy if exists "PPM users read stakeholder interactions" on public.ppm_stakeholder_interactions;
create policy "PPM users read stakeholder interactions" on public.ppm_stakeholder_interactions for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM project members manage stakeholder interactions" on public.ppm_stakeholder_interactions;
create policy "PPM project members manage stakeholder interactions" on public.ppm_stakeholder_interactions for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));
