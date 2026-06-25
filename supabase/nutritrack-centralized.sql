-- NutriTrack centralized access and data storage.
-- Run after accounts-growth-admin.sql.

create table if not exists public.nutritrack_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  country text,
  requested_facility_count integer not null default 1 check(requested_facility_count between 1 and 1000),
  requested_staff_count integer not null default 1 check(requested_staff_count between 1 and 100000),
  status text not null default 'pending' check(status in ('pending','approved','rejected','suspended')),
  admin_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_user_id)
);

create table if not exists public.nutritrack_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.nutritrack_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role text not null default 'creator' check(role in ('organization_admin','creator','verifier','validator')),
  status text not null default 'pending' check(status in ('pending','active','suspended')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,user_id),
  unique(organization_id,email)
);

create table if not exists public.nutritrack_member_facilities (
  member_id uuid not null references public.nutritrack_members(id) on delete cascade,
  facility_document_id text not null,
  created_at timestamptz not null default now(),
  primary key(member_id,facility_document_id)
);

create table if not exists public.nutritrack_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.nutritrack_organizations(id) on delete cascade,
  collection_path text not null,
  document_id text not null,
  data jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,collection_path,document_id)
);

create table if not exists public.nutritrack_access_logs (
  id bigint generated always as identity primary key,
  organization_id uuid references public.nutritrack_organizations(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists nutritrack_organizations_status on public.nutritrack_organizations(status,created_at desc);
create index if not exists nutritrack_members_user on public.nutritrack_members(user_id,status);
create index if not exists nutritrack_documents_path on public.nutritrack_documents(organization_id,collection_path);
create index if not exists nutritrack_documents_data on public.nutritrack_documents using gin(data);

create or replace function public.nutritrack_current_member()
returns public.nutritrack_members
language sql stable security definer set search_path=public as $$
  select m
  from public.nutritrack_members m
  join public.nutritrack_organizations o on o.id=m.organization_id
  where m.user_id=(select auth.uid())
    and m.status='active'
    and o.status='approved'
  limit 1;
$$;

create or replace function public.nutritrack_is_org_admin(p_organization_id uuid)
returns boolean
language sql stable security definer set search_path=public as $$
  select public.is_admin() or exists(
    select 1
    from public.nutritrack_members m
    join public.nutritrack_organizations o on o.id=m.organization_id
    where m.organization_id=p_organization_id
      and m.user_id=(select auth.uid())
      and m.status='active'
      and m.role='organization_admin'
      and o.status='approved'
  );
$$;

create or replace function public.nutritrack_member_has_facility(
  p_organization_id uuid,
  p_facility_document_id text
) returns boolean
language sql stable security definer set search_path=public as $$
  select public.nutritrack_is_org_admin(p_organization_id) or exists(
    select 1
    from public.nutritrack_members m
    join public.nutritrack_member_facilities mf on mf.member_id=m.id
    where m.organization_id=p_organization_id
      and m.user_id=(select auth.uid())
      and m.status='active'
      and mf.facility_document_id=p_facility_document_id
  );
$$;

create or replace function public.nutritrack_document_facility(
  p_organization_id uuid,
  p_collection_path text,
  p_document_id text,
  p_data jsonb
) returns text
language plpgsql stable security definer set search_path=public as $$
declare
  facility_id text;
  child_id text;
begin
  facility_id := coalesce(
    nullif(p_data->>'healthAreaId',''),
    nullif(p_data->>'selectedFacilityId',''),
    nullif(p_data->>'facilityId','')
  );
  if facility_id is not null then return facility_id; end if;
  if p_collection_path='healthAreas' then return p_document_id; end if;
  if p_collection_path like 'children/%/visits'
     or p_collection_path like 'children/%/inpatientVisits' then
    child_id := split_part(p_collection_path,'/',2);
    select d.data->>'healthAreaId' into facility_id
    from public.nutritrack_documents d
    where d.organization_id=p_organization_id
      and d.collection_path='children'
      and d.document_id=child_id;
    return facility_id;
  end if;
  return null;
end $$;

create or replace function public.nutritrack_can_read_document(
  p_organization_id uuid,
  p_collection_path text,
  p_document_id text,
  p_data jsonb
) returns boolean
language plpgsql stable security definer set search_path=public as $$
declare
  member_record public.nutritrack_members;
  facility_id text;
begin
  if public.is_admin() then return true; end if;
  select * into member_record
  from public.nutritrack_members
  where organization_id=p_organization_id
    and user_id=(select auth.uid())
    and status='active'
  limit 1;
  if member_record.id is null then return false; end if;
  if member_record.role='organization_admin' then return true; end if;
  if nullif(p_data#>>'{discharge,referredToFacilityId}','') is not null
     and public.nutritrack_member_has_facility(
       p_organization_id,
       p_data#>>'{discharge,referredToFacilityId}'
     ) then
    return true;
  end if;
  facility_id := public.nutritrack_document_facility(
    p_organization_id,p_collection_path,p_document_id,p_data
  );
  if facility_id is null then
    return p_collection_path in ('commodities','feedback');
  end if;
  return public.nutritrack_member_has_facility(p_organization_id,facility_id);
end $$;

create or replace function public.nutritrack_can_write_document(
  p_organization_id uuid,
  p_collection_path text,
  p_document_id text,
  p_data jsonb
) returns boolean
language plpgsql stable security definer set search_path=public as $$
declare
  member_record public.nutritrack_members;
begin
  if public.is_admin() then return true; end if;
  select * into member_record
  from public.nutritrack_members
  where organization_id=p_organization_id
    and user_id=(select auth.uid())
    and status='active'
  limit 1;
  if member_record.id is null then return false; end if;
  if member_record.role='organization_admin' then return true; end if;
  if member_record.role not in ('creator','verifier','validator') then return false; end if;
  return public.nutritrack_can_read_document(
    p_organization_id,p_collection_path,p_document_id,p_data
  );
end $$;

create or replace function public.submit_nutritrack_request(
  p_name text,
  p_contact_name text,
  p_contact_phone text,
  p_country text,
  p_facility_count integer,
  p_staff_count integer
) returns uuid
language plpgsql security definer set search_path=public as $$
declare
  organization_id uuid;
  current_email text;
begin
  if (select auth.uid()) is null then raise exception 'Authentification requise.'; end if;
  select email into current_email from auth.users where id=(select auth.uid());
  insert into public.nutritrack_organizations(
    name,owner_user_id,contact_name,contact_email,contact_phone,country,
    requested_facility_count,requested_staff_count,status
  ) values(
    p_name,(select auth.uid()),p_contact_name,current_email,p_contact_phone,p_country,
    greatest(1,p_facility_count),greatest(1,p_staff_count),'pending'
  )
  on conflict(owner_user_id) do update set
    name=excluded.name,
    contact_name=excluded.contact_name,
    contact_phone=excluded.contact_phone,
    country=excluded.country,
    requested_facility_count=excluded.requested_facility_count,
    requested_staff_count=excluded.requested_staff_count,
    status=case when nutritrack_organizations.status='approved' then 'approved' else 'pending' end
  returning id into organization_id;

  insert into public.nutritrack_members(
    organization_id,user_id,email,full_name,role,status
  ) values(
    organization_id,(select auth.uid()),current_email,p_contact_name,
    'organization_admin','pending'
  )
  on conflict(organization_id,user_id) do update set
    email=excluded.email,
    full_name=excluded.full_name,
    role='organization_admin';
  return organization_id;
end $$;

-- The auth trigger cannot rely on auth.uid(), so it performs the same insertion directly.
create or replace function public.handle_nutritrack_request_user()
returns trigger language plpgsql security definer set search_path=public as $$
declare organization_id uuid;
begin
  if coalesce(new.raw_user_meta_data->>'account_type','')='nutritrack_request' then
    insert into public.nutritrack_organizations(
      name,owner_user_id,contact_name,contact_email,contact_phone,country,
      requested_facility_count,requested_staff_count
    ) values(
      coalesce(nullif(new.raw_user_meta_data->>'organization_name',''),'Organisation NutriTrack'),
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

    insert into public.nutritrack_members(
      organization_id,user_id,email,full_name,role,status
    ) values(
      organization_id,new.id,new.email,
      coalesce(nullif(new.raw_user_meta_data->>'full_name',''),new.email),
      'organization_admin','pending'
    )
    on conflict(organization_id,user_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created_nutritrack_request on auth.users;
create trigger on_auth_user_created_nutritrack_request
after insert on auth.users for each row execute function public.handle_nutritrack_request_user();

create or replace function public.nutritrack_put_document(
  p_collection_path text,
  p_document_id text,
  p_data jsonb
) returns public.nutritrack_documents
language plpgsql security definer set search_path=public as $$
declare
  member_record public.nutritrack_members;
  result public.nutritrack_documents;
begin
  select * into member_record from public.nutritrack_current_member();
  if member_record.id is null then raise exception 'Acces NutriTrack inactif.'; end if;
  if not public.nutritrack_can_write_document(
    member_record.organization_id,p_collection_path,p_document_id,p_data
  ) then raise exception 'Acces refuse pour cette formation sanitaire.'; end if;

  insert into public.nutritrack_documents(
    organization_id,collection_path,document_id,data,created_by,updated_by
  ) values(
    member_record.organization_id,p_collection_path,p_document_id,p_data,
    (select auth.uid()),(select auth.uid())
  )
  on conflict(organization_id,collection_path,document_id) do update set
    data=excluded.data,
    updated_by=(select auth.uid()),
    updated_at=now()
  returning * into result;
  return result;
end $$;

create or replace function public.nutritrack_delete_document(
  p_collection_path text,
  p_document_id text
) returns void
language plpgsql security definer set search_path=public as $$
declare
  member_record public.nutritrack_members;
  existing public.nutritrack_documents;
begin
  select * into member_record from public.nutritrack_current_member();
  if member_record.id is null then raise exception 'Acces NutriTrack inactif.'; end if;
  select * into existing
  from public.nutritrack_documents
  where organization_id=member_record.organization_id
    and collection_path=p_collection_path
    and document_id=p_document_id;
  if existing.id is null then return; end if;
  if not public.nutritrack_can_write_document(
    existing.organization_id,existing.collection_path,existing.document_id,existing.data
  ) then raise exception 'Acces refuse.'; end if;
  delete from public.nutritrack_documents
  where organization_id=existing.organization_id
    and (
      id=existing.id
      or collection_path like existing.collection_path || '/' || existing.document_id || '/%'
    );
end $$;

revoke all on function public.submit_nutritrack_request(text,text,text,text,integer,integer) from public;
revoke all on function public.nutritrack_put_document(text,text,jsonb) from public;
revoke all on function public.nutritrack_delete_document(text,text) from public;
revoke all on function public.handle_nutritrack_request_user() from public;
revoke all on function public.nutritrack_current_member() from public;
revoke all on function public.nutritrack_is_org_admin(uuid) from public;
revoke all on function public.nutritrack_member_has_facility(uuid,text) from public;
revoke all on function public.nutritrack_document_facility(uuid,text,text,jsonb) from public;
revoke all on function public.nutritrack_can_read_document(uuid,text,text,jsonb) from public;
revoke all on function public.nutritrack_can_write_document(uuid,text,text,jsonb) from public;
grant execute on function public.submit_nutritrack_request(text,text,text,text,integer,integer) to authenticated;
grant execute on function public.nutritrack_put_document(text,text,jsonb) to authenticated;
grant execute on function public.nutritrack_delete_document(text,text) to authenticated;
grant execute on function public.nutritrack_current_member() to authenticated;
grant execute on function public.nutritrack_is_org_admin(uuid) to authenticated;
grant execute on function public.nutritrack_member_has_facility(uuid,text) to authenticated;
grant execute on function public.nutritrack_document_facility(uuid,text,text,jsonb) to authenticated;
grant execute on function public.nutritrack_can_read_document(uuid,text,text,jsonb) to authenticated;
grant execute on function public.nutritrack_can_write_document(uuid,text,text,jsonb) to authenticated;

alter table public.nutritrack_organizations enable row level security;
alter table public.nutritrack_members enable row level security;
alter table public.nutritrack_member_facilities enable row level security;
alter table public.nutritrack_documents enable row level security;
alter table public.nutritrack_access_logs enable row level security;

drop policy if exists "NutriTrack organizations visible to members" on public.nutritrack_organizations;
create policy "NutriTrack organizations visible to members"
on public.nutritrack_organizations for select to authenticated
using(
  public.is_admin()
  or owner_user_id=(select auth.uid())
  or exists(select 1 from public.nutritrack_members m where m.organization_id=id and m.user_id=(select auth.uid()))
);
drop policy if exists "NutVita admins manage NutriTrack organizations" on public.nutritrack_organizations;
create policy "NutVita admins manage NutriTrack organizations"
on public.nutritrack_organizations for all to authenticated
using(public.is_admin()) with check(public.is_admin());

drop policy if exists "NutriTrack members visible in organization" on public.nutritrack_members;
create policy "NutriTrack members visible in organization"
on public.nutritrack_members for select to authenticated
using(
  public.is_admin()
  or user_id=(select auth.uid())
  or public.nutritrack_is_org_admin(organization_id)
);
drop policy if exists "NutriTrack admins manage members" on public.nutritrack_members;
create policy "NutriTrack admins manage members"
on public.nutritrack_members for all to authenticated
using(public.is_admin() or public.nutritrack_is_org_admin(organization_id))
with check(public.is_admin() or public.nutritrack_is_org_admin(organization_id));

drop policy if exists "NutriTrack assignments visible to organization" on public.nutritrack_member_facilities;
create policy "NutriTrack assignments visible to organization"
on public.nutritrack_member_facilities for select to authenticated
using(
  public.is_admin()
  or exists(
    select 1 from public.nutritrack_members m
    where m.id=member_id
      and (m.user_id=(select auth.uid()) or public.nutritrack_is_org_admin(m.organization_id))
  )
);
drop policy if exists "NutriTrack admins manage assignments" on public.nutritrack_member_facilities;
create policy "NutriTrack admins manage assignments"
on public.nutritrack_member_facilities for all to authenticated
using(
  public.is_admin()
  or exists(select 1 from public.nutritrack_members m where m.id=member_id and public.nutritrack_is_org_admin(m.organization_id))
)
with check(
  public.is_admin()
  or exists(select 1 from public.nutritrack_members m where m.id=member_id and public.nutritrack_is_org_admin(m.organization_id))
);

drop policy if exists "NutriTrack documents readable by scope" on public.nutritrack_documents;
create policy "NutriTrack documents readable by scope"
on public.nutritrack_documents for select to authenticated
using(public.nutritrack_can_read_document(organization_id,collection_path,document_id,data));

drop policy if exists "NutriTrack logs visible to admins" on public.nutritrack_access_logs;
create policy "NutriTrack logs visible to admins"
on public.nutritrack_access_logs for select to authenticated
using(public.is_admin() or public.nutritrack_is_org_admin(organization_id));

drop trigger if exists set_updated_at on public.nutritrack_organizations;
create trigger set_updated_at before update on public.nutritrack_organizations
for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.nutritrack_members;
create trigger set_updated_at before update on public.nutritrack_members
for each row execute function public.set_updated_at();

insert into public.system_email_templates(id,name,subject,body_text) values
('nutritrack_request_approved','Acces NutriTrack approuve','Votre espace NutriTrack est active','Bonjour {{name}},\n\nVotre demande pour {{organization}} a ete approuvee. Vous pouvez maintenant acceder a NutriTrack.\n\n{{action_url}}\n\nEquipe NutVitaGlobalis'),
('nutritrack_request_rejected','Demande NutriTrack examinee','Mise a jour de votre demande NutriTrack','Bonjour {{name}},\n\nVotre demande pour {{organization}} n a pas ete approuvee pour le moment. Motif : {{reason}}\n\nEquipe NutVitaGlobalis'),
('nutritrack_staff_invited','Invitation NutriTrack','Votre acces NutriTrack','Bonjour {{name}},\n\nVous avez ete invite dans {{organization}} avec le role {{role}}. Utilisez le lien recu pour definir votre mot de passe et acceder a NutriTrack.\n\n{{action_url}}\n\nEquipe NutVitaGlobalis')
on conflict(id) do update set name=excluded.name,subject=excluded.subject,body_text=excluded.body_text;
