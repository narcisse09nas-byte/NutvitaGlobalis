-- PPM Procurement and Receiving upgrade.
-- Run after ppm-procurement-receipts.sql and ppm-expense-cost-centers-contracts.sql.
-- Idempotent and compatible with existing procurement and receipt rows.

alter table if exists public.ppm_procurement_items
  add column if not exists supplier_id uuid,
  add column if not exists contract_id uuid,
  add column if not exists cost_center_id uuid,
  add column if not exists acceptance_criteria jsonb not null default '[]'::jsonb,
  add column if not exists ordered_items jsonb not null default '[]'::jsonb,
  add column if not exists receipt_status text not null default 'pending_delivery';

do $$ begin
  alter table public.ppm_procurement_items add constraint ppm_procurement_cost_center_fk
    foreign key (cost_center_id) references public.ppm_cost_centers(id) on delete set null;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.ppm_procurement_items add constraint ppm_procurement_contract_fk
    foreign key (contract_id) references public.ppm_project_contracts(id) on delete set null;
exception when duplicate_object then null; end $$;

alter table if exists public.ppm_procurement_receipts
  add column if not exists project_id uuid,
  add column if not exists receipt_number text,
  add column if not exists receipt_type text,
  add column if not exists status text not null default 'pending_delivery',
  add column if not exists previous_quantity numeric(14,2) not null default 0,
  add column if not exists current_quantity numeric(14,2) not null default 0,
  add column if not exists remaining_quantity numeric(14,2) not null default 0,
  add column if not exists anomalies text,
  add column if not exists evidence_requirement text,
  add column if not exists create_asset boolean not null default false,
  add column if not exists asset_resource_id uuid,
  add column if not exists validated_at timestamptz;

update public.ppm_procurement_receipts r
set project_id = p.project_id
from public.ppm_procurement_items p
where r.procurement_item_id = p.id and r.project_id is null;

do $$ begin
  alter table public.ppm_procurement_receipts alter column project_id set not null;
exception when others then null; end $$;
do $$ begin
  alter table public.ppm_procurement_receipts add constraint ppm_receipts_project_fk
    foreign key (project_id) references public.ppm_projects(id) on delete cascade;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.ppm_procurement_receipts add constraint ppm_receipts_asset_fk
    foreign key (asset_resource_id) references public.ppm_resources(id) on delete set null;
exception when duplicate_object then null; end $$;

create unique index if not exists ppm_receipt_number_unique on public.ppm_procurement_receipts(project_id,receipt_number) where receipt_number is not null;
create index if not exists ppm_receipts_project_status on public.ppm_procurement_receipts(project_id,status);

create table if not exists public.ppm_procurement_receipt_lines (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.ppm_procurement_receipts(id) on delete cascade,
  item_code text not null,
  title text not null,
  specification text,
  quantity_ordered numeric(14,2) not null default 0,
  quantity_previous numeric(14,2) not null default 0,
  quantity_received numeric(14,2) not null default 0,
  quantity_remaining numeric(14,2) not null default 0,
  quality_condition text,
  accepted boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.ppm_procurement_receipt_criteria (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.ppm_procurement_receipts(id) on delete cascade,
  criterion_code text not null,
  title text not null,
  specification text,
  result text not null default 'pending' check(result in ('pending','compliant','non_compliant','not_applicable')),
  observation text,
  created_at timestamptz not null default now()
);

create table if not exists public.ppm_receipt_committee_members (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.ppm_procurement_receipts(id) on delete cascade,
  resource_id uuid references public.ppm_resources(id) on delete set null,
  member_name text not null,
  member_email text,
  decision text not null default 'pending' check(decision in ('pending','approved','rejected')),
  decision_note text,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(receipt_id,member_name)
);

alter table if exists public.ppm_procurement_receipt_evidence
  drop constraint if exists ppm_procurement_receipt_evidence_category_check;
alter table if exists public.ppm_procurement_receipt_evidence
  add column if not exists description text;
do $$ begin
  alter table public.ppm_procurement_receipt_evidence add constraint ppm_procurement_receipt_evidence_category_check
    check(category in ('photo','delivery_note','receipt_minutes','report','invoice','service_certificate','validated_deliverable','attendance_list','utilization_sheet','other'));
exception when duplicate_object then null; end $$;

alter table if exists public.ppm_expenses
  add column if not exists payment_override_requested boolean not null default false,
  add column if not exists payment_override_reason text,
  add column if not exists payment_override_approved boolean not null default false,
  add column if not exists payment_override_approved_by text,
  add column if not exists payment_override_approved_at timestamptz;

alter table public.ppm_procurement_receipt_lines enable row level security;
alter table public.ppm_procurement_receipt_criteria enable row level security;
alter table public.ppm_receipt_committee_members enable row level security;

drop policy if exists "PPM users read receipt lines" on public.ppm_procurement_receipt_lines;
create policy "PPM users read receipt lines" on public.ppm_procurement_receipt_lines for select to authenticated using(
  exists(select 1 from public.ppm_procurement_receipts r where r.id=receipt_id and public.ppm_project_access(r.project_id))
);
drop policy if exists "PPM members manage receipt lines" on public.ppm_procurement_receipt_lines;
create policy "PPM members manage receipt lines" on public.ppm_procurement_receipt_lines for all to authenticated using(
  exists(select 1 from public.ppm_procurement_receipts r where r.id=receipt_id and public.ppm_project_access(r.project_id))
) with check(exists(select 1 from public.ppm_procurement_receipts r where r.id=receipt_id and public.ppm_project_access(r.project_id)));

drop policy if exists "PPM users read receipt criteria" on public.ppm_procurement_receipt_criteria;
create policy "PPM users read receipt criteria" on public.ppm_procurement_receipt_criteria for select to authenticated using(
  exists(select 1 from public.ppm_procurement_receipts r where r.id=receipt_id and public.ppm_project_access(r.project_id))
);
drop policy if exists "PPM members manage receipt criteria" on public.ppm_procurement_receipt_criteria;
create policy "PPM members manage receipt criteria" on public.ppm_procurement_receipt_criteria for all to authenticated using(
  exists(select 1 from public.ppm_procurement_receipts r where r.id=receipt_id and public.ppm_project_access(r.project_id))
) with check(exists(select 1 from public.ppm_procurement_receipts r where r.id=receipt_id and public.ppm_project_access(r.project_id)));

drop policy if exists "PPM users read receipt committee" on public.ppm_receipt_committee_members;
create policy "PPM users read receipt committee" on public.ppm_receipt_committee_members for select to authenticated using(
  exists(select 1 from public.ppm_procurement_receipts r where r.id=receipt_id and public.ppm_project_access(r.project_id))
);
drop policy if exists "PPM members manage receipt committee" on public.ppm_receipt_committee_members;
create policy "PPM members manage receipt committee" on public.ppm_receipt_committee_members for all to authenticated using(
  exists(select 1 from public.ppm_procurement_receipts r where r.id=receipt_id and public.ppm_project_access(r.project_id))
) with check(exists(select 1 from public.ppm_procurement_receipts r where r.id=receipt_id and public.ppm_project_access(r.project_id)));

create or replace function public.ppm_refresh_procurement_receipt_status(p_procurement_item_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_status text;
begin
  select case
    when bool_or(status='returned_to_supplier') then 'returned_to_supplier'
    when bool_or(status='rejected') then 'rejected'
    when bool_or(status='received_with_reservations') then 'received_with_reservations'
    when bool_or(status='complete') then 'complete'
    when bool_or(status='partial') then 'partial'
    else 'pending_delivery' end
  into v_status from public.ppm_procurement_receipts where procurement_item_id=p_procurement_item_id;
  update public.ppm_procurement_items set receipt_status=coalesce(v_status,'pending_delivery'),
    received_date=(select max(receipt_date) from public.ppm_procurement_receipts where procurement_item_id=p_procurement_item_id)
  where id=p_procurement_item_id;
end $$;
