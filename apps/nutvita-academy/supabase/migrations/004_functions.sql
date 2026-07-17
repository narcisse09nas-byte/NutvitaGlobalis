create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    email
  )
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1)
    ),
    new.email
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created
on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
before update on public.profiles
for each row
execute procedure public.set_updated_at();

create trigger organizations_updated_at
before update on public.organizations
for each row
execute procedure public.set_updated_at();

create trigger courses_updated_at
before update on public.courses
for each row
execute procedure public.set_updated_at();

create or replace function public.create_organization_with_owner(
  organization_name text,
  organization_slug text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  organization_id uuid;
begin
  insert into public.organizations (
    name,
    slug,
    owner_user_id
  )
  values (
    organization_name,
    organization_slug,
    auth.uid()
  )
  returning id into organization_id;

  insert into public.organization_members (
    organization_id,
    user_id,
    role,
    active
  )
  values (
    organization_id,
    auth.uid(),
    'owner',
    true
  );

  return organization_id;
end;
$$;
