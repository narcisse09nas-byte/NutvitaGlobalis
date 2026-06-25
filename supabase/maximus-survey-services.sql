-- Maximus internal management and Survey service foundation.
-- Run after nutritrack-centralized.sql.

create table if not exists public.survey_projects (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  survey_type text not null check(survey_type in ('food_security','nutrition','mixed','other')),
  country text,
  description text,
  status text not null default 'draft' check(status in ('draft','planned','collecting','analysis','completed','archived')),
  starts_at date,
  ends_at date,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.survey_projects(id) on delete cascade,
  submitted_by uuid references auth.users(id) on delete set null,
  cluster_reference text,
  response_data jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now()
);

create table if not exists public.survey_team_members (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.survey_projects(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  role text not null,
  email text,
  phone text,
  responsibilities text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.survey_clusters (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.survey_projects(id) on delete cascade,
  cluster_code text not null,
  cluster_name text not null,
  region text,
  district text,
  population integer not null default 0 check(population>=0),
  villages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(survey_id,cluster_code)
);

create table if not exists public.survey_samples (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.survey_projects(id) on delete cascade,
  cluster_id uuid not null references public.survey_clusters(id) on delete cascade,
  probability numeric,
  interval_start numeric,
  interval_end numeric,
  assigned_member_ids uuid[] not null default '{}',
  selected_villages jsonb not null default '[]'::jsonb,
  logistics jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check(status in ('pending','prepared','deployed','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(survey_id,cluster_id)
);

create table if not exists public.survey_forms (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.survey_projects(id) on delete cascade,
  title text not null,
  form_code text not null,
  version text not null default '1',
  source_type text not null default 'builder' check(source_type in ('builder','xlsform')),
  definition jsonb not null default '{"questions":[]}'::jsonb,
  xform_xml text,
  status text not null default 'draft' check(status in ('draft','pending_endorsement','endorsed','rejected','archived')),
  status_history jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(survey_id,form_code)
);

create table if not exists public.survey_analysis_reports (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.survey_projects(id) on delete cascade,
  title text not null,
  report_type text not null,
  source_file_name text,
  dataset_summary jsonb not null default '{}'::jsonb,
  quality_report jsonb not null default '{}'::jsonb,
  analysis_results jsonb not null default '{}'::jsonb,
  ai_interpretation jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists survey_projects_owner on public.survey_projects(owner_user_id,created_at desc);
create index if not exists survey_responses_survey on public.survey_responses(survey_id,submitted_at desc);
create index if not exists survey_team_survey on public.survey_team_members(survey_id,created_at);
create index if not exists survey_clusters_survey on public.survey_clusters(survey_id,created_at);
create index if not exists survey_samples_survey on public.survey_samples(survey_id,status);
create index if not exists survey_forms_survey on public.survey_forms(survey_id,status,created_at desc);
create index if not exists survey_analysis_survey on public.survey_analysis_reports(survey_id,created_at desc);

alter table public.survey_projects enable row level security;
alter table public.survey_responses enable row level security;
alter table public.survey_team_members enable row level security;
alter table public.survey_clusters enable row level security;
alter table public.survey_samples enable row level security;
alter table public.survey_forms enable row level security;
alter table public.survey_analysis_reports enable row level security;

create or replace function public.can_manage_survey(p_survey_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.is_admin() or exists(
    select 1 from public.survey_projects project
    where project.id=p_survey_id and project.owner_user_id=(select auth.uid())
  );
$$;

drop policy if exists "Survey owners manage projects" on public.survey_projects;
create policy "Survey owners manage projects" on public.survey_projects for all to authenticated
using(owner_user_id=(select auth.uid()) or public.is_admin())
with check(owner_user_id=(select auth.uid()) or public.is_admin());

drop policy if exists "Survey owners read responses" on public.survey_responses;
create policy "Survey owners read responses" on public.survey_responses for select to authenticated
using(public.is_admin() or exists(
  select 1 from public.survey_projects project
  where project.id=survey_id and project.owner_user_id=(select auth.uid())
));

drop policy if exists "Authenticated users submit survey responses" on public.survey_responses;
create policy "Authenticated users submit survey responses" on public.survey_responses for insert to authenticated
with check(submitted_by=(select auth.uid()));

drop policy if exists "Survey team managed by owner" on public.survey_team_members;
create policy "Survey team managed by owner" on public.survey_team_members for all to authenticated
using(public.can_manage_survey(survey_id)) with check(public.can_manage_survey(survey_id));
drop policy if exists "Survey clusters managed by owner" on public.survey_clusters;
create policy "Survey clusters managed by owner" on public.survey_clusters for all to authenticated
using(public.can_manage_survey(survey_id)) with check(public.can_manage_survey(survey_id));
drop policy if exists "Survey samples managed by owner" on public.survey_samples;
create policy "Survey samples managed by owner" on public.survey_samples for all to authenticated
using(public.can_manage_survey(survey_id)) with check(public.can_manage_survey(survey_id));
drop policy if exists "Survey forms managed by owner" on public.survey_forms;
create policy "Survey forms managed by owner" on public.survey_forms for all to authenticated
using(public.can_manage_survey(survey_id)) with check(public.can_manage_survey(survey_id));
drop policy if exists "Survey reports managed by owner" on public.survey_analysis_reports;
create policy "Survey reports managed by owner" on public.survey_analysis_reports for all to authenticated
using(public.can_manage_survey(survey_id)) with check(public.can_manage_survey(survey_id));

drop trigger if exists set_updated_at on public.survey_projects;
create trigger set_updated_at before update on public.survey_projects
for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.survey_team_members;
create trigger set_updated_at before update on public.survey_team_members
for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.survey_clusters;
create trigger set_updated_at before update on public.survey_clusters
for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.survey_samples;
create trigger set_updated_at before update on public.survey_samples
for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.survey_forms;
create trigger set_updated_at before update on public.survey_forms
for each row execute function public.set_updated_at();

revoke all on function public.can_manage_survey(uuid) from public;
grant execute on function public.can_manage_survey(uuid) to authenticated;
