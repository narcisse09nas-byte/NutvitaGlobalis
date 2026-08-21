-- Sprint 13: Procurement management. Sprint 14: Quality management.
-- Run after ppm-budget-resources.sql (reuses public.ppm_project_access).

-- Besoin -> Request -> Package -> Lot -> RFQ/RFP/Tender -> Offers -> Evaluation -> Award ->
-- Contract/PO -> Delivery -> Receipt -> Invoice -> Payment (spec section 17) is modelled as
-- one row per procurement item moving through `stage`, consistent with the "kind + status
-- pipeline" pattern already used for activities and change requests.
create table if not exists public.ppm_procurement_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  work_package_id uuid references public.ppm_wbs_nodes(id) on delete set null,
  activity_id uuid references public.ppm_activities(id) on delete set null,
  budget_line_id uuid references public.ppm_budget_lines(id) on delete set null,
  title text not null,
  description text,
  category text not null default 'goods' check(category in ('goods','works','services','consultancy')),
  procurement_method text not null default 'rfq' check(procurement_method in ('direct','rfq','rfp','tender')),
  estimated_value numeric(14,2),
  currency text default 'XAF',
  stage text not null default 'need' check(stage in (
    'need','request','package','solicitation','evaluation','award','contract',
    'delivery','receipt','invoice','payment','completed','cancelled'
  )),
  requested_by_name text,
  supplier_name text,
  contract_reference text,
  po_reference text,
  awarded_amount numeric(14,2),
  delivery_date date,
  received_date date,
  invoice_reference text,
  payment_status text default 'not_invoiced' check(payment_status in ('not_invoiced','invoiced','partially_paid','paid')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Quality Requirement doubles as the Control result once assessed (spec section 18):
-- draft/planned -> conforme (accept) or non_conforme (spawns an NCR below).
create table if not exists public.ppm_quality_requirements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  work_package_id uuid references public.ppm_wbs_nodes(id) on delete set null,
  activity_id uuid references public.ppm_activities(id) on delete set null,
  title text not null,
  standard_reference text,
  description text,
  control_method text,
  frequency text,
  responsible_name text,
  control_date date,
  result text not null default 'pending' check(result in ('pending','conforme','non_conforme')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ppm_ncr (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  quality_requirement_id uuid references public.ppm_quality_requirements(id) on delete set null,
  title text not null,
  description text,
  root_cause text,
  capa_action text,
  capa_responsible text,
  capa_deadline date,
  effectiveness_review text,
  status text not null default 'open' check(status in (
    'open','root_cause_identified','capa_planned','capa_implemented','effectiveness_reviewed','closed'
  )),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ppm_procurement_items_project on public.ppm_procurement_items(project_id,stage);
create index if not exists ppm_quality_requirements_project on public.ppm_quality_requirements(project_id);
create index if not exists ppm_ncr_project on public.ppm_ncr(project_id,status);

alter table public.ppm_procurement_items enable row level security;
alter table public.ppm_quality_requirements enable row level security;
alter table public.ppm_ncr enable row level security;

drop policy if exists "PPM users read procurement items" on public.ppm_procurement_items;
create policy "PPM users read procurement items" on public.ppm_procurement_items for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage procurement items" on public.ppm_procurement_items;
create policy "PPM managers manage procurement items" on public.ppm_procurement_items for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));

drop policy if exists "PPM users read quality requirements" on public.ppm_quality_requirements;
create policy "PPM users read quality requirements" on public.ppm_quality_requirements for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage quality requirements" on public.ppm_quality_requirements;
create policy "PPM managers manage quality requirements" on public.ppm_quality_requirements for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));

drop policy if exists "PPM users read ncr" on public.ppm_ncr;
create policy "PPM users read ncr" on public.ppm_ncr for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage ncr" on public.ppm_ncr;
create policy "PPM managers manage ncr" on public.ppm_ncr for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));
