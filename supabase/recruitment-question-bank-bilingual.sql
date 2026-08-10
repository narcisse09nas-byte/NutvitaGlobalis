-- Bilingual question-bank fields for nutritionist recruitment.
alter table public.recruitment_test_questions add column if not exists prompt_en text;
alter table public.recruitment_test_questions add column if not exists options_en text[] not null default '{}';
alter table public.recruitment_test_questions add column if not exists correct_answer_en text;
alter table public.recruitment_test_questions add column if not exists explanation text;
alter table public.recruitment_test_questions add column if not exists explanation_en text;