-- Central NutVitaGlobalis service and role access. Run after advanced-admin-security.sql.
create table if not exists public.platform_service_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service_key text not null check(service_key in ('client','academy','health','child_growth','teleconsultation','nutritrack','maximus','administration')),
  roles text[] not null default '{}', active boolean not null default true,
  granted_by uuid references auth.users(id), expires_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,service_key)
);
create table if not exists public.platform_session_selections (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  service_key text not null, role_key text not null, selected_at timestamptz not null default now(),
  user_agent text
);
alter table public.formations add column if not exists academy_course_id uuid unique;
alter table public.formations add column if not exists source text not null default 'nutvita';

create or replace function public.is_platform_principal() returns boolean language sql stable security definer set search_path=public as $$
  select public.is_super_admin() or lower(coalesce((select email from auth.users where id=(select auth.uid())),'')) in ('pauln.zebaze@gmail.com','contact@nutvitaglobalis.com');
$$;
create or replace function public.platform_has_access(p_service text,p_role text default null) returns boolean language sql stable security definer set search_path=public as $$
  select public.is_platform_principal() or exists(select 1 from public.platform_service_access a where a.user_id=(select auth.uid()) and a.service_key=p_service and a.active and (a.expires_at is null or a.expires_at>now()) and (p_role is null or p_role=any(a.roles)));
$$;
alter table public.platform_service_access enable row level security;
alter table public.platform_session_selections enable row level security;
drop policy if exists "Users read own platform access" on public.platform_service_access;
drop policy if exists "Principals manage platform access" on public.platform_service_access;
drop policy if exists "Users add own session selection" on public.platform_session_selections;
drop policy if exists "Users read own session selections" on public.platform_session_selections;
create policy "Users read own platform access" on public.platform_service_access for select to authenticated using(user_id=(select auth.uid()) or public.is_platform_principal());
create policy "Principals manage platform access" on public.platform_service_access for all to authenticated using(public.is_platform_principal()) with check(public.is_platform_principal());
create policy "Users add own session selection" on public.platform_session_selections for insert to authenticated with check(user_id=(select auth.uid()));
create policy "Users read own session selections" on public.platform_session_selections for select to authenticated using(user_id=(select auth.uid()) or public.is_platform_principal());

insert into public.admin_users(id,email,full_name,role,active)
select id,email,coalesce(raw_user_meta_data->>'full_name',email),'super_admin',true from auth.users
where lower(email) in ('pauln.zebaze@gmail.com','contact@nutvitaglobalis.com')
on conflict(id) do update set role='super_admin',active=true,email=excluded.email;

insert into public.platform_service_access(user_id,service_key,roles)
select u.id,s.service_key,s.roles from auth.users u cross join (values
  ('client',array['client']),('academy',array['student','instructor','admin']),('health',array['client','nutritionist','admin']),
  ('child_growth',array['client','nutritionist','admin']),('teleconsultation',array['client','nutritionist','admin']),
  ('nutritrack',array['client','admin']),('maximus',array['client','admin']),('administration',array['admin'])
) as s(service_key,roles) where lower(u.email) in ('pauln.zebaze@gmail.com','contact@nutvitaglobalis.com')
on conflict(user_id,service_key) do update set roles=excluded.roles,active=true,expires_at=null;
