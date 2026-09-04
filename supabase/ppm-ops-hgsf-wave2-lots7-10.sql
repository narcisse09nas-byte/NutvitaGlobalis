-- HGSF V3 - Wave 2, lots 7-10. Additive/rerunnable.
-- Lot 7: deliveries are distinct from acceptance/reception.
create table if not exists public.ppm_ops_goods_receipts (
 id uuid primary key default gen_random_uuid(), business_id text unique not null,
 operation_id uuid not null references public.ppm_ops_operations(id) on delete cascade,
 delivery_note_id uuid not null references public.ppm_ops_delivery_notes(id_pk),
 site_id uuid not null references public.ppm_ops_sites(id), receipt_date date not null, receipt_place text,
 receipt_type text not null check(receipt_type in ('goods','services','works','consultancy','rental','training')),
 status text not null default 'draft' check(status in ('draft','submitted','partially_accepted','accepted','accepted_with_reservations','rejected','returned','posted_to_stock')),
 receiver_id uuid references auth.users(id) on delete set null, reservations text,
 created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.ppm_ops_goods_receipt_items (
 id uuid primary key default gen_random_uuid(), receipt_id uuid not null references public.ppm_ops_goods_receipts(id) on delete cascade,
 delivery_line_id uuid references public.ppm_ops_delivery_lines(id), product_id uuid references public.ppm_ops_products(id),
 ordered_quantity numeric(14,4) not null default 0, previously_received numeric(14,4) not null default 0,
 received_now numeric(14,4) not null default 0, accepted_quantity numeric(14,4) not null default 0,
 rejected_quantity numeric(14,4) not null default 0, remaining_quantity numeric(14,4) not null default 0,
 quality_status text check(quality_status in ('conforming','partially_conforming','non_conforming','not_applicable')),
 rejection_reason text, unique(receipt_id,delivery_line_id)
);
create table if not exists public.ppm_ops_receipt_acceptance_checks (
 id uuid primary key default gen_random_uuid(), receipt_item_id uuid not null references public.ppm_ops_goods_receipt_items(id) on delete cascade,
 criterion_code text not null, criterion_title text not null, specification text not null,
 result text not null check(result in ('conforming','non_conforming','not_checked')), comment text,
 unique(receipt_item_id,criterion_code)
);
create table if not exists public.ppm_ops_receipt_committee_members (
 receipt_id uuid not null references public.ppm_ops_goods_receipts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 decision text check(decision in ('pending','approved','rejected')), signed_at timestamptz, comment text,
 primary key(receipt_id,user_id)
);

-- Lot 8: invoice lines, three-way matching and partial payments.
create table if not exists public.ppm_ops_invoice_items (
 id uuid primary key default gen_random_uuid(), invoice_id text not null references public.ppm_ops_invoices(id) on delete cascade,
 product_id uuid references public.ppm_ops_products(id), description text,
 invoiced_quantity numeric(14,4) not null default 0, unit_price numeric(16,4) not null default 0,
 line_amount numeric(18,4) generated always as(invoiced_quantity*unit_price) stored,
 unique(invoice_id,product_id,description)
);
create table if not exists public.ppm_ops_three_way_matches (
 id uuid primary key default gen_random_uuid(), operation_id uuid not null references public.ppm_ops_operations(id) on delete cascade,
 purchase_order_id text not null references public.ppm_ops_purchase_orders(id), receipt_id uuid not null references public.ppm_ops_goods_receipts(id),
 invoice_id text not null references public.ppm_ops_invoices(id), ordered_amount numeric(18,4) not null,
 accepted_amount numeric(18,4) not null, invoiced_amount numeric(18,4) not null,
 variance_amount numeric(18,4) generated always as(invoiced_amount-least(ordered_amount,accepted_amount)) stored,
 result text not null check(result in ('matched','variance','blocked','exception_approved')),
 exception_reason text, exception_approved_by uuid references auth.users(id) on delete set null,
 checked_by uuid references auth.users(id) on delete set null, checked_at timestamptz not null default now(),
 unique(receipt_id,invoice_id)
);
create table if not exists public.ppm_ops_payment_transactions (
 id uuid primary key default gen_random_uuid(), business_id text unique not null,
 operation_id uuid not null references public.ppm_ops_operations(id) on delete cascade,
 invoice_id text not null references public.ppm_ops_invoices(id), amount numeric(18,4) not null check(amount>0), currency text not null,
 payment_date date not null, payment_method text not null check(payment_method in ('bank','cheque','mobile_money','cash','other')),
 transaction_reference text not null, status text not null default 'draft' check(status in ('draft','submitted','verified','approved','paid','reversed','rejected')),
 created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), unique(invoice_id,transaction_reference)
);

-- Lots 9-10: supervision, recommendations and central action tracker.
create table if not exists public.ppm_ops_supervision_visits (
 id uuid primary key default gen_random_uuid(), business_id text unique not null,
 operation_id uuid not null references public.ppm_ops_operations(id) on delete cascade,
 site_id uuid not null references public.ppm_ops_sites(id), supervisor_id uuid references auth.users(id) on delete set null,
 planned_date date, visit_date date, overall_score numeric(4,2) check(overall_score between 0 and 5),
 status text not null default 'planned' check(status in ('planned','in_progress','submitted','verified','validated','returned','cancelled')),
 summary text, created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.ppm_ops_supervision_observations (
 id uuid primary key default gen_random_uuid(), visit_id uuid not null references public.ppm_ops_supervision_visits(id) on delete cascade,
 domain text not null check(domain in ('delivery','storage','distribution','hygiene','meal_quantity','meal_quality','governance','other')),
 criterion text not null, score numeric(4,2) check(score between 0 and 5), finding text,
 severity text not null default 'minor' check(severity in ('minor','major','critical')), evidence_path text
);
create table if not exists public.ppm_ops_recommendations (
 id uuid primary key default gen_random_uuid(), business_id text unique not null,
 observation_id uuid not null references public.ppm_ops_supervision_observations(id) on delete cascade,
 recommendation text not null, responsible_user_id uuid references auth.users(id) on delete set null,
 due_date date, status text not null default 'open' check(status in ('open','accepted','converted_to_action','closed','rejected')),
 created_at timestamptz not null default now()
);
create table if not exists public.ppm_ops_corrective_actions (
 id uuid primary key default gen_random_uuid(), business_id text unique not null,
 operation_id uuid not null references public.ppm_ops_operations(id) on delete cascade,
 site_id uuid references public.ppm_ops_sites(id), recommendation_id uuid references public.ppm_ops_recommendations(id),
 source_type text not null check(source_type in ('supervision','variance','reception','stock','invoice','manual')),
 source_id text, title text not null, description text, responsible_user_id uuid references auth.users(id) on delete set null,
 due_date date, priority text not null default 'medium' check(priority in ('low','medium','high','critical')),
 status text not null default 'open' check(status in ('open','assigned','in_progress','completed','verified','closed','overdue','cancelled')),
 completion_evidence_path text, verified_by uuid references auth.users(id) on delete set null, verified_at timestamptz,
 created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists ppm_ops_actions_due_idx on public.ppm_ops_corrective_actions(operation_id,status,due_date);

alter table public.ppm_ops_goods_receipts enable row level security;
alter table public.ppm_ops_three_way_matches enable row level security;
alter table public.ppm_ops_payment_transactions enable row level security;
alter table public.ppm_ops_supervision_visits enable row level security;
alter table public.ppm_ops_corrective_actions enable row level security;
grant select,insert,update on public.ppm_ops_goods_receipts,public.ppm_ops_three_way_matches,public.ppm_ops_payment_transactions,public.ppm_ops_supervision_visits,public.ppm_ops_corrective_actions to authenticated;
revoke insert,update,delete,truncate,references,trigger on public.ppm_ops_goods_receipts,public.ppm_ops_goods_receipt_items,public.ppm_ops_receipt_acceptance_checks,public.ppm_ops_receipt_committee_members,public.ppm_ops_invoice_items,public.ppm_ops_three_way_matches,public.ppm_ops_payment_transactions,public.ppm_ops_supervision_visits,public.ppm_ops_supervision_observations,public.ppm_ops_recommendations,public.ppm_ops_corrective_actions from anon;
drop policy if exists hgsf_scoped_receipts on public.ppm_ops_goods_receipts;
create policy hgsf_scoped_receipts on public.ppm_ops_goods_receipts for all to authenticated using(public.ppm_ops_hgsf_access(operation_id,site_id)) with check(public.ppm_ops_hgsf_access(operation_id,site_id));
drop policy if exists hgsf_scoped_matches on public.ppm_ops_three_way_matches;
create policy hgsf_scoped_matches on public.ppm_ops_three_way_matches for all to authenticated using(public.ppm_ops_hgsf_access(operation_id,null)) with check(public.ppm_ops_hgsf_access(operation_id,null));
drop policy if exists hgsf_scoped_payments on public.ppm_ops_payment_transactions;
create policy hgsf_scoped_payments on public.ppm_ops_payment_transactions for all to authenticated using(public.ppm_ops_hgsf_access(operation_id,null)) with check(public.ppm_ops_hgsf_access(operation_id,null));
drop policy if exists hgsf_scoped_supervisions on public.ppm_ops_supervision_visits;
create policy hgsf_scoped_supervisions on public.ppm_ops_supervision_visits for all to authenticated using(public.ppm_ops_hgsf_access(operation_id,site_id)) with check(public.ppm_ops_hgsf_access(operation_id,site_id));
drop policy if exists hgsf_scoped_actions on public.ppm_ops_corrective_actions;
create policy hgsf_scoped_actions on public.ppm_ops_corrective_actions for all to authenticated using(public.ppm_ops_hgsf_access(operation_id,site_id)) with check(public.ppm_ops_hgsf_access(operation_id,site_id));
