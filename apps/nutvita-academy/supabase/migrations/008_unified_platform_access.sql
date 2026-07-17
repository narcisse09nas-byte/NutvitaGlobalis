-- Run after the host migration supabase/platform-unified-access.sql when Academy and NutVitaGlobalis share Supabase.
do $$
begin
  if to_regtype('public.app_role') is null or to_regclass('public.profiles') is null then
    raise exception 'Academy schema is missing'
      using hint = 'Run Academy migrations 001_extensions.sql through 007_ai_identity_proctoring.sql in order, then rerun 008.';
  end if;
end $$;

insert into public.profiles(id,full_name,email,role)
select id,coalesce(raw_user_meta_data->>'full_name',email),email,'super_admin'::public.app_role
from auth.users where lower(email) in ('pauln.zebaze@gmail.com','contact@nutvitaglobalis.com')
on conflict(id) do update set role='super_admin'::public.app_role,email=excluded.email,full_name=excluded.full_name;

create or replace function public.handle_academy_principal() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,full_name,email,role)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name',new.email),new.email,
    case when lower(new.email) in ('pauln.zebaze@gmail.com','contact@nutvitaglobalis.com') then 'super_admin'::public.app_role else 'student'::public.app_role end)
  on conflict(id) do update set email=excluded.email,full_name=excluded.full_name,
    role=case when lower(excluded.email) in ('pauln.zebaze@gmail.com','contact@nutvitaglobalis.com') then 'super_admin'::public.app_role else public.profiles.role end;
  return new;
end $$;
drop trigger if exists academy_principal_profile on auth.users;
create trigger academy_principal_profile after insert or update of email,raw_user_meta_data on auth.users for each row execute function public.handle_academy_principal();

-- The selected Academy workspace is the effective authority. The permanent
-- profile role only determines which workspaces may be selected.
create or replace function public.academy_active_role()
returns public.app_role
language sql
stable
security definer
set search_path=public
as $$
  select case latest.role_key
    when 'student' then 'student'::public.app_role
    when 'instructor' then 'instructor'::public.app_role
    when 'admin' then 'admin'::public.app_role
    else null
  end
  from public.platform_session_selections latest
  where latest.user_id=(select auth.uid())
    and latest.service_key='academy'
    and latest.selected_at>now()-interval '12 hours'
    and public.platform_has_access('academy',latest.role_key)
  order by latest.selected_at desc
  limit 1;
$$;

create or replace function public.has_app_role(allowed_roles public.app_role[])
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce(public.academy_active_role()=any(allowed_roles),false);
$$;
revoke all on function public.academy_active_role() from public,anon;
grant execute on function public.academy_active_role() to authenticated;
grant execute on function public.has_app_role(public.app_role[]) to authenticated;
