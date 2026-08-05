create table if not exists public.client_service_catalog_settings(
 id integer primary key default 1 check(id=1), heading text not null default '', heading_en text not null default '',
 intro text not null default '', intro_en text not null default '', cards jsonb not null default '[]'::jsonb,
 footer_title text not null default '', footer_title_en text not null default '', footer_text text not null default '', footer_text_en text not null default '',
 updated_at timestamptz not null default now()
);
alter table public.client_service_catalog_settings enable row level security;
drop policy if exists "Public reads service catalog" on public.client_service_catalog_settings;
drop policy if exists "Admins manage service catalog" on public.client_service_catalog_settings;
create policy "Public reads service catalog" on public.client_service_catalog_settings for select using(true);
create policy "Admins manage service catalog" on public.client_service_catalog_settings for all to authenticated using(public.is_admin()) with check(public.is_admin());
insert into public.client_service_catalog_settings(id) values(1) on conflict(id) do nothing;
