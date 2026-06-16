-- Run after the existing NutVitaGlobalis migrations.
create table if not exists public.client_profiles (
  id uuid primary key references auth.users(id) on delete cascade, full_name text, sex text, birth_date date,
  profession text, city text, phone text, email text not null, address text, assigned_dietitian_id uuid references public.dietitian_profiles(id),
  medical_history jsonb not null default '{}', allergies text, other_conditions text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create or replace function public.handle_client_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if coalesce(new.raw_user_meta_data->>'account_type','')='client' then
    insert into public.client_profiles(id,full_name,email) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),new.email) on conflict(id) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_created_client on auth.users;
create trigger on_auth_user_created_client after insert on auth.users for each row execute function public.handle_client_user();
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(), contract_number text not null unique,
  contract_type text not null check(contract_type in ('partner','client_service','informed_consent','privacy','service_agreement','amendment')),
  title text not null, party_user_id uuid not null references auth.users(id), party_name text not null, party_email text,
  dietitian_profile_id uuid references public.dietitian_profiles(id), client_id uuid references public.client_profiles(id),
  status text not null default 'draft' check(status in ('draft','sent','opened','signed_by_nutvita','signed_by_party','completed','archived')),
  content jsonb not null default '{}', pdf_path text, certificate_path text, sent_at timestamptz, opened_at timestamptz,
  completed_at timestamptz, archived_at timestamptz, created_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.contract_signatures (
  id uuid primary key default gen_random_uuid(), contract_id uuid not null references public.contracts(id) on delete cascade,
  signer_id uuid not null references auth.users(id), signer_role text not null check(signer_role in ('nutvita','partner','client')),
  signer_name text not null, signature_path text not null, signed_at timestamptz not null default now(), ip_address inet,
  user_agent text, signature_hash text not null, consent_text text not null, unique(contract_id,signer_role)
);
create table if not exists public.contract_audit_logs (
  id uuid primary key default gen_random_uuid(), contract_id uuid not null references public.contracts(id) on delete cascade,
  actor_id uuid references auth.users(id), event_type text not null, ip_address inet, user_agent text,
  details jsonb not null default '{}', created_at timestamptz not null default now()
);
create table if not exists public.vault_documents (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id), client_id uuid references public.client_profiles(id),
  dietitian_profile_id uuid references public.dietitian_profiles(id), contract_id uuid references public.contracts(id),
  document_type text not null, title text not null, file_path text not null, mime_type text, file_size bigint,
  confidential boolean not null default true, created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.anthropometric_measurements (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.client_profiles(id) on delete cascade,
  measured_at timestamptz not null default now(), weight_kg numeric, height_cm numeric, bmi numeric, waist_cm numeric,
  hip_cm numeric, muac_cm numeric, body_fat_percent numeric, muscle_mass_kg numeric, custom_values jsonb not null default '{}',
  notes text, recorded_by uuid references auth.users(id), created_at timestamptz not null default now()
);
-- L'IMC est recalcule en base afin de conserver un historique coherent.
create or replace function public.set_anthropometric_bmi() returns trigger language plpgsql as $$
begin
  if new.weight_kg is not null and new.height_cm is not null and new.height_cm > 0 then
    new.bmi := round(new.weight_kg / power(new.height_cm / 100, 2), 2);
  end if;
  return new;
end $$;
drop trigger if exists anthropometric_bmi on public.anthropometric_measurements;
create trigger anthropometric_bmi before insert or update on public.anthropometric_measurements
for each row execute function public.set_anthropometric_bmi();

create table if not exists public.biological_measurements (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.client_profiles(id) on delete cascade,
  measured_at timestamptz not null default now(), glucose numeric, hba1c numeric, total_cholesterol numeric, hdl numeric,
  ldl numeric, triglycerides numeric, hemoglobin numeric, ferritin numeric, albumin numeric, crp numeric,
  systolic_pressure integer, diastolic_pressure integer, custom_values jsonb not null default '{}', notes text,
  recorded_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.food_history (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.client_profiles(id) on delete cascade,
  entry_date date not null default current_date, entry_type text not null check(entry_type in ('24h_recall','food_frequency','food_diary','habits')),
  content jsonb not null default '{}', notes text, recorded_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.nutrition_consultations (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.client_profiles(id) on delete cascade,
  dietitian_profile_id uuid references public.dietitian_profiles(id), consultation_date timestamptz not null default now(),
  summary text, objectives text, recommendations text, meal_plan text, attachments jsonb not null default '[]',
  status text not null default 'completed', created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create index if not exists contracts_party_status on public.contracts(party_user_id,status);
create index if not exists anthropometric_client_date on public.anthropometric_measurements(client_id,measured_at desc);
create index if not exists biological_client_date on public.biological_measurements(client_id,measured_at desc);
create index if not exists consultations_client_date on public.nutrition_consultations(client_id,consultation_date desc);

create or replace function public.can_access_client(p_client_id uuid) returns boolean language sql stable security definer set search_path=public as $$
  select p_client_id=(select auth.uid()) or public.is_admin() or exists(
    select 1 from public.client_profiles c join public.dietitian_profiles d on d.id=c.assigned_dietitian_id
    where c.id=p_client_id and d.candidate_id=(select auth.uid()) and d.status='active'
  );
$$;

alter table public.client_profiles enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_signatures enable row level security;
alter table public.contract_audit_logs enable row level security;
alter table public.vault_documents enable row level security;
alter table public.anthropometric_measurements enable row level security;
alter table public.biological_measurements enable row level security;
alter table public.food_history enable row level security;
alter table public.nutrition_consultations enable row level security;

create policy "Clients read own profile" on public.client_profiles for select to authenticated using(public.can_access_client(id));
create policy "Clients create own profile" on public.client_profiles for insert to authenticated with check(id=(select auth.uid()));
create policy "Clients update own profile" on public.client_profiles for update to authenticated using(id=(select auth.uid()) or public.is_admin()) with check(id=(select auth.uid()) or public.is_admin());
create policy "Admins manage clients" on public.client_profiles for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Contract parties read" on public.contracts for select to authenticated using(party_user_id=(select auth.uid()) or public.is_admin());
create policy "Admins manage contracts" on public.contracts for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Contract signatures read" on public.contract_signatures for select to authenticated using(public.is_admin() or exists(select 1 from public.contracts c where c.id=contract_id and c.party_user_id=(select auth.uid())));
create policy "Signers create own signature" on public.contract_signatures for insert to authenticated with check(signer_id=(select auth.uid()));
create policy "Admins manage signatures" on public.contract_signatures for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Contract audit read" on public.contract_audit_logs for select to authenticated using(public.is_admin() or exists(select 1 from public.contracts c where c.id=contract_id and c.party_user_id=(select auth.uid())));
create policy "Authenticated audit insert" on public.contract_audit_logs for insert to authenticated with check(actor_id=(select auth.uid()));
create policy "Vault owners read" on public.vault_documents for select to authenticated using(owner_id=(select auth.uid()) or public.is_admin() or (client_id is not null and public.can_access_client(client_id)));
create policy "Admins manage vault" on public.vault_documents for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Owners add vault documents" on public.vault_documents for insert to authenticated with check(owner_id=(select auth.uid()));

do $$ declare t text; begin
  foreach t in array array['anthropometric_measurements','biological_measurements','food_history','nutrition_consultations'] loop
    execute format('create policy "Client record read %1$s" on public.%1$I for select to authenticated using(public.can_access_client(client_id))',t);
    execute format('create policy "Client record insert %1$s" on public.%1$I for insert to authenticated with check(public.can_access_client(client_id))',t);
    execute format('create policy "Client record update %1$s" on public.%1$I for update to authenticated using(public.can_access_client(client_id)) with check(public.can_access_client(client_id))',t);
    execute format('create policy "Admins manage %1$s" on public.%1$I for all to authenticated using(public.is_admin()) with check(public.is_admin())',t);
  end loop;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('document-vault','document-vault',false,15728640,array['application/pdf','image/jpeg','image/png']) on conflict(id) do nothing;
create policy "Vault authenticated upload" on storage.objects for insert to authenticated with check(bucket_id='document-vault' and ((storage.foldername(name))[1]=(select auth.uid())::text or public.is_admin()));
create policy "Vault secure read" on storage.objects for select to authenticated using(bucket_id='document-vault' and ((storage.foldername(name))[1]=(select auth.uid())::text or public.is_admin()));

create or replace function public.create_partner_contract(p_application_id uuid,p_created_by uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare app public.recruitment_applications; profile public.dietitian_profiles; contract_id uuid;
begin
  if not public.is_admin() then raise exception 'Accès refusé.'; end if;
  select * into app from public.recruitment_applications where id=p_application_id;
  select * into profile from public.dietitian_profiles where application_id=p_application_id;
  select id into contract_id from public.contracts where party_user_id=app.candidate_id and contract_type='partner' and status<>'archived' limit 1;
  if contract_id is not null then return contract_id; end if;
  insert into public.contracts(contract_number,contract_type,title,party_user_id,party_name,party_email,dietitian_profile_id,status,content,created_by)
  values('NVG-PART-'||to_char(now(),'YYYY')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),'partner','Contrat de diététicien partenaire',app.candidate_id,app.full_name,app.email,profile.id,'draft',jsonb_build_object('missions','Téléconseil, suivi personnalisé, nutrition clinique et programmes en ligne','obligations','Respect des standards professionnels, disponibilité et traçabilité des consultations','confidentiality','Protection stricte des données de santé et du secret professionnel','financial_terms','Rémunération selon les missions et tarifs validés avec NutVitaGlobalis','duration','12 mois renouvelables','termination','Résiliation selon préavis et manquement contractuel'),p_created_by)
  returning id into contract_id; return contract_id;
end $$;
