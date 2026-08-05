-- Run after recruitment-panels-general.sql, partner-advanced-workflows.sql and advanced-admin-security.sql.
-- Staff matricule generation (NVG{seq}{letter}) and the promoter referral programme.

-- === Matricule generation ==================================================
-- N = nutritionniste/dieteticien, M = staff Maximus, E = staff plateforme (admin_users), P = promoteur.
-- A (staff Academy) is intentionally not covered here: Academy runs on a separate Supabase project.

create table if not exists public.matricule_sequences (
  category text primary key check(category in ('N','A','M','E','P')),
  last_value integer not null default 0
);

create or replace function public.generate_matricule(p_category text) returns text
language plpgsql security definer set search_path = public as $$
declare v_next integer;
begin
  if not public.is_admin() then raise exception 'Non autorise a generer un matricule.'; end if;
  insert into public.matricule_sequences(category, last_value) values (p_category, 1)
  on conflict (category) do update set last_value = matricule_sequences.last_value + 1
  returning last_value into v_next;
  return 'NVG' || lpad(v_next::text, 3, '0') || p_category;
end $$;

alter table public.dietitian_profiles add column if not exists matricule text unique;
alter table public.maximus_user_access add column if not exists matricule text unique;
alter table public.admin_users add column if not exists matricule text unique;

insert into public.matricule_sequences(category, last_value) values ('N',0),('A',0),('M',0),('E',0),('P',0)
on conflict (category) do nothing;

with ranked as (
  select id, row_number() over (order by created_at) as rn
  from public.dietitian_profiles where matricule is null and status = 'active'
)
update public.dietitian_profiles d set matricule = 'NVG' || lpad(ranked.rn::text, 3, '0') || 'N'
from ranked where d.id = ranked.id;
update public.matricule_sequences set last_value = greatest(last_value, (select count(*) from public.dietitian_profiles where status = 'active')) where category = 'N';

with ranked as (
  select user_id, row_number() over (order by created_at) as rn
  from public.maximus_user_access where matricule is null and active = true
)
update public.maximus_user_access m set matricule = 'NVG' || lpad(ranked.rn::text, 3, '0') || 'M'
from ranked where m.user_id = ranked.user_id;
update public.matricule_sequences set last_value = greatest(last_value, (select count(*) from public.maximus_user_access where active = true)) where category = 'M';

with ranked as (
  select id, row_number() over (order by created_at) as rn
  from public.admin_users where matricule is null and active = true
)
update public.admin_users a set matricule = 'NVG' || lpad(ranked.rn::text, 3, '0') || 'E'
from ranked where a.id = ranked.id;
update public.matricule_sequences set last_value = greatest(last_value, (select count(*) from public.admin_users where active = true)) where category = 'E';

alter table public.matricule_sequences enable row level security;
drop policy if exists "Admins manage matricule sequences" on public.matricule_sequences;
create policy "Admins manage matricule sequences" on public.matricule_sequences for all to authenticated using(public.is_admin()) with check(public.is_admin());

-- === Promoter referral programme ===========================================

alter table public.recruitment_applications drop constraint if exists recruitment_applications_recruitment_type_check;
alter table public.recruitment_applications add constraint recruitment_applications_recruitment_type_check
  check(recruitment_type in ('dietitian_partner','employee','consultant','intern','other','promoter'));

create table if not exists public.promoter_profiles (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null unique references auth.users(id) on delete cascade,
  application_id uuid not null unique references public.recruitment_applications(id),
  status text not null default 'active' check(status in ('active','inactive')),
  full_name text not null,
  matricule text not null unique,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.promoter_ledger (
  id uuid primary key default gen_random_uuid(),
  promoter_id uuid not null references public.promoter_profiles(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  client_id uuid references public.client_profiles(id) on delete set null,
  entry_type text not null check(entry_type in ('commission','adjustment')),
  source text not null default 'main' check(source in ('main','academy')),
  external_reference text,
  description text not null,
  amount numeric(12,2) not null,
  currency text not null default 'XOF',
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index if not exists promoter_ledger_academy_reference on public.promoter_ledger(source, external_reference) where external_reference is not null;

create table if not exists public.promoter_payouts (
  id uuid primary key default gen_random_uuid(),
  promoter_id uuid not null references public.promoter_profiles(id) on delete cascade,
  amount numeric(12,2) not null check(amount > 0),
  currency text not null default 'XOF',
  proof_file_path text,
  provider text not null default 'manual' check(provider in ('manual','mobile_money','bank_transfer','paypal')),
  provider_reference text,
  status text not null default 'paid' check(status in ('paid','pending','processing','failed','cancelled')),
  notes text,
  paid_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.client_profiles add column if not exists referred_by_promoter_id uuid references public.promoter_profiles(id) on delete set null;

create or replace view public.promoter_balances as
select
  p.id as promoter_id,
  coalesce(sum(l.amount),0) as total_earned,
  coalesce((select sum(o.amount) from public.promoter_payouts o where o.promoter_id = p.id and o.status <> 'cancelled'),0) as total_paid_out,
  coalesce(sum(l.amount),0) - coalesce((select sum(o.amount) from public.promoter_payouts o where o.promoter_id = p.id and o.status <> 'cancelled'),0) as balance
from public.promoter_profiles p
left join public.promoter_ledger l on l.promoter_id = p.id
group by p.id;

create or replace function public.current_promoter_id() returns uuid language sql stable security definer set search_path = public as $$
  select id from public.promoter_profiles where candidate_id = (select auth.uid()) and status = 'active' limit 1
$$;

create or replace function public.check_promoter_payout_balance() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_balance numeric;
begin
  select balance into v_balance from public.promoter_balances where promoter_id = new.promoter_id;
  if coalesce(v_balance,0) < new.amount then
    raise exception 'Montant du versement (%) superieur a la cagnote disponible (%).', new.amount, coalesce(v_balance,0);
  end if;
  return new;
end $$;

drop trigger if exists enforce_promoter_payout_balance on public.promoter_payouts;
create trigger enforce_promoter_payout_balance before insert on public.promoter_payouts
for each row when (new.status <> 'cancelled') execute function public.check_promoter_payout_balance();

create index if not exists promoter_ledger_promoter on public.promoter_ledger(promoter_id, created_at desc);
create index if not exists promoter_payouts_promoter on public.promoter_payouts(promoter_id, created_at desc);
create index if not exists client_profiles_referred_by on public.client_profiles(referred_by_promoter_id);

alter table public.promoter_profiles enable row level security;
alter table public.promoter_ledger enable row level security;
alter table public.promoter_payouts enable row level security;

drop policy if exists "Promoters read own profile" on public.promoter_profiles;
create policy "Promoters read own profile" on public.promoter_profiles for select to authenticated using(candidate_id = (select auth.uid()) or public.is_admin());
drop policy if exists "Admins manage promoter profiles" on public.promoter_profiles;
create policy "Admins manage promoter profiles" on public.promoter_profiles for all to authenticated using(public.is_admin()) with check(public.is_admin());

drop policy if exists "Promoters read own ledger" on public.promoter_ledger;
create policy "Promoters read own ledger" on public.promoter_ledger for select to authenticated using(promoter_id = public.current_promoter_id() or public.is_admin());
drop policy if exists "Admins manage promoter ledger" on public.promoter_ledger;
create policy "Admins manage promoter ledger" on public.promoter_ledger for all to authenticated using(public.admin_has_permission('finance.manage')) with check(public.admin_has_permission('finance.manage'));

drop policy if exists "Promoters read own payouts" on public.promoter_payouts;
create policy "Promoters read own payouts" on public.promoter_payouts for select to authenticated using(promoter_id = public.current_promoter_id() or public.is_admin());
drop policy if exists "Finance admins manage promoter payouts" on public.promoter_payouts;
create policy "Finance admins manage promoter payouts" on public.promoter_payouts for all to authenticated using(public.admin_has_permission('finance.manage')) with check(public.admin_has_permission('finance.manage'));

drop policy if exists "Promoters read own client referrals" on public.client_profiles;
create policy "Promoters read own client referrals" on public.client_profiles for select to authenticated using(referred_by_promoter_id = public.current_promoter_id() or id = (select auth.uid()) or public.is_admin());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('promoter-payout-proofs','promoter-payout-proofs',false,10485760,array['application/pdf','image/jpeg','image/png'])
on conflict(id) do nothing;
drop policy if exists "Finance admins manage payout proofs" on storage.objects;
create policy "Finance admins manage payout proofs" on storage.objects for all to authenticated
using(bucket_id='promoter-payout-proofs' and public.admin_has_permission('finance.manage'))
with check(bucket_id='promoter-payout-proofs' and public.admin_has_permission('finance.manage'));

-- === Admission hooks: assign matricule the first time someone is selected/integrated ===

create or replace function public.create_dietitian_from_application(p_application_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare app public.recruitment_applications; profile_id uuid; photo text; assigned_matricule text;
begin
  if not public.is_admin() then raise exception 'Accès refusé.'; end if;
  select * into app from public.recruitment_applications where id=p_application_id;
  photo:=app.documents->'photo'->0->>'path';
  select matricule into assigned_matricule from public.dietitian_profiles where candidate_id=app.candidate_id;
  if assigned_matricule is null then assigned_matricule:=public.generate_matricule('N'); end if;
  insert into public.dietitian_profiles(candidate_id,application_id,full_name,specialties,photo_path,languages,availability,rate,internal_quality_score,matricule)
  values(app.candidate_id,app.id,app.full_name,app.intervention_domains,photo,app.languages,app.weekly_availability,app.desired_rate,app.administrative_score,assigned_matricule)
  on conflict(candidate_id) do update set status='active',full_name=excluded.full_name,specialties=excluded.specialties,photo_path=excluded.photo_path,languages=excluded.languages,availability=excluded.availability,rate=excluded.rate,internal_quality_score=excluded.internal_quality_score,updated_at=now()
  returning id into profile_id; return profile_id;
end $$;

create or replace function public.lock_referred_by_promoter() returns trigger language plpgsql as $$
begin
  if old.referred_by_promoter_id is not null and new.referred_by_promoter_id is distinct from old.referred_by_promoter_id and not public.is_admin() then
    new.referred_by_promoter_id := old.referred_by_promoter_id;
  end if;
  return new;
end $$;
drop trigger if exists lock_referred_by_promoter on public.client_profiles;
create trigger lock_referred_by_promoter before update on public.client_profiles
for each row execute function public.lock_referred_by_promoter();

create or replace function public.create_promoter_from_application(p_application_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare app public.recruitment_applications; profile_id uuid; assigned_matricule text;
begin
  if not public.is_admin() then raise exception 'Accès refusé.'; end if;
  select * into app from public.recruitment_applications where id=p_application_id;
  select matricule into assigned_matricule from public.promoter_profiles where candidate_id=app.candidate_id;
  if assigned_matricule is null then assigned_matricule:=public.generate_matricule('P'); end if;
  insert into public.promoter_profiles(candidate_id,application_id,full_name,email,phone,matricule)
  values(app.candidate_id,app.id,app.full_name,app.email,app.whatsapp_phone,assigned_matricule)
  on conflict(candidate_id) do update set status='active',full_name=excluded.full_name,email=excluded.email,phone=excluded.phone,updated_at=now()
  returning id into profile_id; return profile_id;
end $$;
