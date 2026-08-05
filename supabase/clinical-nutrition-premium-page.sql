-- Premium bilingual clinical nutrition and teleconsultation landing page.
-- Run after supabase/academy-catering-premium-pages.sql.
alter table public.site_pages add column if not exists hero_image_url text;
alter table public.site_pages add column if not exists eyebrow_en text;
alter table public.site_pages add column if not exists title_en text;
alter table public.site_pages add column if not exists description_en text;
alter table public.site_pages add column if not exists sections_en jsonb not null default '[]'::jsonb;
alter table public.site_pages add column if not exists cta_label_en text;
alter table public.site_pages add column if not exists secondary_cta_label text;
alter table public.site_pages add column if not exists secondary_cta_label_en text;
alter table public.site_pages add column if not exists secondary_cta_url text;

insert into public.site_pages(page_key,eyebrow,title,description,cta_label,cta_url,eyebrow_en,title_en,description_en,cta_label_en,hero_image_url,secondary_cta_label,secondary_cta_label_en,secondary_cta_url)
values('teleconseils','NutVitaGlobalis expertise','Nutrition clinique & téléconsultation','Accompagner les patients, les établissements de santé et les organisations grâce à des interventions nutritionnelles fondées sur les preuves, des consultations spécialisées et des solutions numériques innovantes.','Demander une consultation','/rendez-vous','NutVitaGlobalis expertise','Clinical nutrition & teleconsultation','Supporting patients, health facilities and organizations through evidence-based nutrition interventions, specialized consultations and innovative digital solutions.','Request a consultation','/images/clinical-nutrition-hero-v1.png','Demander une proposition','Request a proposal','/contact')
on conflict(page_key) do update set eyebrow=excluded.eyebrow,title=excluded.title,description=excluded.description,cta_label=excluded.cta_label,cta_url=excluded.cta_url,eyebrow_en=excluded.eyebrow_en,title_en=excluded.title_en,description_en=excluded.description_en,cta_label_en=excluded.cta_label_en,hero_image_url=excluded.hero_image_url,secondary_cta_label=excluded.secondary_cta_label,secondary_cta_label_en=excluded.secondary_cta_label_en,secondary_cta_url=excluded.secondary_cta_url;

-- The complete FR/EN block defaults are defined in data/clinical-nutrition-page.ts.
-- Opening and saving the page in Administration > Pages du site persists those
-- defaults and every subsequent editor change in public.site_pages.