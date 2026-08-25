-- Operations Management (Wave 8): Reconciliation et fermeture — invoice payment tracking,
-- automatic reconciliation views (products, value, cooperative payment, dates), a lightweight
-- manual variance-notes table, and the donor-synthesis export audit record.
-- Run after ppm-ops-external-portal.sql.

create table if not exists public.ppm_ops_invoice_payment_tracking (
  invoice_id text primary key references public.ppm_ops_invoices(id) on delete cascade,
  cooperative_submitted_at timestamptz,
  submitted_for_payment_at timestamptz,
  paid_to_school_at timestamptz,
  paid_to_cooperative_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.ppm_ops_reconciliation_notes (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.ppm_ops_operations(id) on delete cascade,
  category text not null check(category in ('products','value','cooperative_payment','dates')),
  site_id uuid references public.ppm_ops_sites(id),
  reference_id text,
  note text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.ppm_ops_donor_synthesis_exports (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.ppm_ops_operations(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  prepared_by_name text,
  approved_by_name text,
  file_path text,
  generated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists ppm_ops_reconciliation_notes_operation on public.ppm_ops_reconciliation_notes(operation_id, category);
create index if not exists ppm_ops_donor_synthesis_exports_operation on public.ppm_ops_donor_synthesis_exports(operation_id);

alter table public.ppm_ops_invoice_payment_tracking enable row level security;
alter table public.ppm_ops_reconciliation_notes enable row level security;
alter table public.ppm_ops_donor_synthesis_exports enable row level security;

drop policy if exists "PPM users read ops invoice payment tracking" on public.ppm_ops_invoice_payment_tracking;
create policy "PPM users read ops invoice payment tracking" on public.ppm_ops_invoice_payment_tracking
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage ops invoice payment tracking" on public.ppm_ops_invoice_payment_tracking;
create policy "PPM managers manage ops invoice payment tracking" on public.ppm_ops_invoice_payment_tracking for all to authenticated
  using(exists(select 1 from public.ppm_ops_invoices i join public.ppm_ops_sites s on s.id = i.site_id where i.id = invoice_id and public.ppm_ops_access(s.operation_id)))
  with check(exists(select 1 from public.ppm_ops_invoices i join public.ppm_ops_sites s on s.id = i.site_id where i.id = invoice_id and public.ppm_ops_access(s.operation_id)));

drop policy if exists "PPM users read ops reconciliation notes" on public.ppm_ops_reconciliation_notes;
create policy "PPM users read ops reconciliation notes" on public.ppm_ops_reconciliation_notes
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage ops reconciliation notes" on public.ppm_ops_reconciliation_notes;
create policy "PPM managers manage ops reconciliation notes" on public.ppm_ops_reconciliation_notes
  for all to authenticated using(public.ppm_ops_access(operation_id)) with check(public.ppm_ops_access(operation_id));

drop policy if exists "PPM users read ops donor synthesis exports" on public.ppm_ops_donor_synthesis_exports;
create policy "PPM users read ops donor synthesis exports" on public.ppm_ops_donor_synthesis_exports
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage ops donor synthesis exports" on public.ppm_ops_donor_synthesis_exports;
create policy "PPM managers manage ops donor synthesis exports" on public.ppm_ops_donor_synthesis_exports
  for all to authenticated using(public.ppm_ops_access(operation_id)) with check(public.ppm_ops_access(operation_id));

-- Reconciliation views — computed automatically from already-entered data (per the user's choice
-- of "calcul automatique + notes d'ecart" over full manual reconciliation-entry forms).
-- security_invoker=true so the querying user's own RLS on the underlying tables applies, matching
-- the convention in supabase/advanced-admin-security.sql and supabase/maximus-internal-management.sql.

-- 1) Received vs distributed products, per activity report line.
create or replace view public.ppm_ops_reconciliation_products_v with (security_invoker=true) as
select
  r.id as report_id,
  r.id_pk as report_id_pk,
  s.operation_id,
  r.site_id,
  s.name as site_name,
  rp.product_id,
  pr.name as product_name,
  r.period_start,
  r.period_end,
  rp.start_qty,
  rp.received_qty,
  rp.distributed_qty,
  rp.damaged_qty,
  rp.returned_qty,
  rp.remaining_qty,
  (coalesce(rp.start_qty, 0) + coalesce(rp.received_qty, 0)) as total_available,
  (coalesce(rp.distributed_qty, 0) + coalesce(rp.damaged_qty, 0) + coalesce(rp.returned_qty, 0) + coalesce(rp.remaining_qty, 0)) as total_accounted,
  (coalesce(rp.start_qty, 0) + coalesce(rp.received_qty, 0)) - (coalesce(rp.distributed_qty, 0) + coalesce(rp.damaged_qty, 0) + coalesce(rp.returned_qty, 0) + coalesce(rp.remaining_qty, 0)) as variance
from public.ppm_ops_activity_report_products rp
join public.ppm_ops_activity_reports r on r.id_pk = rp.report_id
join public.ppm_ops_sites s on s.id = r.site_id
join public.ppm_ops_products pr on pr.id = rp.product_id;

-- 2) Distributed value (from the activity report) vs invoiced/paid-to-school amount.
create or replace view public.ppm_ops_reconciliation_value_v with (security_invoker=true) as
select
  r.id as report_id,
  r.id_pk as report_id_pk,
  s.operation_id,
  r.site_id,
  s.name as site_name,
  r.amount_distributed_figures,
  r.amount_distributed_currency,
  i.id as invoice_id,
  i.amount_figures as invoice_amount,
  i.currency as invoice_currency,
  i.status as invoice_status,
  pt.paid_to_school_at,
  (coalesce(r.amount_distributed_figures, 0) - coalesce(i.amount_figures, 0)) as variance_distributed_vs_invoiced,
  (pt.paid_to_school_at is not null) as is_paid_to_school
from public.ppm_ops_activity_reports r
join public.ppm_ops_sites s on s.id = r.site_id
left join public.ppm_ops_invoices i on i.delivery_note_id = r.delivery_note_id
left join public.ppm_ops_invoice_payment_tracking pt on pt.invoice_id = i.id;

-- 3) Paid-to-school vs paid-to-cooperative (SF/HGSF only — the cooperative-payment leg).
create or replace view public.ppm_ops_reconciliation_cooperative_v with (security_invoker=true) as
select
  i.id as invoice_id,
  i.site_id,
  s.operation_id,
  s.name as site_name,
  i.cooperative_id,
  c.name as cooperative_name,
  i.amount_figures,
  i.currency,
  i.status,
  pt.paid_to_school_at,
  pt.paid_to_cooperative_at,
  (pt.paid_to_school_at is not null and pt.paid_to_cooperative_at is null) as pending_cooperative_payment,
  (pt.paid_to_cooperative_at is not null and pt.paid_to_school_at is null) as anomaly_paid_cooperative_before_school
from public.ppm_ops_invoices i
join public.ppm_ops_sites s on s.id = i.site_id
left join public.ppm_ops_cooperatives c on c.id = i.cooperative_id
left join public.ppm_ops_invoice_payment_tracking pt on pt.invoice_id = i.id
where i.is_sf_hgsf = true;

-- 4) Planned vs actual dates/ration-days — resolves the plan a report reported against via its
-- delivery note's need_id/po_id (each of which carries its own plan_id), then compares against
-- that plan's site line.
create or replace view public.ppm_ops_reconciliation_dates_v with (security_invoker=true) as
select
  r.id as report_id,
  r.id_pk as report_id_pk,
  s.operation_id,
  r.site_id,
  s.name as site_name,
  ps.period_start as planned_period_start,
  ps.period_end as planned_period_end,
  ps.distribution_start as planned_distribution_start,
  ps.distribution_end as planned_distribution_end,
  ps.ration_days as planned_ration_days,
  r.effective_distribution_start,
  r.effective_distribution_end,
  r.ration_days_provided,
  (coalesce(ps.ration_days, 0) - coalesce(r.ration_days_provided, 0)) as ration_days_variance,
  (r.effective_distribution_start is distinct from ps.distribution_start) as start_date_shifted,
  (r.effective_distribution_end is distinct from ps.distribution_end) as end_date_shifted
from public.ppm_ops_activity_reports r
join public.ppm_ops_sites s on s.id = r.site_id
left join public.ppm_ops_delivery_notes d on d.id_pk = r.delivery_note_id
left join public.ppm_ops_needs n on n.id = d.need_id
left join public.ppm_ops_purchase_orders po on po.id = d.po_id
left join public.ppm_ops_distribution_plan_sites ps on ps.site_id = r.site_id and ps.plan_id = coalesce(n.plan_id, po.plan_id);
