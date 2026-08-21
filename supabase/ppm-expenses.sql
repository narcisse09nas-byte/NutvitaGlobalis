-- Execution add-on, Phase D: Expenses + financial workflow (spec sections 12-19).
-- Commitments are not a separate table here: public.ppm_procurement_items.awarded_amount
-- (Sprint 13) already IS the commitment once a contract/PO is awarded — an expense can link to
-- it via procurement_item_id instead of duplicating that data (spec section 19: Procurement ->
-- Finance integration). Run after ppm-execution-validation.sql (reuses public.ppm_project_access).

create table if not exists public.ppm_expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  work_package_id uuid references public.ppm_wbs_nodes(id) on delete set null,
  activity_id uuid references public.ppm_activities(id) on delete set null,
  budget_line_id uuid references public.ppm_budget_lines(id) on delete set null,
  procurement_item_id uuid references public.ppm_procurement_items(id) on delete set null,
  code text,
  donor_name text,
  grant_reference text,
  cost_center text,
  expense_date date,
  category text check(category in (
    'personnel','consultants','travel','transport','accommodation','training','workshop',
    'supplies','equipment','communication','services','other'
  )),
  sub_category text,
  description text not null,
  justification text,
  payee_name text,
  location text,
  amount_excl_tax numeric(14,2) not null default 0,
  tax_amount numeric(14,2) default 0,
  amount_incl_tax numeric(14,2) not null default 0,
  transaction_currency text default 'XAF',
  project_currency text default 'XAF',
  exchange_rate numeric(14,6) default 1,
  converted_amount numeric(14,2),
  payment_method text check(payment_method in ('cash','bank_transfer','check','mobile_money','card','other')),
  payment_date date,
  transaction_reference text,
  invoice_number text,
  invoice_date date,
  po_reference text,
  contract_reference text,
  supplier_name text,
  status text not null default 'draft' check(status in (
    'draft','submitted','finance_review','manager_approval','posted','returned','rejected','cancelled'
  )),
  over_budget_justification text,
  submitted_at timestamptz,
  finance_reviewed_by_name text,
  finance_review_note text,
  finance_reviewed_at timestamptz,
  approved_by_name text,
  approval_note text,
  approved_at timestamptz,
  posted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ppm_expense_evidence (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.ppm_expenses(id) on delete cascade,
  title text not null,
  category text not null default 'invoice' check(category in (
    'invoice','purchase_order','contract','delivery_note','receipt_note','mission_order',
    'ticket','mission_report','liquidation','other'
  )),
  file_path text,
  description text,
  uploaded_by_name text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ppm_expenses_project on public.ppm_expenses(project_id,status);
create index if not exists ppm_expenses_budget_line on public.ppm_expenses(budget_line_id);
create index if not exists ppm_expense_evidence_expense on public.ppm_expense_evidence(expense_id);

alter table public.ppm_expenses enable row level security;
alter table public.ppm_expense_evidence enable row level security;

drop policy if exists "PPM users read expenses" on public.ppm_expenses;
create policy "PPM users read expenses" on public.ppm_expenses for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM project members manage expenses" on public.ppm_expenses;
create policy "PPM project members manage expenses" on public.ppm_expenses for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));

drop policy if exists "PPM users read expense evidence" on public.ppm_expense_evidence;
create policy "PPM users read expense evidence" on public.ppm_expense_evidence for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM project members manage expense evidence" on public.ppm_expense_evidence;
create policy "PPM project members manage expense evidence" on public.ppm_expense_evidence for all to authenticated using(
  exists(select 1 from public.ppm_expenses e where e.id = expense_id and public.ppm_project_access(e.project_id))
) with check(
  exists(select 1 from public.ppm_expenses e where e.id = expense_id and public.ppm_project_access(e.project_id))
);
