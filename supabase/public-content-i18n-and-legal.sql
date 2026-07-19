-- Complete bilingual fields for public homepage content.
alter table public.homepage_settings add column if not exists hero_title_en text;
alter table public.homepage_settings add column if not exists slogan_en text;
alter table public.homepage_settings add column if not exists presentation_en text;
alter table public.homepage_settings add column if not exists primary_button_label_en text;
alter table public.homepage_settings add column if not exists secondary_button_label_en text;
alter table public.homepage_settings add column if not exists newsletter_title_en text;
alter table public.homepage_settings add column if not exists newsletter_text_en text;
alter table public.homepage_settings add column if not exists services_en jsonb not null default '[]'::jsonb;
alter table public.site_pages add column if not exists cta_label_en text;
alter table public.homepage_settings add column if not exists whatsapp_number text;
alter table public.homepage_settings add column if not exists whatsapp_label text;
alter table public.homepage_settings add column if not exists facebook_url text;
alter table public.homepage_settings add column if not exists linkedin_url text;
alter table public.homepage_settings add column if not exists whatsapp_group_url text;
