-- Unified candidate portal: candidate-authored comments on a written test attempt.
-- Covers both the recruitment_applications track (test_ref_id = recruitment_test_attempts.id)
-- and the Maximus staff track (test_ref_id = maximus_test_assignments.id).
-- Run after recruitment.sql and maximus-recruitment.sql.

create table if not exists public.test_candidate_comments (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references auth.users(id) on delete cascade,
  track text not null check(track in ('recruitment','staff')),
  test_ref_id uuid not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists test_candidate_comments_ref on public.test_candidate_comments(test_ref_id, created_at desc);
create index if not exists test_candidate_comments_candidate on public.test_candidate_comments(candidate_id, created_at desc);

alter table public.test_candidate_comments enable row level security;

drop policy if exists "Candidates manage own test comments" on public.test_candidate_comments;
create policy "Candidates manage own test comments" on public.test_candidate_comments
  for all to authenticated using(candidate_id=(select auth.uid())) with check(candidate_id=(select auth.uid()));

drop policy if exists "Admins read test comments" on public.test_candidate_comments;
create policy "Admins read test comments" on public.test_candidate_comments
  for select to authenticated using(public.is_admin());
