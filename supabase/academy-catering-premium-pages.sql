-- Premium public pages: bilingual managed content and media.
-- Run after supabase/site-pages.sql.
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

-- Create the two page records when absent. Rich default blocks live in data/site-pages.ts
-- and can then be saved or changed from Administration > Pages du site.
insert into public.site_pages(page_key,eyebrow,title,description,cta_label,cta_url,eyebrow_en,title_en,description_en,cta_label_en,hero_image_url,cta_image_url,secondary_cta_label,secondary_cta_label_en,secondary_cta_url)
values
('formations','Se former','Des compétences qui transforment les pratiques','Des parcours flexibles, concrets et conçus par des professionnels de la nutrition et de la santé publique.','Explorer les formations','#formations','Learn','Skills that transform practice','Flexible, practical learning paths designed by nutrition and public health professionals.','Explore courses','/images/academy-hero-v1.png','/images/academy-cta-v1.png','Voir comment ça fonctionne','See how it works','#fonctionnement'),
('restauration','Restauration saine',E'Les menus du jour,\npréparés avec soin','Découvrez des repas sains, équilibrés et savoureux disponibles dans votre ville.','Passer une commande','/restauration/commander','Healthy catering',E'Today’s menus,\nprepared with care','Discover healthy, balanced and delicious meals available in your city.','Place an order','/images/catering-hero-african-v2.png','/images/catering-kitchen-v1.png',null,null,null)
on conflict(page_key) do update set
 eyebrow=excluded.eyebrow,title=excluded.title,description=excluded.description,cta_label=excluded.cta_label,cta_url=excluded.cta_url,
 eyebrow_en=excluded.eyebrow_en,title_en=excluded.title_en,description_en=excluded.description_en,cta_label_en=excluded.cta_label_en,
 hero_image_url=excluded.hero_image_url,cta_image_url=excluded.cta_image_url,
 secondary_cta_label=excluded.secondary_cta_label,secondary_cta_label_en=excluded.secondary_cta_label_en,secondary_cta_url=excluded.secondary_cta_url;