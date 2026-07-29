-- Unified Maximus treasury ledger.
-- Apply after catering-commerce.sql and maximus-internal-management.sql.

create table if not exists public.maximus_financial_accounts (
  id uuid primary key default gen_random_uuid(),
  channel text not null check(channel in ('bank','mobile_money','petty_cash')),
  name text not null,
  institution text,
  account_number text,
  currency text not null default 'XAF',
  opening_balance numeric(14,2) not null default 0,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(channel,name)
);

create table if not exists public.maximus_settlement_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique default ('NVG-VERS-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  source_type text not null check(source_type in ('catering_delivery','sale_point_closure')),
  source_id uuid not null,
  payer_name text not null,
  sale_point text,
  amount numeric(14,2) not null check(amount >= 0),
  currency text not null default 'XAF',
  status text not null default 'pending' check(status in ('pending','received','cancelled')),
  financial_account_id uuid references public.maximus_financial_accounts(id) on delete restrict,
  payment_reference text,
  note text,
  received_by uuid references auth.users(id) on delete set null,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  unique(source_type,source_id)
);

create table if not exists public.maximus_treasury_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_number text not null unique default ('NVG-TRX-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  direction text not null check(direction in ('revenue','expense')),
  financial_account_id uuid not null references public.maximus_financial_accounts(id) on delete restrict,
  amount numeric(14,2) not null check(amount >= 0),
  currency text not null default 'XAF',
  category text not null,
  description text not null,
  source_type text not null,
  source_id uuid,
  reference text,
  transaction_date date not null default current_date,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(source_type,source_id,direction)
);


create or replace function public.confirm_maximus_settlement(
  p_ticket_id uuid, p_account_id uuid, p_reference text, p_note text, p_actor uuid
) returns public.maximus_settlement_tickets
language plpgsql security definer set search_path=public as $$
declare ticket public.maximus_settlement_tickets; account public.maximus_financial_accounts;
begin
  select * into ticket from public.maximus_settlement_tickets where id=p_ticket_id and status='pending' for update;
  if ticket.id is null then raise exception 'settlement_ticket_unavailable'; end if;
  select * into account from public.maximus_financial_accounts where id=p_account_id and active for share;
  if account.id is null then raise exception 'financial_account_unavailable'; end if;
  update public.maximus_settlement_tickets set status='received', financial_account_id=account.id,
    payment_reference=p_reference, note=p_note, received_by=p_actor, received_at=now()
  where id=ticket.id returning * into ticket;
  insert into public.maximus_treasury_transactions(direction,financial_account_id,amount,currency,category,description,source_type,source_id,reference,recorded_by)
  values('revenue',account.id,ticket.amount,ticket.currency,
    case when ticket.source_type='catering_delivery' then 'Livraison restauration' else 'Ventes point de vente' end,
    'Versement '||ticket.ticket_number,ticket.source_type,ticket.source_id,coalesce(nullif(p_reference,''),ticket.ticket_number),p_actor)
  on conflict(source_type,source_id,direction) do nothing;
  return ticket;
end $$;
revoke all on function public.confirm_maximus_settlement(uuid,uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.confirm_maximus_settlement(uuid,uuid,text,text,uuid) to service_role;
create index if not exists maximus_settlement_status_idx on public.maximus_settlement_tickets(status,created_at);
create index if not exists maximus_treasury_date_idx on public.maximus_treasury_transactions(transaction_date,direction);
create index if not exists maximus_treasury_account_idx on public.maximus_treasury_transactions(financial_account_id,transaction_date);

alter table public.maximus_financial_accounts enable row level security;
alter table public.maximus_settlement_tickets enable row level security;
alter table public.maximus_treasury_transactions enable row level security;

drop policy if exists "Finance reads financial accounts" on public.maximus_financial_accounts;
drop policy if exists "Finance manages financial accounts" on public.maximus_financial_accounts;
drop policy if exists "Finance reads settlement tickets" on public.maximus_settlement_tickets;
drop policy if exists "Finance manages settlement tickets" on public.maximus_settlement_tickets;
drop policy if exists "Finance reads treasury transactions" on public.maximus_treasury_transactions;
drop policy if exists "Finance records treasury transactions" on public.maximus_treasury_transactions;
create policy "Finance reads financial accounts" on public.maximus_financial_accounts for select to authenticated
using(public.is_admin() or public.maximus_has_access('finance/treasury-accounts','viewer'));
create policy "Finance manages financial accounts" on public.maximus_financial_accounts for all to authenticated
using(public.is_admin() or public.maximus_has_access('finance/treasury-accounts','editor'))
with check(public.is_admin() or public.maximus_has_access('finance/treasury-accounts','editor'));
create policy "Finance reads settlement tickets" on public.maximus_settlement_tickets for select to authenticated
using(public.is_admin() or public.maximus_has_access('finance/settlements','viewer'));
create policy "Finance manages settlement tickets" on public.maximus_settlement_tickets for all to authenticated
using(public.is_admin() or public.maximus_has_access('finance/settlements','validator'))
with check(public.is_admin() or public.maximus_has_access('finance/settlements','validator'));
create policy "Finance reads treasury transactions" on public.maximus_treasury_transactions for select to authenticated
using(public.is_admin() or public.maximus_has_access('finance/reports','viewer'));
create policy "Finance records treasury transactions" on public.maximus_treasury_transactions for insert to authenticated
with check(public.is_admin() or public.maximus_has_access('finance/settlements','validator') or public.maximus_has_access('finance/payments','validator'));

drop trigger if exists set_updated_at on public.maximus_financial_accounts;
create trigger set_updated_at before update on public.maximus_financial_accounts for each row execute function public.set_updated_at();

create or replace function public.create_sale_point_settlement_ticket()
returns trigger language plpgsql security definer set search_path=public as $$
declare total numeric;
begin
  if new.module='sales/reports' and new.status in ('validated','served','acknowledged')
     and old.status is distinct from new.status then
    total:=coalesce(nullif(new.data->>'gross_sales','')::numeric,0);
    if total>0 then
      insert into public.maximus_settlement_tickets(source_type,source_id,payer_name,sale_point,amount,currency)
      values('sale_point_closure',new.id,coalesce(new.data->>'responsible_name',new.data->>'manager_name',new.data->>'responsible','Responsable du point de vente'),new.data->>'sale_point',total,coalesce(new.data->>'currency','XAF'))
      on conflict(source_type,source_id) do nothing;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists create_sale_point_settlement_ticket on public.maximus_records;
create trigger create_sale_point_settlement_ticket after update of status on public.maximus_records
for each row execute function public.create_sale_point_settlement_ticket();

create or replace function public.record_maximus_expense_in_treasury()
returns trigger language plpgsql security definer set search_path=public as $$
declare account_id uuid; value numeric;
begin
  if new.module in ('finance/payments','finance/petty-cash')
     and new.status in ('executed','paid','validated')
     and old.status is distinct from new.status then
    account_id:=nullif(new.data->>'financial_account_id','')::uuid;
    if account_id is null and new.module='finance/petty-cash' then
      select id into account_id from public.maximus_financial_accounts where channel='petty_cash' and active order by created_at limit 1;
    end if;
    value:=coalesce(nullif(new.data->>'amount','')::numeric,nullif(new.data->>'total_amount','')::numeric,0);
    if account_id is not null and value>0 and coalesce(new.data->>'cash_flow_direction','out')<>'in' then
      insert into public.maximus_treasury_transactions(direction,financial_account_id,amount,currency,category,description,source_type,source_id,reference,recorded_by)
      values('expense',account_id,value,coalesce(new.data->>'currency','XAF'),coalesce(new.data->>'budget_line','Dépense'),new.title,new.module,new.id,coalesce(new.data->>'payment_reference',new.reference),new.updated_by)
      on conflict(source_type,source_id,direction) do nothing;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists record_maximus_expense_in_treasury on public.maximus_records;
create trigger record_maximus_expense_in_treasury after update of status on public.maximus_records
for each row execute function public.record_maximus_expense_in_treasury();

-- Internal transfers are balance movements, never revenue or expense.
create table if not exists public.maximus_internal_transfers (
  id uuid primary key default gen_random_uuid(),
  transfer_number text not null unique default ('NVG-VIR-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  source_account_id uuid not null references public.maximus_financial_accounts(id) on delete restrict,
  destination_account_id uuid not null references public.maximus_financial_accounts(id) on delete restrict,
  amount numeric(14,2) not null check(amount>0),
  currency text not null default 'XAF',
  reason text not null,
  proof_reference text not null,
  proof_url text,
  status text not null default 'pending' check(status in ('pending','confirmed','rejected')),
  initiated_by uuid not null references auth.users(id) on delete restrict,
  initiated_by_name text not null,
  initiator_is_finance boolean not null default false,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_note text,
  reviewed_at timestamptz,
  transfer_date date not null default current_date,
  created_at timestamptz not null default now(),
  check(source_account_id<>destination_account_id)
);
create index if not exists maximus_internal_transfers_status_idx on public.maximus_internal_transfers(status,created_at desc);
create index if not exists maximus_internal_transfers_accounts_idx on public.maximus_internal_transfers(source_account_id,destination_account_id,transfer_date);
alter table public.maximus_internal_transfers enable row level security;
drop policy if exists "Finance reads internal transfers" on public.maximus_internal_transfers;
create policy "Finance reads internal transfers" on public.maximus_internal_transfers for select to authenticated
using(public.is_admin() or initiated_by=auth.uid() or public.maximus_has_access('finance/internal-transfers','viewer'));

create or replace function public.confirm_maximus_internal_transfer(p_transfer_id uuid,p_actor uuid,p_note text)
returns public.maximus_internal_transfers language plpgsql security definer set search_path=public as $$
declare transfer public.maximus_internal_transfers; available numeric;
begin
  select * into transfer from public.maximus_internal_transfers where id=p_transfer_id and status='pending' for update;
  if transfer.id is null then raise exception 'transfer_unavailable'; end if;
  select a.opening_balance
    + coalesce((select sum(case when t.direction='revenue' then t.amount else -t.amount end) from public.maximus_treasury_transactions t where t.financial_account_id=a.id and t.transaction_date<=transfer.transfer_date),0)
    + coalesce((select sum(case when x.destination_account_id=a.id then x.amount else -x.amount end) from public.maximus_internal_transfers x where x.status='confirmed' and (x.source_account_id=a.id or x.destination_account_id=a.id) and x.transfer_date<=transfer.transfer_date),0)
  into available from public.maximus_financial_accounts a where a.id=transfer.source_account_id;
  if available<transfer.amount then raise exception 'insufficient_source_balance'; end if;
  update public.maximus_internal_transfers set status='confirmed',reviewed_by=p_actor,review_note=p_note,reviewed_at=now()
  where id=transfer.id returning * into transfer;
  return transfer;
end $$;
revoke all on function public.confirm_maximus_internal_transfer(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.confirm_maximus_internal_transfer(uuid,uuid,text) to service_role;
