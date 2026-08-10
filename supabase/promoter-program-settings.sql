create table if not exists public.promoter_program_settings (
  id integer primary key default 1 check (id = 1),
  commission_rate numeric(5,2) not null default 3 check (commission_rate between 0 and 100),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
insert into public.promoter_program_settings(id, commission_rate) values (1, 3) on conflict(id) do nothing;
alter table public.promoter_program_settings enable row level security;
drop policy if exists "Admins manage promoter settings" on public.promoter_program_settings;
create policy "Admins manage promoter settings" on public.promoter_program_settings for all to authenticated using(public.is_admin()) with check(public.is_admin());