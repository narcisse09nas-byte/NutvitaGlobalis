-- Run after partner-collaboration.sql.
-- Advanced partner workflows: onsite payments, client assignment, waiting room and partner payouts.

alter table public.client_profiles add column if not exists assigned_partner_id uuid references public.dietitian_profiles(id) on delete set null;
alter table public.client_profiles add column if not exists partner_access_starts_at timestamptz;
alter table public.client_profiles add column if not exists partner_access_expires_at timestamptz;
alter table public.client_profiles add column if not exists partner_assignment_status text not null default 'none'
  check(partner_assignment_status in ('none','waiting','requested','assigned_pending_partner','active','rejected','ended'));

alter table public.dietitian_profiles add column if not exists payout_method text;
alter table public.dietitian_profiles add column if not exists payout_account_name text;
alter table public.dietitian_profiles add column if not exists payout_account_number text;
alter table public.dietitian_profiles add column if not exists payout_bank_name text;
alter table public.dietitian_profiles add column if not exists payout_mobile_money_operator text;
alter table public.dietitian_profiles add column if not exists payout_mobile_money_phone text;
alter table public.dietitian_profiles add column if not exists payout_notes text;

alter table public.partner_consultations add column if not exists client_access_payment_id uuid;
alter table public.partner_consultations alter column amount set default 0;

create table if not exists public.partner_client_payments (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.dietitian_profiles(id) on delete cascade,
  client_id uuid not null references public.client_profiles(id) on delete cascade,
  amount numeric(12,2) not null default 0,
  currency text not null default 'XOF',
  payment_status text not null default 'paid' check(payment_status in ('unpaid','partial','paid','waived')),
  payment_method text,
  receipt_path text,
  period_months integer not null default 3,
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.consultation_waiting_room (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.client_profiles(id) on delete cascade,
  teleconseil_id uuid references public.teleconseils(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  reason text,
  status text not null default 'waiting'
    check(status in ('waiting','partner_interested','assigned_pending_partner','active','rejected','cancelled','completed')),
  preferred_language text,
  country text,
  city text,
  ai_recommendation jsonb not null default '{}'::jsonb,
  selected_partner_id uuid references public.dietitian_profiles(id) on delete set null,
  selected_by_admin uuid references auth.users(id) on delete set null,
  partner_endorsed_at timestamptz,
  admin_validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.consultation_waiting_room_interests (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.consultation_waiting_room(id) on delete cascade,
  partner_id uuid not null references public.dietitian_profiles(id) on delete cascade,
  message text,
  status text not null default 'pending' check(status in ('pending','accepted','rejected','withdrawn')),
  created_at timestamptz not null default now(),
  unique(request_id, partner_id)
);

create table if not exists public.partner_payouts (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.dietitian_profiles(id) on delete cascade,
  amount numeric(12,2) not null,
  currency text not null default 'XOF',
  provider text not null default 'manual' check(provider in ('manual','stripe','flutterwave','mobile_money','bank_transfer')),
  provider_reference text,
  payout_method text,
  status text not null default 'pending' check(status in ('pending','processing','paid','failed','cancelled')),
  period_start date,
  period_end date,
  notes text,
  paid_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists client_profiles_partner_access on public.client_profiles(assigned_partner_id, partner_access_expires_at);
create index if not exists partner_client_payments_partner_date on public.partner_client_payments(partner_id, created_at desc);
create index if not exists waiting_room_status_date on public.consultation_waiting_room(status, created_at desc);
create index if not exists partner_payouts_partner_date on public.partner_payouts(partner_id, created_at desc);

alter table public.partner_client_payments enable row level security;
alter table public.consultation_waiting_room enable row level security;
alter table public.consultation_waiting_room_interests enable row level security;
alter table public.partner_payouts enable row level security;

drop policy if exists "Partners read assigned clients" on public.client_profiles;
create policy "Partners read assigned clients" on public.client_profiles for select to authenticated
using(
  id=(select auth.uid())
  or created_by_partner_id=public.current_partner_id()
  or assigned_partner_id=public.current_partner_id()
  or public.is_admin()
);

create policy "Partners create client payments" on public.partner_client_payments for insert to authenticated
with check(partner_id=public.current_partner_id() or public.is_admin());
create policy "Partners read client payments" on public.partner_client_payments for select to authenticated
using(partner_id=public.current_partner_id() or client_id=(select auth.uid()) or public.is_admin());

create policy "Waiting room visible to partners and admins" on public.consultation_waiting_room for select to authenticated
using(public.current_partner_id() is not null or client_id=(select auth.uid()) or public.is_admin());
create policy "Clients create waiting requests" on public.consultation_waiting_room for insert to authenticated
with check(client_id=(select auth.uid()) or public.is_admin());
create policy "Admins manage waiting room" on public.consultation_waiting_room for update to authenticated
using(public.is_admin()) with check(public.is_admin());
create policy "Assigned partners endorse requests" on public.consultation_waiting_room for update to authenticated
using(selected_partner_id=public.current_partner_id()) with check(selected_partner_id=public.current_partner_id());

create policy "Partners express interest" on public.consultation_waiting_room_interests for insert to authenticated
with check(partner_id=public.current_partner_id());
create policy "Partners and admins read interests" on public.consultation_waiting_room_interests for select to authenticated
using(partner_id=public.current_partner_id() or public.is_admin());
create policy "Admins update interests" on public.consultation_waiting_room_interests for update to authenticated
using(public.is_admin()) with check(public.is_admin());

create policy "Partners read own payouts" on public.partner_payouts for select to authenticated
using(partner_id=public.current_partner_id() or public.is_admin());
create policy "Finance admins manage partner payouts" on public.partner_payouts for all to authenticated
using(public.admin_has_permission('finance.read')) with check(public.admin_has_permission('finance.manage'));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('partner-receipts','partner-receipts',false,10485760,array['application/pdf','image/jpeg','image/png'])
on conflict(id) do nothing;
create policy "Partners upload receipts" on storage.objects for insert to authenticated with check(bucket_id='partner-receipts');
create policy "Partners read receipts" on storage.objects for select to authenticated using(bucket_id='partner-receipts');
