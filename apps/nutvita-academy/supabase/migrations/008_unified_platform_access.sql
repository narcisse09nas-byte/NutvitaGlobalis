-- Run after the host migration supabase/platform-unified-access.sql when Academy and NutVitaGlobalis share Supabase.
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
