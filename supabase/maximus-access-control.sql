-- Maximus delegated access control.
-- Run after accounts-growth-admin.sql, maximus-internal-management.sql,
-- maximus-recruitment.sql and partner-collaboration.sql.

create table if not exists public.maximus_user_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null default 'staff' check(role in ('staff','manager')),
  unit text not null check(unit in (
    'logistics','hr','finance','production','sales','assets_fleet',
    'communications','operations','executive'
  )),
  units text[] not null default '{}'::text[],
  module_access text[] not null default '{}'::text[],
  is_assistant_admin boolean not null default false,
  is_supervisor boolean not null default false,
  functions text[] not null default array['viewer']::text[],
  central_kitchen text,
  sale_point text,
  active boolean not null default true,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(functions <@ array['viewer','editor','creator','validator']::text[])
);

alter table public.maximus_user_access add column if not exists units text[] not null default '{}'::text[];
alter table public.maximus_user_access add column if not exists module_access text[] not null default '{}'::text[];
update public.maximus_user_access
set units=array[unit]::text[]
where cardinality(units)=0;
alter table public.maximus_user_access drop constraint if exists maximus_user_access_units_check;
alter table public.maximus_user_access add constraint maximus_user_access_units_check check(
  units <@ array[
    'logistics','hr','finance','production','sales','assets_fleet',
    'communications','operations','executive'
  ]::text[]
  and cardinality(units)>0
);

create index if not exists maximus_user_access_unit on public.maximus_user_access(unit,active);

drop trigger if exists set_updated_at on public.maximus_user_access;
create trigger set_updated_at before update on public.maximus_user_access
for each row execute function public.set_updated_at();

create or replace function public.maximus_module_unit(p_module text)
returns text language sql immutable as $$
  select case
    when p_module like 'finance/%' then 'finance'
    when p_module like 'hr/%' then 'hr'
    when p_module like 'production/%' or p_module='menus' or p_module='nutrition-analysis' then 'production'
    when p_module like 'sales/%' then 'sales'
    when p_module like 'assets/%' or p_module like 'fleet/%' then 'assets_fleet'
    when p_module like 'communications/%' then 'communications'
    when p_module like 'supply/%' or p_module like 'partnerships/%' then 'logistics'
    when p_module like 'administration/%' then 'executive'
    else 'operations'
  end
$$;

create or replace function public.maximus_has_access(p_module text, p_function text default 'viewer')
returns boolean language sql stable security definer set search_path=public as $$
  select public.is_super_admin() or exists(
    select 1 from public.maximus_user_access access
    where access.user_id=(select auth.uid())
      and access.active=true
      and (
        p_module=any(access.module_access)
        or public.maximus_module_unit(p_module)=any(access.units)
        or 'operations'=any(access.units)
          and public.maximus_module_unit(p_module) in ('logistics','production','sales','assets_fleet')
      )
      and (
        p_function=any(access.functions)
        or access.is_assistant_admin=true
      )
  )
$$;

alter table public.maximus_user_access enable row level security;
drop policy if exists "Maximus users read own access" on public.maximus_user_access;
create policy "Maximus users read own access" on public.maximus_user_access
for select to authenticated using(user_id=(select auth.uid()) or public.is_super_admin());
drop policy if exists "Super admins manage Maximus access" on public.maximus_user_access;
create policy "Super admins manage Maximus access" on public.maximus_user_access
for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());

drop policy if exists "Super admins manage Maximus records" on public.maximus_records;
drop policy if exists "Delegated users read Maximus records" on public.maximus_records;
create policy "Delegated users read Maximus records" on public.maximus_records
for select to authenticated using(public.maximus_has_access(module,'viewer'));
drop policy if exists "Delegated users create Maximus records" on public.maximus_records;
create policy "Delegated users create Maximus records" on public.maximus_records
for insert to authenticated with check(public.maximus_has_access(module,'creator'));
drop policy if exists "Delegated users update Maximus records" on public.maximus_records;
create policy "Delegated users update Maximus records" on public.maximus_records
for update to authenticated using(
  public.maximus_has_access(module,'editor') or public.maximus_has_access(module,'validator')
)
with check(
  public.maximus_has_access(module,'editor') or public.maximus_has_access(module,'validator')
);
drop policy if exists "Delegated users delete Maximus records" on public.maximus_records;
create policy "Delegated users delete Maximus records" on public.maximus_records
for delete to authenticated using(public.maximus_has_access(module,'validator'));

-- Operational tables remain protected by their owning business unit.
drop policy if exists "Super admins manage Maximus stock ledger" on public.maximus_stock_ledger;
drop policy if exists "Delegated logistics manage Maximus stock ledger" on public.maximus_stock_ledger;
create policy "Delegated logistics manage Maximus stock ledger" on public.maximus_stock_ledger
for all to authenticated using(public.maximus_has_access('supply/central-stock','editor'))
with check(public.maximus_has_access('supply/central-stock','editor'));

drop policy if exists "Super admins manage Maximus accounting" on public.maximus_accounting_entries;
drop policy if exists "Delegated finance manage Maximus accounting" on public.maximus_accounting_entries;
create policy "Delegated finance manage Maximus accounting" on public.maximus_accounting_entries
for all to authenticated using(public.maximus_has_access('finance/dashboard','editor'))
with check(public.maximus_has_access('finance/dashboard','editor'));

drop policy if exists "Super admins manage Maximus workflow events" on public.maximus_workflow_events;
drop policy if exists "Delegated users read Maximus workflow events" on public.maximus_workflow_events;
create policy "Delegated users read Maximus workflow events" on public.maximus_workflow_events
for select to authenticated using(public.maximus_has_access(source_module,'viewer'));
drop policy if exists "Delegated validators create Maximus workflow events" on public.maximus_workflow_events;
create policy "Delegated validators create Maximus workflow events" on public.maximus_workflow_events
for insert to authenticated with check(public.maximus_has_access(source_module,'validator'));

-- Recruitment managers can use the Staff recruitment domain without receiving
-- access to finance, stock or other Maximus units.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'maximus_job_offers','maximus_staff_applications','maximus_candidate_notifications',
    'maximus_written_tests','maximus_test_questions','maximus_test_assignments',
    'maximus_test_reviews','maximus_proctoring_events','maximus_recruitment_interviews',
    'maximus_interview_panel','maximus_interview_evaluations','maximus_employment_proposals',
    'maximus_recruitment_events','maximus_recruitment_audit_reports'
  ] loop
    execute format('drop policy if exists %I on public.%I', 'Delegated HR read ' || table_name, table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using(public.maximus_has_access(''hr/recruitment'',''viewer''))',
      'Delegated HR read ' || table_name,
      table_name
    );
    execute format('drop policy if exists %I on public.%I', 'Delegated HR manage ' || table_name, table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using(public.maximus_has_access(''hr/recruitment'',''editor'') or public.maximus_has_access(''hr/recruitment'',''creator'') or public.maximus_has_access(''hr/recruitment'',''validator'')) with check(public.maximus_has_access(''hr/recruitment'',''editor'') or public.maximus_has_access(''hr/recruitment'',''creator'') or public.maximus_has_access(''hr/recruitment'',''validator''))',
      'Delegated HR manage ' || table_name,
      table_name
    );
  end loop;
end $$;

-- Vendor sourcing belongs to Logistics and remains distinct from staff hiring.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'maximus_vendor_calls','maximus_vendor_applications','maximus_vendor_site_visits'
  ] loop
    execute format('drop policy if exists %I on public.%I', 'Delegated logistics read ' || table_name, table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using(public.maximus_has_access(''partnerships/vendor-recruitment'',''viewer''))',
      'Delegated logistics read ' || table_name,
      table_name
    );
    execute format('drop policy if exists %I on public.%I', 'Delegated logistics manage ' || table_name, table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using(public.maximus_has_access(''partnerships/vendor-recruitment'',''editor'') or public.maximus_has_access(''partnerships/vendor-recruitment'',''creator'') or public.maximus_has_access(''partnerships/vendor-recruitment'',''validator'')) with check(public.maximus_has_access(''partnerships/vendor-recruitment'',''editor'') or public.maximus_has_access(''partnerships/vendor-recruitment'',''creator'') or public.maximus_has_access(''partnerships/vendor-recruitment'',''validator''))',
      'Delegated logistics manage ' || table_name,
      table_name
    );
  end loop;
end $$;
