-- Maximus internal management data store.
-- Run after accounts-growth-admin.sql.

create table if not exists public.maximus_records (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  title text not null,
  reference text,
  status text not null default 'draft'
    check(status in ('draft','submitted','validated','rejected','archived')),
  data jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists maximus_records_module_status
on public.maximus_records(module,status,created_at desc);

create index if not exists maximus_records_data
on public.maximus_records using gin(data);

alter table public.maximus_records enable row level security;

drop policy if exists "Super admins manage Maximus records" on public.maximus_records;
create policy "Super admins manage Maximus records"
on public.maximus_records for all to authenticated
using(public.is_super_admin())
with check(public.is_super_admin());

drop trigger if exists set_updated_at on public.maximus_records;
create trigger set_updated_at before update on public.maximus_records
for each row execute function public.set_updated_at();
