-- Bilingual, administrator-managed content for the client health record page.
create table if not exists public.health_record_page_settings (
  id integer primary key default 1 check (id = 1),
  page_title text not null,
  page_title_en text not null,
  page_intro text not null,
  page_intro_en text not null,
  guide_title text not null,
  guide_title_en text not null,
  guide_text text not null,
  guide_text_en text not null,
  guide_image_url text not null default '/images/health-measurement-guide-v1.png',
  objective_title text not null,
  objective_title_en text not null,
  advice_title text not null,
  advice_title_en text not null,
  advice jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.health_record_page_settings enable row level security;
drop policy if exists "Public reads health record page settings" on public.health_record_page_settings;
drop policy if exists "Admins manage health record page settings" on public.health_record_page_settings;
create policy "Public reads health record page settings" on public.health_record_page_settings for select using (true);
create policy "Admins manage health record page settings" on public.health_record_page_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.health_record_page_settings (
  id,page_title,page_title_en,page_intro,page_intro_en,guide_title,guide_title_en,guide_text,guide_text_en,
  objective_title,objective_title_en,advice_title,advice_title_en,advice
) values (
  1,'Mes paramètres de santé','My health parameters',
  'Enregistrez vos mesures et suivez l’évolution de vos indicateurs au fil du temps.',
  'Record your measurements and monitor how your indicators evolve over time.',
  'Bon à savoir','Good to know',
  'Enregistrez régulièrement vos mesures pour suivre efficacement vos progrès.',
  'Record your measurements regularly to monitor your progress effectively.',
  'Votre objectif','Your goal','Conseils personnalisés','Personalized advice',
  '[{"icon":"water","title":"Hydratation","title_en":"Hydration","text":"Buvez 1,5 à 2 L d’eau par jour pour optimiser votre métabolisme.","text_en":"Drink 1.5 to 2 L of water daily to support your metabolism."},{"icon":"activity","title":"Activité physique","title_en":"Physical activity","text":"Visez 30 minutes d’activité modérée au moins 5 fois par semaine.","text_en":"Aim for 30 minutes of moderate activity at least 5 times a week."},{"icon":"food","title":"Alimentation","title_en":"Nutrition","text":"Privilégiez les protéines maigres, les fruits et les légumes.","text_en":"Prioritize lean proteins, fruit and vegetables."}]'::jsonb
) on conflict (id) do nothing;
