-- PPM expense allocation, project cost centres and project contracts.
-- Run after ppm-expenses.sql and the organization registries migrations.
-- Idempotent: safe to execute more than once.

alter table if exists public.ppm_budget_lines
  add column if not exists wbs_allocations jsonb not null default '[]'::jsonb,
  add column if not exists cost_center_id uuid;

alter table if exists public.ppm_expenses
  add column if not exists work_package_allocations jsonb not null default '[]'::jsonb,
  add column if not exists donor_id uuid,
  add column if not exists grant_id uuid,
  add column if not exists cost_center_id uuid,
  add column if not exists payee_type text,
  add column if not exists payee_id uuid,
  add column if not exists payment_account_reference text,
  add column if not exists contract_id uuid;

create table if not exists public.ppm_project_finance_settings (
  project_id uuid primary key references public.ppm_projects(id) on delete cascade,
  cost_centers_enabled boolean not null default false,
  cost_center_required boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.ppm_cost_centers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  code text not null,
  label text not null,
  responsible_name text,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  is_default boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, code)
);

create table if not exists public.ppm_project_contracts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  contract_number text not null,
  title text,
  party_type text not null check (party_type in ('supplier','staff','other')),
  party_id uuid,
  party_name text not null,
  start_date date,
  end_date date,
  amount numeric(14,2),
  currency text default 'XAF',
  status text not null default 'active' check (status in ('draft','active','expired','terminated','archived')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, contract_number)
);

do $$ begin
  alter table public.ppm_budget_lines add constraint ppm_budget_lines_cost_center_fk
    foreign key (cost_center_id) references public.ppm_cost_centers(id) on delete set null;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.ppm_expenses add constraint ppm_expenses_cost_center_fk
    foreign key (cost_center_id) references public.ppm_cost_centers(id) on delete set null;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.ppm_expenses add constraint ppm_expenses_contract_fk
    foreign key (contract_id) references public.ppm_project_contracts(id) on delete set null;
exception when duplicate_object then null; end $$;

create unique index if not exists ppm_cost_centers_one_default
  on public.ppm_cost_centers(project_id) where is_default and status <> 'archived';
create index if not exists ppm_cost_centers_project on public.ppm_cost_centers(project_id,status);
create index if not exists ppm_project_contracts_project on public.ppm_project_contracts(project_id,status);
create index if not exists ppm_project_contracts_party on public.ppm_project_contracts(project_id,party_type,party_id);

alter table public.ppm_project_finance_settings enable row level security;
alter table public.ppm_cost_centers enable row level security;
alter table public.ppm_project_contracts enable row level security;

drop policy if exists "PPM users read project finance settings" on public.ppm_project_finance_settings;
create policy "PPM users read project finance settings" on public.ppm_project_finance_settings
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage project finance settings" on public.ppm_project_finance_settings;
create policy "PPM managers manage project finance settings" on public.ppm_project_finance_settings
  for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));

drop policy if exists "PPM users read cost centers" on public.ppm_cost_centers;
create policy "PPM users read cost centers" on public.ppm_cost_centers
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage cost centers" on public.ppm_cost_centers;
create policy "PPM managers manage cost centers" on public.ppm_cost_centers
  for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));

drop policy if exists "PPM users read project contracts" on public.ppm_project_contracts;
create policy "PPM users read project contracts" on public.ppm_project_contracts
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage project contracts" on public.ppm_project_contracts;
create policy "PPM managers manage project contracts" on public.ppm_project_contracts
  for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));

create or replace function public.ppm_prevent_used_cost_center_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists(select 1 from public.ppm_budget_lines where cost_center_id = old.id)
     or exists(select 1 from public.ppm_expenses where cost_center_id = old.id) then
    raise exception 'A used cost center cannot be deleted; archive it instead.';
  end if;
  return old;
end $$;

drop trigger if exists ppm_cost_center_prevent_used_delete on public.ppm_cost_centers;
create trigger ppm_cost_center_prevent_used_delete
before delete on public.ppm_cost_centers
for each row execute function public.ppm_prevent_used_cost_center_delete();
