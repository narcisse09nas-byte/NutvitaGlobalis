-- Add the bilingual scientific research service to the homepage catalogue.
update public.homepage_settings
set services = case
  when exists (
    select 1 from jsonb_array_elements(coalesce(services, '[]'::jsonb)) item
    where lower(coalesce(item->>'title','')) like '%recherche scientifique%'
  ) then services
  else coalesce(services, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
    'title', 'Recherche scientifique, innovation et expertise technique',
    'text', 'Nous accompagnons les institutions, ONG, entreprises et particuliers dans la recherche scientifique, la conception, la mise en oeuvre et le suivi-evaluation de projets en sante publique, nutrition et securite alimentaire.',
    'ctaLabel', 'Nous contacter',
    'href', '/contact'
  ))
end,
services_en = case
  when exists (
    select 1 from jsonb_array_elements(coalesce(services_en, '[]'::jsonb)) item
    where lower(coalesce(item->>'title','')) like '%scientific research%'
  ) then services_en
  else coalesce(services_en, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
    'title', 'Scientific Research, Innovation & Technical Expertise',
    'text', 'We support institutions, NGOs, businesses and individuals in scientific research and in the design, implementation, monitoring and evaluation of public health, nutrition and food security projects.',
    'ctaLabel', 'Contact us',
    'href', '/contact'
  ))
end
where id = 1;