-- Run after cinetpay-paypal-payments.sql.
-- Manual Mobile Money and bank transfer fallback with private proof upload.
-- Also reserves `campay` as a future automatic provider.

do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.subscriptions'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%provider%';
  if constraint_name is not null then
    execute format('alter table public.subscriptions drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.subscriptions
  add constraint subscriptions_provider_check
  check (provider in ('stripe','flutterwave','cinetpay','campay','paypal','manual'));

alter table public.subscriptions add column if not exists started_at timestamptz;
alter table public.subscriptions add column if not exists expires_at timestamptz;
alter table public.subscriptions add column if not exists renewal_period_months integer not null default 12;

do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.payments'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%provider%';
  if constraint_name is not null then
    execute format('alter table public.payments drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.payments
  add constraint payments_provider_check
  check (provider in ('stripe','flutterwave','cinetpay','campay','paypal','manual'));

create table if not exists public.payment_accounts (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  method text not null check(method in ('mobile_money','bank_transfer')),
  provider_name text not null,
  account_name text not null,
  account_number text not null,
  bank_name text,
  iban text,
  swift_bic text,
  country_code text not null default 'CM',
  currency text not null default 'XAF',
  instructions text,
  active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payments add column if not exists manual_method text check(manual_method in ('mobile_money','bank_transfer'));
alter table public.payments add column if not exists manual_account_id uuid references public.payment_accounts(id) on delete set null;
alter table public.payments add column if not exists checkout_reference text;
alter table public.payments add column if not exists source_amount_xof numeric;
alter table public.payments add column if not exists exchange_rate_xof_per_usd numeric;
alter table public.payments add column if not exists price_excluding_tax numeric;
alter table public.payments add column if not exists tax_rate numeric not null default 0;
alter table public.payments add column if not exists tax_amount numeric not null default 0;
alter table public.payments add column if not exists total_including_tax numeric;
alter table public.payments add column if not exists proof_path text;
alter table public.payments add column if not exists proof_reference text;
alter table public.payments add column if not exists proof_notes text;
alter table public.payments add column if not exists proof_submitted_at timestamptz;
alter table public.payments add column if not exists manual_reviewed_by uuid references auth.users(id) on delete set null;
alter table public.payments add column if not exists manual_reviewed_at timestamptz;
alter table public.payments add column if not exists manual_review_notes text;

alter table public.invoices add column if not exists product_name text;
alter table public.invoices add column if not exists purchase_type text;
alter table public.invoices add column if not exists payment_provider text;
alter table public.invoices add column if not exists payment_status text not null default 'paid';
alter table public.invoices add column if not exists client_name text;
alter table public.invoices add column if not exists client_email text;

create index if not exists payment_accounts_method_active on public.payment_accounts(method, active, sort_order);
create index if not exists payments_manual_review on public.payments(provider, status, proof_submitted_at desc);

alter table public.payment_accounts enable row level security;

drop policy if exists "Active payment accounts readable by authenticated clients" on public.payment_accounts;
create policy "Active payment accounts readable by authenticated clients" on public.payment_accounts
for select to authenticated using(active = true or public.is_admin());

drop policy if exists "Admins manage payment accounts" on public.payment_accounts;
create policy "Admins manage payment accounts" on public.payment_accounts
for all to authenticated using(public.is_admin()) with check(public.is_admin());

insert into public.payment_accounts(label,method,provider_name,account_name,account_number,instructions,sort_order)
values
  ('MTN Mobile Money','mobile_money','MTN MoMo','NutVitaGlobalis','A RENSEIGNER','Indiquez la reference NutVitaGlobalis dans le message de paiement.',10),
  ('Orange Money','mobile_money','Orange Money','NutVitaGlobalis','A RENSEIGNER','Indiquez la reference NutVitaGlobalis dans le message de paiement.',20)
on conflict do nothing;
