-- Scores synthétiques: les réponses détaillées ne sont pas persistées.
alter table public.health_lifestyle_assessments
  add column if not exists nutrition_score integer check (nutrition_score between 0 and 100),
  add column if not exists physical_activity_score integer check (physical_activity_score between 0 and 100),
  add column if not exists lifestyle_score integer check (lifestyle_score between 0 and 100),
  add column if not exists score_levels jsonb not null default '{}'::jsonb,
  add column if not exists priority_signals jsonb not null default '[]'::jsonb;

alter table public.biological_measurements
  add column if not exists pulse_bpm numeric check (pulse_bpm between 20 and 250);

comment on column public.health_lifestyle_assessments.priority_signals is
  'Signaux essentiels avec score faible; aucune copie complète des réponses au questionnaire.';
