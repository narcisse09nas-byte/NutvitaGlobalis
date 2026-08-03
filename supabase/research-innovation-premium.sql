-- Premium Research, Innovation & Strategic Consulting page.
-- Run after schema.sql, multilingual-fr-en.sql and advanced-admin-security.sql.
create table if not exists public.research_innovation_settings (
  id integer primary key default 1 check (id = 1),
  hero_badge text not null default '', hero_badge_en text not null default '',
  hero_title text not null default '', hero_title_en text not null default '',
  hero_subtitle text not null default '', hero_subtitle_en text not null default '',
  hero_media_url text not null default '', hero_media_type text not null default 'image' check(hero_media_type in ('image','video')),
  primary_cta_label text not null default '', primary_cta_label_en text not null default '', primary_cta_url text not null default '/contact',
  secondary_cta_label text not null default '', secondary_cta_label_en text not null default '', secondary_cta_url text not null default '#expertises',
  stats jsonb not null default '[]', expertises jsonb not null default '[]', service_groups jsonb not null default '[]', reasons jsonb not null default '[]', methodology jsonb not null default '[]', sectors jsonb not null default '[]', technologies jsonb not null default '[]', projects jsonb not null default '[]', testimonials jsonb not null default '[]', faq jsonb not null default '[]',
  final_title text not null default '', final_title_en text not null default '', final_text text not null default '', final_text_en text not null default '',
  final_primary_label text not null default '', final_primary_label_en text not null default '', final_primary_url text not null default '/contact',
  final_secondary_label text not null default '', final_secondary_label_en text not null default '', final_secondary_url text not null default '/contact?objet=reunion',
  seo_title text not null default '', seo_title_en text not null default '', seo_description text not null default '', seo_description_en text not null default '', og_image_url text not null default '', twitter_card text not null default 'summary_large_image', schema_json_ld jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.research_innovation_settings enable row level security;
drop policy if exists "Public reads research innovation settings" on public.research_innovation_settings;
drop policy if exists "Admins manage research innovation settings" on public.research_innovation_settings;
create policy "Public reads research innovation settings" on public.research_innovation_settings for select to anon,authenticated using(true);
create policy "Admins manage research innovation settings" on public.research_innovation_settings for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop trigger if exists research_innovation_settings_updated_at on public.research_innovation_settings;
create trigger research_innovation_settings_updated_at before update on public.research_innovation_settings for each row execute function public.set_updated_at();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('research-assets','research-assets',true,20971520,array['image/jpeg','image/png','image/webp','video/mp4','application/pdf']) on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Public reads research assets" on storage.objects;
drop policy if exists "Admins upload research assets" on storage.objects;
drop policy if exists "Admins update research assets" on storage.objects;
drop policy if exists "Admins delete research assets" on storage.objects;
create policy "Public reads research assets" on storage.objects for select to anon,authenticated using(bucket_id='research-assets');
create policy "Admins upload research assets" on storage.objects for insert to authenticated with check(bucket_id='research-assets' and public.is_admin());
create policy "Admins update research assets" on storage.objects for update to authenticated using(bucket_id='research-assets' and public.is_admin()) with check(bucket_id='research-assets' and public.is_admin());
create policy "Admins delete research assets" on storage.objects for delete to authenticated using(bucket_id='research-assets' and public.is_admin());
