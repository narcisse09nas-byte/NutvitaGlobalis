-- NutVitaGlobalis bilingual foundation: French default, English secondary.

alter table public.client_profiles add column if not exists preferred_language text not null default 'fr' check (preferred_language in ('fr','en'));
alter table public.admin_users add column if not exists preferred_language text not null default 'fr' check (preferred_language in ('fr','en'));
alter table public.recruitment_applications add column if not exists preferred_language text not null default 'fr' check (preferred_language in ('fr','en'));
alter table public.dietitian_profiles add column if not exists preferred_language text not null default 'fr' check (preferred_language in ('fr','en'));

alter table public.articles add column if not exists publication_locale_status text not null default 'both' check (publication_locale_status in ('fr','en','both'));
alter table public.articles add column if not exists title_en text;
alter table public.articles add column if not exists slug_en text;
alter table public.articles add column if not exists excerpt_en text;
alter table public.articles add column if not exists content_en text;
alter table public.articles add column if not exists category_en text;
alter table public.articles add column if not exists seo_title_en text;
alter table public.articles add column if not exists seo_description_en text;
create unique index if not exists articles_slug_en_unique on public.articles(slug_en) where slug_en is not null and slug_en <> '';

alter table public.formations add column if not exists publication_locale_status text not null default 'both' check (publication_locale_status in ('fr','en','both'));
alter table public.formations add column if not exists title_en text;
alter table public.formations add column if not exists short_description_en text;
alter table public.formations add column if not exists description_en text;
alter table public.formations add column if not exists objectives text;
alter table public.formations add column if not exists objectives_en text;
alter table public.formations add column if not exists content text;
alter table public.formations add column if not exists content_en text;
alter table public.formations add column if not exists certificate_label text;
alter table public.formations add column if not exists certificate_label_en text;
alter table public.formations add column if not exists category_en text;

alter table public.teleconseils add column if not exists name_en text;
alter table public.teleconseils add column if not exists description_en text;
alter table public.teleconseils add column if not exists target_audience_en text;

alter table public.ressources_premium add column if not exists publication_locale_status text not null default 'both' check (publication_locale_status in ('fr','en','both'));
alter table public.ressources_premium add column if not exists title_en text;
alter table public.ressources_premium add column if not exists description_en text;

alter table public.site_pages add column if not exists title_en text;
alter table public.site_pages add column if not exists eyebrow_en text;
alter table public.site_pages add column if not exists description_en text;
alter table public.site_pages add column if not exists sections_en jsonb not null default '[]'::jsonb;
alter table public.site_pages add column if not exists seo_title_en text;
alter table public.site_pages add column if not exists seo_description_en text;

alter table public.system_email_templates add column if not exists subject_en text;
alter table public.system_email_templates add column if not exists body_text_en text;

alter table public.invoices add column if not exists language text not null default 'fr' check (language in ('fr','en'));
alter table public.contracts add column if not exists language text not null default 'fr' check (language in ('fr','en'));
alter table public.contracts add column if not exists title_en text;
alter table public.contracts add column if not exists content_en jsonb;
alter table public.health_reports add column if not exists language text not null default 'fr' check (language in ('fr','en'));
do $$
begin
  if to_regclass('public.child_growth_reports') is not null then
    alter table public.child_growth_reports add column if not exists language text not null default 'fr' check (language in ('fr','en'));
  end if;
end $$;

create table if not exists public.articles_translations (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references public.articles(id) on delete cascade,
  locale text not null check (locale in ('fr','en')),
  title text not null,
  slug text not null,
  excerpt text,
  content text,
  category text,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(article_id, locale),
  unique(locale, slug)
);

create table if not exists public.courses_translations (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.formations(id) on delete cascade,
  locale text not null check (locale in ('fr','en')),
  title text not null,
  short_description text,
  description text,
  objectives text,
  content text,
  certificate_label text,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(course_id, locale)
);

create table if not exists public.services_translations (
  id uuid primary key default gen_random_uuid(),
  service_type text not null,
  service_id uuid not null,
  locale text not null check (locale in ('fr','en')),
  name text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(service_type, service_id, locale)
);

create table if not exists public.email_templates_translations (
  id uuid primary key default gen_random_uuid(),
  template_id text references public.system_email_templates(id) on delete cascade,
  locale text not null check (locale in ('fr','en')),
  subject text not null,
  body_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(template_id, locale)
);

create table if not exists public.legal_documents_translations (
  id uuid primary key default gen_random_uuid(),
  document_key text not null,
  locale text not null check (locale in ('fr','en')),
  title text not null,
  content jsonb not null default '{}'::jsonb,
  seo_title text,
  seo_description text,
  version text not null default '1.0',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(document_key, locale, version)
);

create table if not exists public.ai_prompt_templates_translations (
  id uuid primary key default gen_random_uuid(),
  prompt_key text not null,
  locale text not null check (locale in ('fr','en')),
  system_prompt text not null,
  user_prompt text,
  output_schema jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(prompt_key, locale)
);

alter table public.articles_translations enable row level security;
alter table public.courses_translations enable row level security;
alter table public.services_translations enable row level security;
alter table public.email_templates_translations enable row level security;
alter table public.legal_documents_translations enable row level security;
alter table public.ai_prompt_templates_translations enable row level security;

create policy "Public can read published translations" on public.articles_translations for select using (true);
create policy "Public can read course translations" on public.courses_translations for select using (true);
create policy "Public can read service translations" on public.services_translations for select using (true);
create policy "Public can read legal translations" on public.legal_documents_translations for select using (active);
create policy "Admins manage article translations" on public.articles_translations for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Admins manage course translations" on public.courses_translations for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Admins manage service translations" on public.services_translations for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Admins manage email translations" on public.email_templates_translations for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Admins manage legal translations" on public.legal_documents_translations for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Admins manage ai prompt translations" on public.ai_prompt_templates_translations for all to authenticated using(public.is_admin()) with check(public.is_admin());

insert into public.ai_prompt_templates_translations(prompt_key, locale, system_prompt, user_prompt)
values
('health_analysis','fr','Genere des commentaires de suivi nutritionnel en francais, prudents, explicables et non diagnostiques.','Analyse les mesures et retourne tendances, risques, recommandations et alertes.'),
('health_analysis','en','Generate nutrition tracking comments in English, cautious, explainable and non-diagnostic.','Analyze the measurements and return trends, risks, recommendations and alerts.'),
('child_growth_analysis','fr','Genere des commentaires de croissance enfant en francais avec prudence clinique.','Analyse les courbes, signale les points a verifier et propose des conseils.'),
('child_growth_analysis','en','Generate child growth comments in English with clinical caution.','Analyze growth curves, flag points to review and suggest advice.')
on conflict (prompt_key, locale) do nothing;
