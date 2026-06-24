-- NutVitaGlobalis FOSA service.
-- Run after advanced-admin-security.sql and platform-compliance-ops.sql.

create table if not exists public.fosa_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  country text,
  requested_facility_count integer not null check(requested_facility_count between 1 and 1000),
  requested_staff_count integer not null check(requested_staff_count between 1 and 100000),
  status text not null default 'pending' check(status in ('pending','approved','rejected','suspended')),
  admin_notes text,
  approved_by uuid references public.admin_users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_user_id)
);

create table if not exists public.fosa_facilities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.fosa_organizations(id) on delete cascade,
  name text not null,
  code text not null,
  country text,
  region text,
  health_district text,
  health_area text,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, code)
);

create table if not exists public.fosa_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.fosa_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role text not null check(role in ('organization_admin','creator','verifier','validator')),
  status text not null default 'pending' check(status in ('pending','active','suspended')),
  must_change_password boolean not null default false,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, user_id),
  unique(organization_id, email)
);

create table if not exists public.fosa_member_facilities (
  member_id uuid not null references public.fosa_members(id) on delete cascade,
  facility_id uuid not null references public.fosa_facilities(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(member_id, facility_id)
);

create table if not exists public.fosa_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.fosa_organizations(id) on delete cascade,
  facility_id uuid not null references public.fosa_facilities(id) on delete cascade,
  module text not null,
  title text not null,
  reference text,
  summary text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check(status in ('draft','submitted','verified','validated','rejected')),
  created_by uuid not null references auth.users(id) on delete restrict,
  submitted_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  validated_by uuid references auth.users(id) on delete set null,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fosa_organizations_status on public.fosa_organizations(status, created_at desc);
create index if not exists fosa_facilities_organization on public.fosa_facilities(organization_id, active);
create index if not exists fosa_members_organization on public.fosa_members(organization_id, status, role);
create index if not exists fosa_records_scope on public.fosa_records(organization_id, facility_id, module, status, created_at desc);

create or replace function public.handle_fosa_request_user()
returns trigger language plpgsql security definer set search_path=public as $$
declare organization_id uuid;
begin
  if coalesce(new.raw_user_meta_data->>'account_type','')='fosa_request' then
    insert into public.fosa_organizations(
      name,owner_user_id,contact_name,contact_email,contact_phone,country,
      requested_facility_count,requested_staff_count
    ) values(
      coalesce(nullif(new.raw_user_meta_data->>'organization_name',''),'Organisation FOSA'),
      new.id,
      coalesce(nullif(new.raw_user_meta_data->>'full_name',''),new.email),
      new.email,
      new.raw_user_meta_data->>'phone',
      new.raw_user_meta_data->>'country',
      greatest(1,coalesce((new.raw_user_meta_data->>'requested_facility_count')::integer,1)),
      greatest(1,coalesce((new.raw_user_meta_data->>'requested_staff_count')::integer,1))
    )
    on conflict(owner_user_id) do update set
      name=excluded.name,
      contact_name=excluded.contact_name,
      contact_phone=excluded.contact_phone,
      country=excluded.country,
      requested_facility_count=excluded.requested_facility_count,
      requested_staff_count=excluded.requested_staff_count
    returning id into organization_id;

    insert into public.fosa_members(organization_id,user_id,email,full_name,role,status)
    values(organization_id,new.id,new.email,coalesce(nullif(new.raw_user_meta_data->>'full_name',''),new.email),'organization_admin','pending')
    on conflict(organization_id,user_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created_fosa_request on auth.users;
create trigger on_auth_user_created_fosa_request
after insert on auth.users for each row execute function public.handle_fosa_request_user();

create or replace function public.current_fosa_member()
returns public.fosa_members language sql stable security definer set search_path=public as $$
  select m from public.fosa_members m
  join public.fosa_organizations o on o.id=m.organization_id
  where m.user_id=(select auth.uid()) and m.status='active' and o.status='approved'
  limit 1;
$$;

create or replace function public.is_fosa_org_admin(p_organization_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.fosa_members m
    join public.fosa_organizations o on o.id=m.organization_id
    where m.organization_id=p_organization_id
      and m.user_id=(select auth.uid())
      and m.status='active'
      and m.role='organization_admin'
      and o.status='approved'
  );
$$;

create or replace function public.can_read_fosa_organization(p_organization_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.fosa_members m
    where m.organization_id=p_organization_id
      and m.user_id=(select auth.uid())
  );
$$;

create or replace function public.can_access_fosa_facility(p_facility_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.fosa_facilities f
    join public.fosa_members m on m.organization_id=f.organization_id
    join public.fosa_organizations o on o.id=f.organization_id
    left join public.fosa_member_facilities mf on mf.member_id=m.id and mf.facility_id=f.id
    where f.id=p_facility_id and f.active=true
      and m.user_id=(select auth.uid()) and m.status='active' and o.status='approved'
      and (m.role='organization_admin' or mf.facility_id is not null)
  );
$$;

create or replace function public.complete_fosa_password_change()
returns void language plpgsql security definer set search_path=public as $$
begin
  update public.fosa_members
  set must_change_password=false
  where user_id=(select auth.uid());
end $$;

grant execute on function public.complete_fosa_password_change() to authenticated;

alter table public.fosa_organizations enable row level security;
alter table public.fosa_facilities enable row level security;
alter table public.fosa_members enable row level security;
alter table public.fosa_member_facilities enable row level security;
alter table public.fosa_records enable row level security;

create policy "FOSA members read organization" on public.fosa_organizations for select to authenticated
using(public.is_admin() or public.can_read_fosa_organization(id));
create policy "NutVita admins manage FOSA organizations" on public.fosa_organizations for all to authenticated
using(public.is_admin()) with check(public.is_admin());

create policy "FOSA members read facilities" on public.fosa_facilities for select to authenticated
using(public.is_admin() or public.is_fosa_org_admin(organization_id) or public.can_access_fosa_facility(id));
create policy "FOSA organization admins manage facilities" on public.fosa_facilities for all to authenticated
using(public.is_admin() or public.is_fosa_org_admin(organization_id))
with check(public.is_admin() or public.is_fosa_org_admin(organization_id));

create policy "FOSA members read colleagues" on public.fosa_members for select to authenticated
using(public.is_admin() or user_id=(select auth.uid()) or public.is_fosa_org_admin(organization_id));
create policy "NutVita admins manage FOSA members" on public.fosa_members for all to authenticated
using(public.is_admin()) with check(public.is_admin());

create policy "FOSA assignments readable" on public.fosa_member_facilities for select to authenticated
using(public.is_admin() or exists(
  select 1 from public.fosa_members target
  where target.id=member_id and (target.user_id=(select auth.uid()) or public.is_fosa_org_admin(target.organization_id))
));
create policy "FOSA admins manage assignments" on public.fosa_member_facilities for all to authenticated
using(public.is_admin() or exists(select 1 from public.fosa_members target where target.id=member_id and public.is_fosa_org_admin(target.organization_id)))
with check(public.is_admin() or exists(select 1 from public.fosa_members target where target.id=member_id and public.is_fosa_org_admin(target.organization_id)));

create policy "FOSA records readable by scope" on public.fosa_records for select to authenticated
using(
  public.is_admin()
  or created_by=(select auth.uid())
  or public.is_fosa_org_admin(organization_id)
  or public.can_access_fosa_facility(facility_id)
);
create policy "FOSA creators insert records" on public.fosa_records for insert to authenticated
with check(
  created_by=(select auth.uid())
  and public.can_access_fosa_facility(facility_id)
  and exists(
    select 1 from public.fosa_members m
    where m.organization_id=fosa_records.organization_id
      and m.user_id=(select auth.uid()) and m.status='active'
      and m.role in ('organization_admin','creator')
  )
);
create policy "FOSA creators update own drafts" on public.fosa_records for update to authenticated
using(created_by=(select auth.uid()) and status='draft')
with check(created_by=(select auth.uid()) and status in ('draft','submitted'));
create policy "FOSA verifiers update submitted records" on public.fosa_records for update to authenticated
using(status='submitted' and public.can_access_fosa_facility(facility_id) and exists(
  select 1 from public.fosa_members m where m.organization_id=fosa_records.organization_id
  and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('organization_admin','verifier')
))
with check(status in ('verified','rejected'));
create policy "FOSA validators update verified records" on public.fosa_records for update to authenticated
using(status='verified' and public.can_access_fosa_facility(facility_id) and exists(
  select 1 from public.fosa_members m where m.organization_id=fosa_records.organization_id
  and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('organization_admin','validator')
))
with check(status in ('validated','rejected'));
create policy "NutVita admins manage FOSA records" on public.fosa_records for all to authenticated
using(public.is_admin()) with check(public.is_admin());

drop trigger if exists set_updated_at on public.fosa_organizations;
create trigger set_updated_at before update on public.fosa_organizations for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.fosa_facilities;
create trigger set_updated_at before update on public.fosa_facilities for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.fosa_members;
create trigger set_updated_at before update on public.fosa_members for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.fosa_records;
create trigger set_updated_at before update on public.fosa_records for each row execute function public.set_updated_at();

insert into public.system_email_templates(id,name,subject,body_text) values
('fosa_request_approved','Acces FOSA approuve','Votre espace FOSA NutVitaGlobalis est active','Bonjour {{name}},\n\nVotre demande pour {{organization}} a ete approuvee. Vous pouvez maintenant acceder a votre session administrateur FOSA.\n\n{{action_url}}\n\nEquipe NutVitaGlobalis'),
('fosa_request_rejected','Demande FOSA examinee','Mise a jour de votre demande FOSA','Bonjour {{name}},\n\nVotre demande pour {{organization}} n a pas ete approuvee pour le moment. Motif ou precision : {{reason}}\n\nEquipe NutVitaGlobalis'),
('fosa_staff_invited','Invitation au service FOSA','Votre compte FOSA NutVitaGlobalis','Bonjour {{name}},\n\nVous avez ete ajoute au service FOSA de {{organization}} avec le role {{role}}. Utilisez le lien pour definir votre mot de passe personnel.\n\n{{action_url}}\n\nEquipe NutVitaGlobalis')
on conflict(id) do update set name=excluded.name,subject=excluded.subject,body_text=excluded.body_text;
