-- Distinct reusable question bank for Maximus staff recruitment.
create table if not exists public.maximus_recruitment_question_bank (
 id uuid primary key default gen_random_uuid(),
 category text not null,
 question_type text not null check(question_type in ('qcm','multi_qcm','open')),
 prompt text not null,
 options jsonb not null default '[]'::jsonb,
 correct_answers jsonb not null default '[]'::jsonb,
 points numeric not null default 1 check(points>=0),
 active boolean not null default true,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists maximus_recruitment_question_bank_category_idx on public.maximus_recruitment_question_bank(category,question_type,active);
alter table public.maximus_recruitment_question_bank enable row level security;
drop policy if exists "Maximus recruitment team manages question bank" on public.maximus_recruitment_question_bank;
create policy "Maximus recruitment team manages question bank" on public.maximus_recruitment_question_bank for all to authenticated
using(public.is_admin() or exists(select 1 from public.maximus_user_access a where a.user_id=(select auth.uid()) and a.active))
with check(public.is_admin() or exists(select 1 from public.maximus_user_access a where a.user_id=(select auth.uid()) and a.active));
