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

alter table public.survey_responses add column if not exists response_reference text;
alter table public.survey_responses add column if not exists source_type text not null default 'local';
alter table public.survey_responses add column if not exists form_id uuid;
alter table public.survey_responses add column if not exists cluster_id uuid;
alter table public.survey_responses add column if not exists village_code text;
alter table public.survey_responses add column if not exists village_name text;
alter table public.survey_responses add column if not exists enumerator_id uuid;
alter table public.survey_responses add column if not exists sequence_no integer;
alter table public.survey_responses add column if not exists import_batch text;
alter table public.survey_responses add column if not exists source_row integer;
alter table public.survey_responses drop constraint if exists survey_responses_source_type_check;
alter table public.survey_responses add constraint survey_responses_source_type_check
  check(source_type in ('local','imported','api'));
create unique index if not exists survey_response_reference
on public.survey_responses(survey_id,response_reference)
where response_reference is not null;

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

alter table public.survey_team_members add column if not exists member_code text;
update public.survey_team_members
set member_code=upper(left(regexp_replace(coalesce(first_name,'')||coalesce(last_name,''),'[^a-zA-Z0-9]','','g'),3))||right(replace(id::text,'-',''),3)
where member_code is null;
create unique index if not exists survey_team_member_code
on public.survey_team_members(survey_id,member_code);

create or replace function public.set_survey_member_code()
returns trigger language plpgsql set search_path=public as $$
begin
  if nullif(new.member_code,'') is null then
    new.member_code := upper(left(regexp_replace(coalesce(new.first_name,'')||coalesce(new.last_name,''),'[^a-zA-Z0-9]','','g'),3))
      || right(replace(new.id::text,'-',''),3);
  end if;
  return new;
end $$;
drop trigger if exists set_survey_member_code on public.survey_team_members;
create trigger set_survey_member_code before insert or update of first_name,last_name,member_code
on public.survey_team_members for each row execute function public.set_survey_member_code();

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

alter table public.survey_forms add column if not exists odk_status text not null default 'not_configured';
alter table public.survey_forms add column if not exists odk_configuration jsonb not null default '{}'::jsonb;
alter table public.survey_forms add column if not exists odk_deployed_at timestamptz;
alter table public.survey_forms drop constraint if exists survey_forms_odk_status_check;
alter table public.survey_forms add constraint survey_forms_odk_status_check
  check(odk_status in ('not_configured','configured','deployed','revoked','error'));

alter table public.survey_responses drop constraint if exists survey_responses_form_id_fkey;
alter table public.survey_responses add constraint survey_responses_form_id_fkey
  foreign key(form_id) references public.survey_forms(id) on delete set null;
alter table public.survey_responses drop constraint if exists survey_responses_cluster_id_fkey;
alter table public.survey_responses add constraint survey_responses_cluster_id_fkey
  foreign key(cluster_id) references public.survey_clusters(id) on delete set null;
alter table public.survey_responses drop constraint if exists survey_responses_enumerator_id_fkey;
alter table public.survey_responses add constraint survey_responses_enumerator_id_fkey
  foreign key(enumerator_id) references public.survey_team_members(id) on delete set null;

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

create or replace function public.register_local_survey_response(
  p_survey_id uuid,
  p_form_id uuid,
  p_cluster_id uuid,
  p_village_code text,
  p_village_name text,
  p_enumerator_id uuid,
  p_answers jsonb
) returns public.survey_responses
language plpgsql security definer set search_path=public as $$
declare
  cluster_record public.survey_clusters;
  enumerator_record public.survey_team_members;
  form_record public.survey_forms;
  next_sequence integer;
  generated_reference text;
  created_response public.survey_responses;
  safe_cluster text;
  safe_village text;
  safe_enumerator text;
begin
  if (select auth.uid()) is null then raise exception 'Authentification requise.'; end if;
  select * into cluster_record from public.survey_clusters
  where id=p_cluster_id and survey_id=p_survey_id;
  select * into enumerator_record from public.survey_team_members
  where id=p_enumerator_id and survey_id=p_survey_id;
  select * into form_record from public.survey_forms
  where id=p_form_id and survey_id=p_survey_id and status='endorsed';
  if cluster_record.id is null then raise exception 'Grappe invalide.'; end if;
  if enumerator_record.id is null then raise exception 'Enqueteur invalide.'; end if;
  if form_record.id is null then raise exception 'Questionnaire valide introuvable.'; end if;
  if not public.can_manage_survey(p_survey_id)
    and not exists(select 1 from public.survey_team_members where id=p_enumerator_id and survey_id=p_survey_id)
  then raise exception 'Acces refuse.'; end if;

  safe_cluster := upper(left(regexp_replace(cluster_record.cluster_code,'[^a-zA-Z0-9]','','g'),12));
  safe_village := upper(left(regexp_replace(coalesce(p_village_code,p_village_name),'[^a-zA-Z0-9]','','g'),12));
  safe_enumerator := upper(left(regexp_replace(coalesce(enumerator_record.member_code,enumerator_record.id::text),'[^a-zA-Z0-9]','','g'),12));
  if safe_village='' then raise exception 'Code village/ZD requis.'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_survey_id::text||':'||cluster_record.id::text||':'||safe_village,0));
  select coalesce(max(sequence_no),0)+1 into next_sequence
  from public.survey_responses
  where survey_id=p_survey_id and cluster_id=p_cluster_id and village_code=p_village_code and source_type='local';
  generated_reference := format('G-%s-V-%s-E-%s-Q-%s',safe_cluster,safe_village,safe_enumerator,lpad(next_sequence::text,4,'0'));

  insert into public.survey_responses(
    survey_id,submitted_by,cluster_reference,response_reference,source_type,
    form_id,cluster_id,village_code,village_name,enumerator_id,sequence_no,response_data
  ) values(
    p_survey_id,(select auth.uid()),cluster_record.cluster_code,generated_reference,'local',
    p_form_id,p_cluster_id,p_village_code,p_village_name,p_enumerator_id,next_sequence,
    jsonb_build_object('form_id',form_record.id,'form_code',form_record.form_code,'answers',coalesce(p_answers,'{}'::jsonb))
  ) returning * into created_response;
  return created_response;
end $$;

revoke all on function public.register_local_survey_response(uuid,uuid,uuid,text,text,uuid,jsonb) from public;
grant execute on function public.register_local_survey_response(uuid,uuid,uuid,text,text,uuid,jsonb) to authenticated;

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
