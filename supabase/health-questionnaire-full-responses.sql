-- Enregistre toutes les réponses des questionnaires Nutrition, Activité et Mode de vie.
-- À exécuter après supabase/health-questionnaires-and-vitals.sql.

alter table public.health_lifestyle_assessments
  add column if not exists questionnaire_answers jsonb not null default '{}'::jsonb,
  add column if not exists questionnaire_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists questionnaire_version text not null default 'nutvita-wellness-v2';

comment on column public.health_lifestyle_assessments.questionnaire_answers is
  'Réponses brutes notées, regroupées par nutrition, activité physique et mode de vie.';

comment on column public.health_lifestyle_assessments.questionnaire_snapshot is
  'Copie immuable des questions, réponses et scores au moment de l’enregistrement.';

comment on column public.health_lifestyle_assessments.questionnaire_version is
  'Version du questionnaire utilisée pour calculer les scores et interprétations.';
