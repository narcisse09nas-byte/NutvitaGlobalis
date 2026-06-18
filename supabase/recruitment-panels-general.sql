-- Run after recruitment-advanced.sql and services-and-recruitment-adjustments.sql.
-- Review panels for written tests, interview juries, and reusable recruitment offers.

alter table public.recruitment_applications add column if not exists job_offer_id uuid;
alter table public.recruitment_applications add column if not exists recruitment_type text not null default 'dietitian_partner'
  check(recruitment_type in ('dietitian_partner','employee','consultant','intern','other'));

create table if not exists public.recruitment_job_offers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  recruitment_type text not null default 'employee' check(recruitment_type in ('dietitian_partner','employee','consultant','intern','other')),
  department text,
  location text,
  description text not null,
  requirements text,
  process_steps jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check(status in ('draft','published','closed','archived')),
  published_at timestamptz,
  closes_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  alter table public.recruitment_applications
    add constraint recruitment_applications_job_offer_id_fkey
    foreign key(job_offer_id) references public.recruitment_job_offers(id) on delete set null;
exception when duplicate_object then null;
end $$;

create table if not exists public.recruitment_test_reviews (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.recruitment_test_attempts(id) on delete cascade,
  application_id uuid not null references public.recruitment_applications(id) on delete cascade,
  reviewer_email text not null,
  reviewer_user_id uuid references auth.users(id) on delete set null,
  invited_by uuid references auth.users(id) on delete set null,
  status text not null default 'invited' check(status in ('invited','in_progress','submitted','cancelled')),
  score numeric(7,2) check(score between 0 and 100),
  comments text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  unique(attempt_id, reviewer_email)
);

create table if not exists public.interview_panel_members (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.video_interviews(id) on delete cascade,
  email text not null,
  user_id uuid references auth.users(id) on delete set null,
  full_name text,
  role text not null default 'jury' check(role in ('jury','candidate','observer','admin')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(interview_id, email)
);

create table if not exists public.interview_questions (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.video_interviews(id) on delete cascade,
  prompt text not null,
  assigned_member_id uuid references public.interview_panel_members(id) on delete set null,
  position integer not null default 1,
  private_notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.interview_panel_evaluations (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.video_interviews(id) on delete cascade,
  panel_member_id uuid references public.interview_panel_members(id) on delete set null,
  evaluator_email text not null,
  score numeric(7,2) check(score between 0 and 100),
  recommendation text not null default 'pending' check(recommendation in ('pending','select','reject','reserve')),
  comments text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  unique(interview_id, evaluator_email)
);

create table if not exists public.interview_session_logs (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.video_interviews(id) on delete cascade,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  actor_email text,
  created_at timestamptz not null default now()
);

create index if not exists recruitment_test_reviews_attempt on public.recruitment_test_reviews(attempt_id, status);
create index if not exists interview_panel_members_interview on public.interview_panel_members(interview_id);
create index if not exists interview_questions_interview on public.interview_questions(interview_id, position);
create index if not exists recruitment_job_offers_status on public.recruitment_job_offers(status, published_at desc);

alter table public.recruitment_job_offers enable row level security;
alter table public.recruitment_test_reviews enable row level security;
alter table public.interview_panel_members enable row level security;
alter table public.interview_questions enable row level security;
alter table public.interview_panel_evaluations enable row level security;
alter table public.interview_session_logs enable row level security;

drop policy if exists "Published recruitment offers public" on public.recruitment_job_offers;
create policy "Published recruitment offers public" on public.recruitment_job_offers for select to anon, authenticated using(status='published' or public.is_admin());
drop policy if exists "Admins manage recruitment offers" on public.recruitment_job_offers;
create policy "Admins manage recruitment offers" on public.recruitment_job_offers for all to authenticated using(public.is_admin()) with check(public.is_admin());

drop policy if exists "Admins manage test reviews" on public.recruitment_test_reviews;
create policy "Admins manage test reviews" on public.recruitment_test_reviews for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "Reviewers read assigned test reviews" on public.recruitment_test_reviews;
create policy "Reviewers read assigned test reviews" on public.recruitment_test_reviews for select to authenticated using(public.is_admin() or reviewer_user_id=(select auth.uid()));
drop policy if exists "Reviewers update assigned test reviews" on public.recruitment_test_reviews;
create policy "Reviewers update assigned test reviews" on public.recruitment_test_reviews for update to authenticated using(public.is_admin() or reviewer_user_id=(select auth.uid())) with check(public.is_admin() or reviewer_user_id=(select auth.uid()));

drop policy if exists "Admins manage interview panels" on public.interview_panel_members;
create policy "Admins manage interview panels" on public.interview_panel_members for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "Panel members read own interviews" on public.interview_panel_members;
create policy "Panel members read own interviews" on public.interview_panel_members for select to authenticated using(public.is_admin() or user_id=(select auth.uid()));

drop policy if exists "Interview questions visible to admins and panel" on public.interview_questions;
create policy "Interview questions visible to admins and panel" on public.interview_questions for select to authenticated using(public.is_admin() or exists(select 1 from public.interview_panel_members m where m.interview_id=interview_questions.interview_id and m.user_id=(select auth.uid()) and m.role='jury'));
drop policy if exists "Admins manage interview questions" on public.interview_questions;
create policy "Admins manage interview questions" on public.interview_questions for all to authenticated using(public.is_admin()) with check(public.is_admin());

drop policy if exists "Admins manage interview evaluations" on public.interview_panel_evaluations;
create policy "Admins manage interview evaluations" on public.interview_panel_evaluations for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "Interview logs admin readable" on public.interview_session_logs;
create policy "Interview logs admin readable" on public.interview_session_logs for all to authenticated using(public.is_admin()) with check(public.is_admin());
