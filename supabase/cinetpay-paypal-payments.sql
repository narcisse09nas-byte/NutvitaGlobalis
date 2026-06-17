-- Run after admin-finance-adjustments.sql.
-- Enables CinetPay and PayPal as production payment providers.

do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.subscriptions'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%provider%'
    and pg_get_constraintdef(oid) like '%flutterwave%';
  if constraint_name is not null then
    execute format('alter table public.subscriptions drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.subscriptions
  add constraint subscriptions_provider_check
  check (provider in ('stripe','flutterwave','cinetpay','paypal','manual'));

do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.payments'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%provider%'
    and pg_get_constraintdef(oid) like '%flutterwave%';
  if constraint_name is not null then
    execute format('alter table public.payments drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.payments
  add constraint payments_provider_check
  check (provider in ('stripe','flutterwave','cinetpay','paypal','manual'));

do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.payments'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%status%'
    and pg_get_constraintdef(oid) like '%succeeded%';
  if constraint_name is not null then
    execute format('alter table public.payments drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.payments
  add constraint payments_status_check
  check (status in ('pending','succeeded','failed','refunded','cancelled'));

do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.partner_payouts'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%provider%'
    and pg_get_constraintdef(oid) like '%flutterwave%';
  if constraint_name is not null then
    execute format('alter table public.partner_payouts drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.partner_payouts
  add constraint partner_payouts_provider_check
  check (provider in ('manual','stripe','flutterwave','cinetpay','paypal','mobile_money','bank_transfer'));
