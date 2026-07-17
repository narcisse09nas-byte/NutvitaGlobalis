-- Seed minimal sans utilisateur.
-- Les profils sont créés automatiquement à l’inscription.

insert into public.courses (
  organization_id,
  slug,
  code,
  title,
  description,
  status,
  price_usd,
  instructor_user_id
)
select
  null,
  'camms',
  'CAMMS',
  'Certified Acute Malnutrition Management Specialist',
  'Formation professionnelle en prise en charge de la malnutrition aiguë.',
  'published',
  79,
  profile.id
from public.profiles profile
where profile.role in ('instructor', 'admin', 'super_admin')
limit 1
on conflict do nothing;
