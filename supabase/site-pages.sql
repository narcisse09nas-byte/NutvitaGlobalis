create table if not exists public.site_pages (
  page_key text primary key,
  eyebrow text not null default '',
  title text not null default '',
  description text not null default '',
  sections jsonb not null default '[]'::jsonb,
  cta_label text,
  cta_url text,
  updated_at timestamptz not null default now()
);

alter table public.site_pages add column if not exists eyebrow_en text;
alter table public.site_pages add column if not exists title_en text;
alter table public.site_pages add column if not exists description_en text;
alter table public.site_pages add column if not exists sections_en jsonb not null default '[]'::jsonb;
alter table public.site_pages add column if not exists cta_label_en text;
alter table public.site_pages add column if not exists hero_image_url text;
alter table public.site_pages add column if not exists cta_image_url text;
alter table public.site_pages add column if not exists secondary_cta_label text;
alter table public.site_pages add column if not exists secondary_cta_label_en text;
alter table public.site_pages add column if not exists secondary_cta_url text;

alter table public.site_pages enable row level security;
drop policy if exists "Site pages public" on public.site_pages;
create policy "Site pages public" on public.site_pages for select to anon, authenticated using (true);
drop policy if exists "Admins manage site pages" on public.site_pages;
create policy "Admins manage site pages" on public.site_pages for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop trigger if exists set_updated_at on public.site_pages;
create trigger set_updated_at before update on public.site_pages for each row execute function public.set_updated_at();
