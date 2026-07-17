-- Central NutVitaGlobalis service and role access. Run after advanced-admin-security.sql.
create table if not exists public.platform_service_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service_key text not null,
  roles text[] not null default '{}', active boolean not null default true,
  granted_by uuid references auth.users(id), expires_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,service_key)
);
alter table public.platform_service_access drop constraint if exists platform_service_access_service_key_check;
alter table public.platform_service_access add constraint platform_service_access_service_key_check check(service_key in ('client','academy','health','child_growth','teleconsultation','survey','project_management','recruitment','nutritrack','maximus','administration'));
create table if not exists public.platform_session_selections (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  service_key text not null, role_key text not null, selected_at timestamptz not null default now(),
  user_agent text
);
alter table public.platform_session_selections drop constraint if exists platform_session_selections_service_role_check;
update public.platform_session_selections set role_key='super_admin'
where service_key='administration' and role_key='admin';
alter table public.platform_session_selections add constraint platform_session_selections_service_role_check check (
  (service_key='client' and role_key='client') or
  (service_key='academy' and role_key in ('student','instructor','admin')) or
  (service_key in ('health','child_growth','teleconsultation') and role_key in ('client','nutritionist','admin')) or
  (service_key in ('survey','project_management','nutritrack') and role_key in ('client','admin')) or
  (service_key='recruitment' and role_key in ('candidate','admin')) or
  (service_key='maximus' and role_key in ('staff','admin')) or
  (service_key='administration' and role_key='super_admin')
);
create index if not exists platform_session_selections_user_latest_idx
  on public.platform_session_selections(user_id,selected_at desc);
alter table public.formations add column if not exists academy_course_id uuid unique;
alter table public.formations add column if not exists source text not null default 'nutvita';

create or replace function public.is_platform_principal() returns boolean language sql stable security definer set search_path=public as $$
  select public.is_super_admin() or lower(coalesce((select email from auth.users where id=(select auth.uid())),'')) in ('pauln.zebaze@gmail.com','contact@nutvitaglobalis.com');
$$;
create or replace function public.platform_has_access(p_service text,p_role text default null) returns boolean language sql stable security definer set search_path=public as $$
  select public.is_platform_principal() or exists(select 1 from public.platform_service_access a where a.user_id=(select auth.uid()) and a.service_key=p_service and a.active and (a.expires_at is null or a.expires_at>now()) and (p_role is null or p_role=any(a.roles)));
$$;
create or replace function public.platform_active_session_matches(p_service text,p_roles text[] default null) returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.platform_session_selections s
    where s.user_id=(select auth.uid())
      and s.selected_at>now()-interval '12 hours'
      and s.service_key=p_service
      and (p_roles is null or s.role_key=any(p_roles))
    order by s.selected_at desc limit 1
  ) and (
    select s.service_key=p_service and (p_roles is null or s.role_key=any(p_roles))
    from public.platform_session_selections s
    where s.user_id=(select auth.uid()) and s.selected_at>now()-interval '12 hours'
    order by s.selected_at desc limit 1
  );
$$;
alter table public.platform_service_access enable row level security;
alter table public.platform_session_selections enable row level security;
drop policy if exists "Users read own platform access" on public.platform_service_access;
drop policy if exists "Principals manage platform access" on public.platform_service_access;
drop policy if exists "Users add own session selection" on public.platform_session_selections;
drop policy if exists "Users read own session selections" on public.platform_session_selections;
create policy "Users read own platform access" on public.platform_service_access for select to authenticated using(user_id=(select auth.uid()) or public.is_platform_principal());
create policy "Principals manage platform access" on public.platform_service_access for all to authenticated using(public.is_platform_principal()) with check(public.is_platform_principal());
create policy "Users add own session selection" on public.platform_session_selections for insert to authenticated
with check(user_id=(select auth.uid()) and public.platform_has_access(service_key,role_key));
create policy "Users read own session selections" on public.platform_session_selections for select to authenticated using(user_id=(select auth.uid()) or public.is_platform_principal());

insert into public.admin_users(id,email,full_name,role,active)
select id,email,coalesce(raw_user_meta_data->>'full_name',email),'super_admin',true from auth.users
where lower(email) in ('pauln.zebaze@gmail.com','contact@nutvitaglobalis.com')
on conflict(id) do update set role='super_admin',active=true,email=excluded.email;

insert into public.recruitment_applications(candidate_id,full_name,email,status)
select id,coalesce(raw_user_meta_data->>'full_name',email),email,'integrated' from auth.users
where lower(email) in ('pauln.zebaze@gmail.com','contact@nutvitaglobalis.com')
on conflict(candidate_id) do update set full_name=excluded.full_name,email=excluded.email,status='integrated';

insert into public.dietitian_profiles(id,candidate_id,application_id,status,full_name,specialties,languages)
select u.id,u.id,a.id,'active',coalesce(u.raw_user_meta_data->>'full_name',u.email),array[]::text[],array[]::text[]
from auth.users u join public.recruitment_applications a on a.candidate_id=u.id
where lower(u.email) in ('pauln.zebaze@gmail.com','contact@nutvitaglobalis.com')
on conflict(candidate_id) do update set status='active',full_name=excluded.full_name,application_id=excluded.application_id;

insert into public.platform_service_access(user_id,service_key,roles)
select u.id,s.service_key,s.roles from auth.users u cross join (values
  ('client',array['client']),('academy',array['student','instructor','admin']),('health',array['client','nutritionist','admin']),
  ('child_growth',array['client','nutritionist','admin']),('teleconsultation',array['client','nutritionist','admin']),
  ('survey',array['client','admin']),('project_management',array['client','admin']),
  ('recruitment',array['candidate','admin']),
  ('nutritrack',array['client','admin']),('maximus',array['staff','admin']),('administration',array['super_admin'])
) as s(service_key,roles) where lower(u.email) in ('pauln.zebaze@gmail.com','contact@nutvitaglobalis.com')
on conflict(user_id,service_key) do update set roles=excluded.roles,active=true,expires_at=null;
