-- Execution add-on, Phase I: Procurement Actuals — "Enregistrer une reception" (spec section
-- 24). Recording a receipt is its own domain transaction (quantities ordered/delivered/
-- accepted/rejected, inspection) distinct from the generic stage-advance button already on
-- ppm_procurement_items (Sprint 13). Run after ppm-quality-checklist.sql.

create table if not exists public.ppm_procurement_receipts (
  id uuid primary key default gen_random_uuid(),
  procurement_item_id uuid not null references public.ppm_procurement_items(id) on delete cascade,
  supplier_name text,
  receipt_date date,
  site text,
  item_description text,
  quantity_ordered numeric(14,2),
  quantity_delivered numeric(14,2),
  quantity_accepted numeric(14,2),
  quantity_rejected numeric(14,2),
  rejection_reason text,
  quality_assessment text check(quality_assessment in ('conforme','non_conforme','partiellement_conforme')),
  inspection_notes text,
  delivery_note_number text,
  receipt_minutes_reference text,
  received_by_name text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.ppm_procurement_receipt_evidence (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.ppm_procurement_receipts(id) on delete cascade,
  title text not null,
  category text not null default 'photo' check(category in ('photo', 'delivery_note', 'receipt_minutes', 'other')),
  file_path text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ppm_procurement_receipts_item on public.ppm_procurement_receipts(procurement_item_id);
create index if not exists ppm_procurement_receipt_evidence_receipt on public.ppm_procurement_receipt_evidence(receipt_id);

alter table public.ppm_procurement_receipts enable row level security;
alter table public.ppm_procurement_receipt_evidence enable row level security;

drop policy if exists "PPM users read procurement receipts" on public.ppm_procurement_receipts;
create policy "PPM users read procurement receipts" on public.ppm_procurement_receipts for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM project members manage procurement receipts" on public.ppm_procurement_receipts;
create policy "PPM project members manage procurement receipts" on public.ppm_procurement_receipts for all to authenticated using(
  exists(select 1 from public.ppm_procurement_items p where p.id = procurement_item_id and public.ppm_project_access(p.project_id))
) with check(
  exists(select 1 from public.ppm_procurement_items p where p.id = procurement_item_id and public.ppm_project_access(p.project_id))
);

drop policy if exists "PPM users read receipt evidence" on public.ppm_procurement_receipt_evidence;
create policy "PPM users read receipt evidence" on public.ppm_procurement_receipt_evidence for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM project members manage receipt evidence" on public.ppm_procurement_receipt_evidence;
create policy "PPM project members manage receipt evidence" on public.ppm_procurement_receipt_evidence for all to authenticated using(
  exists(select 1 from public.ppm_procurement_receipts r join public.ppm_procurement_items p on p.id = r.procurement_item_id where r.id = receipt_id and public.ppm_project_access(p.project_id))
) with check(
  exists(select 1 from public.ppm_procurement_receipts r join public.ppm_procurement_items p on p.id = r.procurement_item_id where r.id = receipt_id and public.ppm_project_access(p.project_id))
);
