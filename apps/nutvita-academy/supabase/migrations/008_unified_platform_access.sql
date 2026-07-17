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
