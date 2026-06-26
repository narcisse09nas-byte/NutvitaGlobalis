-- Maximus internal management data store.
-- Run after accounts-growth-admin.sql.

create table if not exists public.maximus_records (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  title text not null,
  reference text,
  status text not null default 'draft'
    check(status in ('draft','submitted','endorsed','validated','acknowledged','delivered','served','executed','paid','rejected','archived')),
  data jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.maximus_records add column if not exists workflow_key text;
alter table public.maximus_records add column if not exists parent_id uuid references public.maximus_records(id) on delete set null;
alter table public.maximus_records add column if not exists completed_at timestamptz;

alter table public.maximus_records
  drop constraint if exists maximus_records_status_check;
alter table public.maximus_records
  add constraint maximus_records_status_check
  check(status in ('draft','submitted','endorsed','validated','acknowledged','delivered','served','executed','paid','rejected','archived'));

create index if not exists maximus_records_module_status
on public.maximus_records(module,status,created_at desc);

create index if not exists maximus_records_workflow
on public.maximus_records(workflow_key,parent_id,created_at);

create index if not exists maximus_records_data
on public.maximus_records using gin(data);

create table if not exists public.maximus_record_links (
  id uuid primary key default gen_random_uuid(),
  from_record_id uuid not null references public.maximus_records(id) on delete cascade,
  to_record_id uuid not null references public.maximus_records(id) on delete cascade,
  link_type text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(from_record_id,to_record_id,link_type)
);

create table if not exists public.maximus_stock_ledger (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.maximus_records(id) on delete cascade,
  workflow_action text not null,
  item_code text not null,
  location text not null default 'Stock central',
  movement_type text not null check(movement_type in (
    'receipt','production_output','production_consumption','delivery_out',
    'delivery_in','sale','return','adjustment','loss'
  )),
  quantity numeric not null,
  unit text,
  unit_cost numeric not null default 0,
  amount numeric generated always as (quantity * unit_cost) stored,
  occurred_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.maximus_accounting_entries (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.maximus_records(id) on delete cascade,
  workflow_action text not null,
  entry_date date not null default current_date,
  journal_code text not null default 'OD',
  account_code text not null,
  description text not null,
  debit numeric not null default 0 check(debit >= 0),
  credit numeric not null default 0 check(credit >= 0),
  currency text not null default 'XAF',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check((debit > 0 and credit = 0) or (credit > 0 and debit = 0))
);

create table if not exists public.maximus_workflow_events (
  id uuid primary key default gen_random_uuid(),
  workflow_key text not null,
  source_record_id uuid not null references public.maximus_records(id) on delete cascade,
  target_record_id uuid references public.maximus_records(id) on delete set null,
  action text not null,
  source_module text not null,
  target_module text,
  details jsonb not null default '{}'::jsonb,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists maximus_stock_ledger_item_location
on public.maximus_stock_ledger(item_code,location,occurred_at desc);
create index if not exists maximus_accounting_entries_account
on public.maximus_accounting_entries(account_code,entry_date desc);
create index if not exists maximus_workflow_events_key
on public.maximus_workflow_events(workflow_key,created_at);

create or replace view public.maximus_stock_balances
with (security_invoker=true) as
select
  item_code,
  location,
  coalesce(unit,'') as unit,
  sum(quantity) as quantity,
  sum(amount) as inventory_value,
  max(occurred_at) as last_movement_at
from public.maximus_stock_ledger
group by item_code,location,coalesce(unit,'');

create or replace view public.maximus_trial_balance
with (security_invoker=true) as
select
  account_code,
  currency,
  sum(debit) as total_debit,
  sum(credit) as total_credit,
  sum(debit-credit) as balance
from public.maximus_accounting_entries
group by account_code,currency;

alter table public.maximus_records enable row level security;
alter table public.maximus_record_links enable row level security;
alter table public.maximus_stock_ledger enable row level security;
alter table public.maximus_accounting_entries enable row level security;
alter table public.maximus_workflow_events enable row level security;

drop policy if exists "Super admins manage Maximus records" on public.maximus_records;
create policy "Super admins manage Maximus records"
on public.maximus_records for all to authenticated
using(public.is_super_admin())
with check(public.is_super_admin());

drop policy if exists "Super admins manage Maximus links" on public.maximus_record_links;
create policy "Super admins manage Maximus links"
on public.maximus_record_links for all to authenticated
using(public.is_super_admin()) with check(public.is_super_admin());

drop policy if exists "Super admins manage Maximus stock ledger" on public.maximus_stock_ledger;
create policy "Super admins manage Maximus stock ledger"
on public.maximus_stock_ledger for all to authenticated
using(public.is_super_admin()) with check(public.is_super_admin());

drop policy if exists "Super admins manage Maximus accounting" on public.maximus_accounting_entries;
create policy "Super admins manage Maximus accounting"
on public.maximus_accounting_entries for all to authenticated
using(public.is_super_admin()) with check(public.is_super_admin());

drop policy if exists "Super admins manage Maximus workflow events" on public.maximus_workflow_events;
create policy "Super admins manage Maximus workflow events"
on public.maximus_workflow_events for all to authenticated
using(public.is_super_admin()) with check(public.is_super_admin());

drop trigger if exists set_updated_at on public.maximus_records;
create trigger set_updated_at before update on public.maximus_records
for each row execute function public.set_updated_at();

create or replace function public.advance_maximus_workflow(
  p_record_id uuid,
  p_action text
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  source_record public.maximus_records;
  target_record public.maximus_records;
  workflow_id text;
  items jsonb;
  ingredient_items jsonb;
  item jsonb;
  item_name text;
  item_quantity numeric;
  item_unit text;
  item_price numeric;
  total_amount numeric := 0;
  source_location text;
  target_location text;
  movement text;
begin
  if not public.is_super_admin() then
    raise exception 'Acces super administrateur requis.';
  end if;

  select * into source_record
  from public.maximus_records
  where id=p_record_id
  for update;

  if source_record.id is null then raise exception 'Element Maximus introuvable.'; end if;
  if source_record.status <> 'validated' then raise exception 'Le document doit etre valide avant cette action.'; end if;
  if coalesce(source_record.data->'workflow_processed_actions','[]'::jsonb) ? p_action then
    raise exception 'Cette etape a deja ete executee.';
  end if;

  workflow_id := coalesce(source_record.workflow_key,source_record.id::text);
  items := coalesce(source_record.data->'workflow_items','[]'::jsonb);
  ingredient_items := coalesce(source_record.data->'ingredient_items','[]'::jsonb);

  if p_action='record_stock_movement' and source_record.module='supply/central-stock' then
    movement := case
      when lower(coalesce(source_record.data->>'movement_type','')) like 'entr%' then 'receipt'
      when lower(coalesce(source_record.data->>'movement_type',''))='sortie' then 'adjustment'
      when lower(coalesce(source_record.data->>'movement_type',''))='perte' then 'loss'
      else 'adjustment'
    end;
    item_quantity := abs(coalesce(nullif(source_record.data->>'quantity','')::numeric,0));
    if lower(coalesce(source_record.data->>'movement_type','')) like 'transf%' then
      insert into public.maximus_stock_ledger(
        record_id,workflow_action,item_code,location,movement_type,quantity,unit,unit_cost,created_by
      ) values
        (source_record.id,p_action,coalesce(source_record.data->>'item',source_record.title),
         'Stock central','adjustment',-item_quantity,source_record.data->>'unit',0,(select auth.uid())),
        (source_record.id,p_action,coalesce(source_record.data->>'item',source_record.title),
         coalesce(nullif(source_record.data->>'destination',''),'Destination'),
         'adjustment',item_quantity,source_record.data->>'unit',0,(select auth.uid()));
    else
      if movement in ('loss','adjustment') and lower(coalesce(source_record.data->>'movement_type','')) in ('sortie','perte') then
      item_quantity := -item_quantity;
      end if;
      insert into public.maximus_stock_ledger(
        record_id,workflow_action,item_code,location,movement_type,quantity,unit,unit_cost,created_by
      ) values(
        source_record.id,p_action,coalesce(source_record.data->>'item',source_record.title),
        'Stock central',movement,item_quantity,source_record.data->>'unit',0,(select auth.uid())
      );
    end if;

  elsif p_action='plan_production' and source_record.module='sales/daily-orders' then
    insert into public.maximus_records(module,title,reference,status,data,workflow_key,parent_id,created_by,updated_by)
    values(
      'production/planning','Production - '||source_record.title,'PROD-'||to_char(now(),'YYYYMMDDHH24MISS'),'draft',
      jsonb_build_object(
        'plan_name','Production - '||source_record.title,
        'central_kitchen',coalesce(source_record.data->>'central_kitchen',''),
        'sale_point',coalesce(source_record.data->>'sale_point',''),
        'period_start',coalesce(source_record.data->>'order_date',''),
        'period_end',coalesce(source_record.data->>'order_date',''),
        'menus_quantities',coalesce(source_record.data->>'menus',''),
        'specific_ingredients',coalesce(source_record.data->>'specific_ingredients',''),
        'workflow_items',items,
        'ingredient_items',ingredient_items,
        'source_record_id',source_record.id
      ),
      workflow_id,source_record.id,(select auth.uid()),(select auth.uid())
    ) returning * into target_record;

  elsif p_action='complete_production' and source_record.module='production/planning' then
    source_location := coalesce(nullif(source_record.data->>'central_kitchen',''),'Cuisine centrale');
    for item in select value from jsonb_array_elements(ingredient_items)
    loop
      item_name := coalesce(nullif(item->>'item',''),'Ingredient');
      item_quantity := abs(coalesce(nullif(item->>'quantity','')::numeric,0));
      item_unit := item->>'unit';
      item_price := coalesce(nullif(item->>'unit_price','')::numeric,0);
      if item_quantity > 0 then
        insert into public.maximus_stock_ledger(record_id,workflow_action,item_code,location,movement_type,quantity,unit,unit_cost,created_by)
        values(source_record.id,p_action,item_name,'Stock central','production_consumption',-item_quantity,item_unit,item_price,(select auth.uid()));
      end if;
    end loop;
    for item in select value from jsonb_array_elements(items)
    loop
      item_name := coalesce(nullif(item->>'item',''),'Article');
      item_quantity := abs(coalesce(nullif(item->>'quantity','')::numeric,0));
      item_unit := item->>'unit';
      item_price := coalesce(nullif(item->>'unit_price','')::numeric,0);
      if item_quantity > 0 then
        insert into public.maximus_stock_ledger(record_id,workflow_action,item_code,location,movement_type,quantity,unit,unit_cost,created_by)
        values(source_record.id,p_action,item_name,source_location,'production_output',item_quantity,item_unit,item_price,(select auth.uid()));
      end if;
    end loop;
    insert into public.maximus_records(module,title,reference,status,data,workflow_key,parent_id,created_by,updated_by)
    values(
      'sales/delivery-register','Livraison - '||source_record.title,'BL-'||to_char(now(),'YYYYMMDDHH24MISS'),'draft',
      jsonb_build_object(
        'reference','BL-'||to_char(now(),'YYYYMMDDHH24MISS'),
        'sale_point',coalesce(source_record.data->>'sale_point',''),
        'central_kitchen',source_location,
        'delivery_date',coalesce(source_record.data->>'period_end',source_record.data->>'period_start',''),
        'items',coalesce(source_record.data->>'menus_quantities',''),
        'workflow_items',items,
        'source_record_id',source_record.id
      ),
      workflow_id,source_record.id,(select auth.uid()),(select auth.uid())
    ) returning * into target_record;

  elsif p_action='confirm_delivery' and source_record.module='sales/delivery-register' then
    source_location := coalesce(nullif(source_record.data->>'central_kitchen',''),'Cuisine centrale');
    target_location := coalesce(nullif(source_record.data->>'sale_point',''),'Point de vente');
    for item in select value from jsonb_array_elements(items)
    loop
      item_name := coalesce(nullif(item->>'item',''),'Article');
      item_quantity := abs(coalesce(nullif(item->>'quantity','')::numeric,0));
      item_unit := item->>'unit';
      item_price := coalesce(nullif(item->>'unit_price','')::numeric,0);
      if item_quantity > 0 then
        insert into public.maximus_stock_ledger(record_id,workflow_action,item_code,location,movement_type,quantity,unit,unit_cost,created_by)
        values
          (source_record.id,p_action,item_name,source_location,'delivery_out',-item_quantity,item_unit,item_price,(select auth.uid())),
          (source_record.id,p_action,item_name,target_location,'delivery_in',item_quantity,item_unit,item_price,(select auth.uid()));
        total_amount := total_amount + item_quantity*item_price;
      end if;
    end loop;
    insert into public.maximus_records(module,title,reference,status,data,workflow_key,parent_id,created_by,updated_by)
    values(
      'sales/reports','Ventes - '||source_record.title,'VENTE-'||to_char(now(),'YYYYMMDDHH24MISS'),'draft',
      jsonb_build_object(
        'sale_point',target_location,
        'report_date',coalesce(source_record.data->>'delivery_date',''),
        'gross_sales',total_amount,
        'workflow_items',items,
        'source_record_id',source_record.id
      ),
      workflow_id,source_record.id,(select auth.uid()),(select auth.uid())
    ) returning * into target_record;

  elsif p_action='post_sales' and source_record.module='sales/reports' then
    target_location := coalesce(nullif(source_record.data->>'sale_point',''),'Point de vente');
    total_amount := coalesce(nullif(source_record.data->>'gross_sales','')::numeric,0);
    for item in select value from jsonb_array_elements(items)
    loop
      item_name := coalesce(nullif(item->>'item',''),'Article');
      item_quantity := abs(coalesce(nullif(item->>'quantity','')::numeric,0));
      item_unit := item->>'unit';
      item_price := coalesce(nullif(item->>'unit_price','')::numeric,0);
      if item_quantity > 0 then
        insert into public.maximus_stock_ledger(record_id,workflow_action,item_code,location,movement_type,quantity,unit,unit_cost,created_by)
        values(source_record.id,p_action,item_name,target_location,'sale',-item_quantity,item_unit,item_price,(select auth.uid()));
      end if;
    end loop;
    if total_amount <= 0 then
      select coalesce(sum(coalesce(nullif(value->>'quantity','')::numeric,0)*coalesce(nullif(value->>'unit_price','')::numeric,0)),0)
      into total_amount from jsonb_array_elements(items);
    end if;
    if total_amount > 0 then
      insert into public.maximus_accounting_entries(record_id,workflow_action,journal_code,account_code,description,debit,credit,created_by)
      values
        (source_record.id,p_action,'VT','571000','Recettes a deposer - '||source_record.title,total_amount,0,(select auth.uid())),
        (source_record.id,p_action,'VT','707000','Ventes restauration - '||source_record.title,0,total_amount,(select auth.uid()));
    end if;
    insert into public.maximus_records(module,title,reference,status,data,workflow_key,parent_id,created_by,updated_by)
    values(
      'finance/cash-deposits','Depot - '||source_record.title,'DEP-'||to_char(now(),'YYYYMMDDHH24MISS'),'draft',
      jsonb_build_object(
        'sale_point',target_location,
        'report_reference',coalesce(source_record.reference,source_record.id::text),
        'amount',total_amount,
        'deposit_date',coalesce(source_record.data->>'report_date',''),
        'source_record_id',source_record.id
      ),
      workflow_id,source_record.id,(select auth.uid()),(select auth.uid())
    ) returning * into target_record;

  elsif p_action='post_deposit' and source_record.module='finance/cash-deposits' then
    total_amount := coalesce(nullif(source_record.data->>'amount','')::numeric,0);
    if total_amount <= 0 then raise exception 'Le montant du depot doit etre superieur a zero.'; end if;
    insert into public.maximus_accounting_entries(record_id,workflow_action,journal_code,account_code,description,debit,credit,created_by)
    values
      (source_record.id,p_action,'BQ','512000','Depot de recettes - '||source_record.title,total_amount,0,(select auth.uid())),
      (source_record.id,p_action,'BQ','571000','Apurement recettes a deposer - '||source_record.title,0,total_amount,(select auth.uid()));
  else
    raise exception 'Action % incompatible avec le module %.',p_action,source_record.module;
  end if;

  if target_record.id is not null then
    insert into public.maximus_record_links(from_record_id,to_record_id,link_type,created_by)
    values(source_record.id,target_record.id,p_action,(select auth.uid()));
  end if;

  update public.maximus_records
  set workflow_key=workflow_id,
      completed_at=now(),
      data=jsonb_set(
        data,
        '{workflow_processed_actions}',
        coalesce(data->'workflow_processed_actions','[]'::jsonb)||to_jsonb(p_action),
        true
      ),
      updated_by=(select auth.uid())
  where id=source_record.id;

  insert into public.maximus_workflow_events(
    workflow_key,source_record_id,target_record_id,action,source_module,target_module,details,actor_id
  ) values(
    workflow_id,source_record.id,target_record.id,p_action,source_record.module,target_record.module,
    jsonb_build_object('source_status',source_record.status,'target_status',target_record.status),
    (select auth.uid())
  );

  return jsonb_build_object(
    'workflow_key',workflow_id,
    'source_record_id',source_record.id,
    'target_record_id',target_record.id,
    'target_module',target_record.module
  );
end $$;

revoke all on function public.advance_maximus_workflow(uuid,text) from public;
grant execute on function public.advance_maximus_workflow(uuid,text) to authenticated;
