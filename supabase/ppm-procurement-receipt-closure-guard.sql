-- Prevent duplicate/over receipts and support auditable early PO closure.
-- Run after ppm-procurement-receiving-upgrade.sql. Safe to run more than once.

alter table public.ppm_procurement_receipts
  add column if not exists cancelled_quantity numeric(14,2) not null default 0,
  add column if not exists early_close_reason text,
  add column if not exists early_close_reason_detail text;

alter table public.ppm_procurement_receipts drop constraint if exists ppm_receipts_early_close_reason_check;
alter table public.ppm_procurement_receipts add constraint ppm_receipts_early_close_reason_check check(
  early_close_reason is null or early_close_reason in (
    'supplier_unable','need_reduced','contract_amendment','deadline_expired',
    'quality_issue','budget_decision','force_majeure','other'
  )
);
alter table public.ppm_procurement_receipts drop constraint if exists ppm_receipts_early_close_detail_check;
alter table public.ppm_procurement_receipts add constraint ppm_receipts_early_close_detail_check check(
  status <> 'closed_with_cancelled_balance'
  or (early_close_reason is not null and (early_close_reason <> 'other' or nullif(trim(early_close_reason_detail),'') is not null))
);

create or replace function public.ppm_guard_procurement_receipt()
returns trigger language plpgsql security definer set search_path=public set row_security=off as $$
declare
  v_item_status text;
  v_ordered numeric(14,2);
  v_accepted numeric(14,2);
  v_new_accepted numeric(14,2);
  v_remaining numeric(14,2);
begin
  select receipt_status into v_item_status
  from public.ppm_procurement_items where id=new.procurement_item_id for update;
  if not found then raise exception 'PO introuvable'; end if;
  if v_item_status in ('complete','received_with_reservations','closed_with_cancelled_balance') then
    raise exception 'Ce PO est deja cloture; aucune nouvelle reception n''est autorisee';
  end if;

  v_ordered := greatest(coalesce(new.quantity_ordered,0),0);
  select coalesce(sum(coalesce(quantity_accepted,current_quantity,0)),0) into v_accepted
  from public.ppm_procurement_receipts
  where procurement_item_id=new.procurement_item_id
    and status not in ('rejected','returned_to_supplier');
  v_new_accepted := case when new.status in ('rejected','returned_to_supplier') then 0 else greatest(coalesce(new.quantity_accepted,new.current_quantity,0),0) end;
  if v_new_accepted > greatest(v_ordered-v_accepted,0) then
    raise exception 'La quantite recue (%) depasse le reliquat disponible (%)',v_new_accepted,greatest(v_ordered-v_accepted,0);
  end if;
  v_remaining := greatest(v_ordered-v_accepted-v_new_accepted,0);
  new.previous_quantity := v_accepted;
  new.quantity_accepted := v_new_accepted;

  if new.status='closed_with_cancelled_balance' then
    if new.early_close_reason is null then raise exception 'Le motif de cloture anticipee est obligatoire'; end if;
    if new.early_close_reason='other' and nullif(trim(new.early_close_reason_detail),'') is null then raise exception 'La precision du motif est obligatoire'; end if;
    if v_remaining=0 then
      new.status := 'complete'; new.cancelled_quantity := 0; new.remaining_quantity := 0;
    else
      new.cancelled_quantity := v_remaining; new.remaining_quantity := 0;
    end if;
  elsif new.status in ('pending_delivery','partial','complete') then
    new.status := case when v_remaining=0 then 'complete' else 'partial' end;
    new.cancelled_quantity := 0; new.remaining_quantity := v_remaining;
  elsif new.status='received_with_reservations' then
    new.status := case when v_remaining=0 then 'received_with_reservations' else 'partial' end;
    new.cancelled_quantity := 0; new.remaining_quantity := v_remaining;
  else
    new.cancelled_quantity := 0; new.remaining_quantity := greatest(v_ordered-v_accepted,0);
  end if;
  return new;
end $$;

drop trigger if exists ppm_guard_procurement_receipt on public.ppm_procurement_receipts;
create trigger ppm_guard_procurement_receipt before insert on public.ppm_procurement_receipts
for each row execute function public.ppm_guard_procurement_receipt();

create or replace function public.ppm_refresh_procurement_receipt_status(p_procurement_item_id uuid)
returns void language plpgsql security definer set search_path=public set row_security=off as $$
declare v_status text; v_ordered numeric; v_accepted numeric;
begin
  select coalesce(max(quantity_ordered),0),coalesce(sum(quantity_accepted) filter(where status not in ('rejected','returned_to_supplier')),0)
  into v_ordered,v_accepted from public.ppm_procurement_receipts where procurement_item_id=p_procurement_item_id;
  select case
    when bool_or(status='closed_with_cancelled_balance') then 'closed_with_cancelled_balance'
    when v_ordered>0 and v_accepted>=v_ordered and bool_or(status='received_with_reservations') then 'received_with_reservations'
    when v_ordered>0 and v_accepted>=v_ordered then 'complete'
    when v_accepted>0 then 'partial'
    when bool_or(status='returned_to_supplier') then 'returned_to_supplier'
    when bool_or(status='rejected') then 'rejected'
    else 'pending_delivery' end
  into v_status from public.ppm_procurement_receipts where procurement_item_id=p_procurement_item_id;
  update public.ppm_procurement_items set receipt_status=coalesce(v_status,'pending_delivery'),
    received_date=(select max(receipt_date) from public.ppm_procurement_receipts where procurement_item_id=p_procurement_item_id)
  where id=p_procurement_item_id;
end $$;

create or replace function public.ppm_refresh_receipt_status_after_insert()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.ppm_refresh_procurement_receipt_status(new.procurement_item_id);
  return new;
end $$;
drop trigger if exists ppm_refresh_receipt_status_after_insert on public.ppm_procurement_receipts;
create trigger ppm_refresh_receipt_status_after_insert after insert on public.ppm_procurement_receipts
for each row execute function public.ppm_refresh_receipt_status_after_insert();