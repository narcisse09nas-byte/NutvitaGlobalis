-- Replace the legacy building hero with an original African meal visual.
update public.site_pages
set hero_image_url='/images/catering-hero-african-v2.png', updated_at=now()
where page_key='restauration' and (hero_image_url is null or hero_image_url='/images/catering-hero-v1.png');
