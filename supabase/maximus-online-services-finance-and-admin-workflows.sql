-- Centralisation des finances des services en ligne et des partenaires dans Maximus.
-- À exécuter après partner-consultation-workspace-v2.sql, staff-matricules-and-promoters.sql
-- et medical-specialist-platform.sql.

-- L'historique des attributions et son trigger existent déjà dans partner-consultation-workspace-v2.sql.

alter table public.child_growth_alerts add column if not exists parent_comment text;
alter table public.child_growth_alerts add column if not exists parent_commented_at timestamptz;
alter table public.child_growth_alerts add column if not exists consultation_requested_at timestamptz;

alter table public.recruitment_applications add column if not exists internal_evaluation_percent numeric(5,2) check(internal_evaluation_percent between 0 and 100);
alter table public.recruitment_applications add column if not exists internal_comment text;
alter table public.recruitment_applications add column if not exists candidate_visible_message text;
alter table public.recruitment_applications add column if not exists last_admin_decision text;
alter table public.recruitment_applications add column if not exists last_admin_decision_at timestamptz;

alter table public.medical_specialist_interviews add column if not exists recommended boolean;
alter table public.medical_specialist_interviews add column if not exists final_decision text check(final_decision is null or final_decision in ('recruited','rejected','inconclusive'));
alter table public.medical_specialist_interviews add column if not exists final_decision_at timestamptz;

create sequence if not exists public.partner_vendor_number_seq start 1;
create table if not exists public.partner_vendor_registry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  vendor_number text not null unique,
  partner_type text not null check(partner_type in ('nutritionist','medical_specialist','promoter','supplier','other')),
  source_table text,
  source_id uuid,
  full_name text not null,
  email text,
  phone text,
  country text,
  state_region text,
  city text,
  status text not null default 'active' check(status in ('active','suspended','inactive')),
  recruited_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_table,source_id)
);

create or replace function public.next_partner_vendor_number(p_type text)
returns text language plpgsql security definer set search_path=public as $$
declare prefix text; serial_value bigint;
begin
  prefix:=case p_type when 'medical_specialist' then 'NVGM' when 'nutritionist' then 'NVGN' when 'promoter' then 'NVGP' when 'supplier' then 'NVGF' else 'NVGX' end;
  serial_value:=nextval('public.partner_vendor_number_seq');
  return prefix||upper(lpad(to_hex(serial_value),4,'0'));
end $$;

create or replace function public.set_partner_vendor_number()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.vendor_number is null or btrim(new.vendor_number)='' then new.vendor_number:=public.next_partner_vendor_number(new.partner_type); end if;
  return new;
end $$;
drop trigger if exists partner_vendor_number_before_insert on public.partner_vendor_registry;
create trigger partner_vendor_number_before_insert before insert on public.partner_vendor_registry for each row execute function public.set_partner_vendor_number();

create table if not exists public.online_service_payment_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check(owner_type in ('nutvita','partner')),
  partner_vendor_id uuid references public.partner_vendor_registry(id) on delete cascade,
  account_type text not null check(account_type in ('bank','mobile_money','petty_cash','other')),
  account_holder text not null,
  holder_type text check(holder_type is null or holder_type in ('individual','company')),
  bank_name text,
  bank_country text,
  bank_address text,
  account_number text,
  iban text,
  swift_bic text,
  routing_code text,
  mobile_operator text,
  mobile_number text,
  currency text not null default 'XAF',
  attachments jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check((owner_type='partner' and partner_vendor_id is not null) or owner_type='nutvita')
);

create table if not exists public.partner_service_payments (
  id uuid primary key default gen_random_uuid(),
  payment_reference text not null unique default ('NVG-PAY-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  partner_vendor_id uuid not null references public.partner_vendor_registry(id) on delete restrict,
  payment_account_id uuid references public.online_service_payment_accounts(id) on delete set null,
  period_start date,
  period_end date,
  source_type text not null default 'online_services',
  source_reference text,
  gross_revenue numeric(14,2) not null default 0 check(gross_revenue>=0),
  amount_due numeric(14,2) not null default 0 check(amount_due>=0),
  amount_paid numeric(14,2) not null default 0 check(amount_paid>=0),
  currency text not null default 'XAF',
  status text not null default 'pending' check(status in ('draft','pending','approved','paid','cancelled')),
  payment_date date,
  proofs jsonb not null default '[]'::jsonb,
  finance_comment text,
  initiated_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partner_payment_comments (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.partner_service_payments(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  comment text not null check(char_length(comment) between 1 and 3000),
  created_at timestamptz not null default now()
);

alter table public.partner_vendor_registry enable row level security;
alter table public.online_service_payment_accounts enable row level security;
alter table public.partner_service_payments enable row level security;
alter table public.partner_payment_comments enable row level security;

drop policy if exists "Admins manage partner vendor registry" on public.partner_vendor_registry;
create policy "Admins manage partner vendor registry" on public.partner_vendor_registry for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "Partners read own vendor profile" on public.partner_vendor_registry;
create policy "Partners read own vendor profile" on public.partner_vendor_registry for select to authenticated using(user_id=auth.uid());
drop policy if exists "Admins manage online service accounts" on public.online_service_payment_accounts;
create policy "Admins manage online service accounts" on public.online_service_payment_accounts for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "Partners read own payment accounts" on public.online_service_payment_accounts;
create policy "Partners read own payment accounts" on public.online_service_payment_accounts for select to authenticated using(exists(select 1 from public.partner_vendor_registry v where v.id=partner_vendor_id and v.user_id=auth.uid()));
drop policy if exists "Admins manage partner service payments" on public.partner_service_payments;
create policy "Admins manage partner service payments" on public.partner_service_payments for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "Partners read own service payments" on public.partner_service_payments;
create policy "Partners read own service payments" on public.partner_service_payments for select to authenticated using(exists(select 1 from public.partner_vendor_registry v where v.id=partner_vendor_id and v.user_id=auth.uid()));
drop policy if exists "Payment participants read comments" on public.partner_payment_comments;
create policy "Payment participants read comments" on public.partner_payment_comments for select to authenticated using(public.is_admin() or exists(select 1 from public.partner_service_payments p join public.partner_vendor_registry v on v.id=p.partner_vendor_id where p.id=payment_id and v.user_id=auth.uid()));
drop policy if exists "Payment participants add comments" on public.partner_payment_comments;
create policy "Payment participants add comments" on public.partner_payment_comments for insert to authenticated with check(author_id=auth.uid() and (public.is_admin() or exists(select 1 from public.partner_service_payments p join public.partner_vendor_registry v on v.id=p.partner_vendor_id where p.id=payment_id and v.user_id=auth.uid())));

create index if not exists partner_vendor_registry_type_status_idx on public.partner_vendor_registry(partner_type,status);
create index if not exists online_service_payment_accounts_owner_idx on public.online_service_payment_accounts(owner_type,partner_vendor_id,active);
create index if not exists partner_service_payments_vendor_period_idx on public.partner_service_payments(partner_vendor_id,period_start,period_end);

-- Reprise des partenaires déjà intégrés. Les colonnes communes sont utilisées
-- afin que cette migration reste réexécutable après les migrations métier.
insert into public.partner_vendor_registry(user_id,vendor_number,partner_type,source_table,source_id,full_name,email,status,recruited_at)
select d.candidate_id,public.next_partner_vendor_number('nutritionist'),'nutritionist','dietitian_profiles',d.id,coalesce(d.full_name,u.email),u.email,case when d.status='active' then 'active' else 'inactive' end,now()
from public.dietitian_profiles d left join auth.users u on u.id=d.candidate_id
on conflict(source_table,source_id) do update set full_name=excluded.full_name,email=excluded.email,status=excluded.status;

insert into public.partner_vendor_registry(user_id,vendor_number,partner_type,source_table,source_id,full_name,email,status,recruited_at)
select m.user_id,public.next_partner_vendor_number('medical_specialist'),'medical_specialist','medical_specialists',m.id,m.full_name,m.email,case when m.active then 'active' else 'inactive' end,coalesce(m.recruited_at,now())
from public.medical_specialists m
on conflict(source_table,source_id) do update set full_name=excluded.full_name,email=excluded.email,status=excluded.status;

insert into public.partner_vendor_registry(user_id,vendor_number,partner_type,source_table,source_id,full_name,email,status,recruited_at)
select p.candidate_id,public.next_partner_vendor_number('promoter'),'promoter','promoter_profiles',p.id,p.full_name,p.email,case when p.status='active' then 'active' else 'inactive' end,coalesce(p.created_at,now())
from public.promoter_profiles p
on conflict(source_table,source_id) do update set full_name=excluded.full_name,email=excluded.email,status=excluded.status;

grant select,insert,update on public.consultation_assignment_history to authenticated;
grant select,insert,update on public.partner_vendor_registry,public.online_service_payment_accounts,public.partner_service_payments,public.partner_payment_comments to authenticated;
