-- Admin finance adjustments: general expenses and PayPal partner payout preparation.

alter table public.dietitian_profiles add column if not exists payout_paypal_email text;
alter table public.dietitian_profiles add column if not exists payout_paypal_account_id text;

alter table public.contracts add column if not exists recipient_display_name text;
alter table public.contracts add column if not exists recipient_email text;
alter table public.contracts add column if not exists received_at timestamptz;
alter table public.contracts add column if not exists receipt_acknowledged_by uuid;

create table if not exists public.business_expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  category text not null default 'operations',
  vendor text,
  description text not null,
  amount numeric not null default 0,
  currency text not null default 'USD',
  payment_method text not null default 'manual',
  reference text,
  receipt_url text,
  status text not null default 'paid' check(status in ('planned','pending','paid','cancelled')),
  created_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partner_paypal_payouts (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.dietitian_profiles(id) on delete cascade,
  paypal_email text not null,
  amount numeric not null default 0,
  currency text not null default 'USD',
  period_start date,
  period_end date,
  purpose text not null default 'partner_revenue_share',
  status text not null default 'draft' check(status in ('draft','ready','processing','paid','failed','cancelled')),
  paypal_batch_id text,
  paypal_item_id text,
  provider_response jsonb not null default '{}'::jsonb,
  notes text,
  generated_by uuid references public.admin_users(id) on delete set null,
  generated_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists business_expenses_date_category on public.business_expenses(expense_date desc, category);
create index if not exists partner_paypal_payouts_partner_date on public.partner_paypal_payouts(partner_id, generated_at desc);

alter table public.business_expenses enable row level security;
alter table public.partner_paypal_payouts enable row level security;

drop policy if exists "Finance admins manage business expenses" on public.business_expenses;
create policy "Finance admins manage business expenses" on public.business_expenses for all to authenticated
using(public.is_admin()) with check(public.is_admin());

drop policy if exists "Finance admins manage paypal payouts" on public.partner_paypal_payouts;
create policy "Finance admins manage paypal payouts" on public.partner_paypal_payouts for all to authenticated
using(public.is_admin()) with check(public.is_admin());

drop policy if exists "Partners read own paypal payouts" on public.partner_paypal_payouts;
create policy "Partners read own paypal payouts" on public.partner_paypal_payouts for select to authenticated
using(exists(select 1 from public.dietitian_profiles p where p.id=partner_id and p.candidate_id=(select auth.uid())));
