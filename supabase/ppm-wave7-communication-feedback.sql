-- Refinement program, Wave 7: Communication actuals gain a meeting-specific "agenda" field and a
-- beneficiary count (item 38); Feedback follow-up register (item 42).
-- Run after ppm-communication-stakeholder-actuals.sql and ppm-stakeholders-communication.sql.

alter table public.ppm_communication_actuals add column if not exists agenda text;
alter table public.ppm_communication_actuals add column if not exists beneficiary_count integer;

-- Feedback follow-up (item 42): closed feedback gets its own review-with-history register instead
-- of only a single status field.
create table if not exists public.ppm_feedback_followups (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  feedback_id uuid not null references public.ppm_feedback_entries(id) on delete cascade,
  review_date date not null default current_date,
  reviewer_name text,
  action_taken text,
  status_after text not null check(status_after in ('received','under_review','resolved','closed')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists ppm_feedback_followups_feedback on public.ppm_feedback_followups(feedback_id, created_at desc);

alter table public.ppm_feedback_followups enable row level security;
drop policy if exists "PPM users read feedback followups" on public.ppm_feedback_followups;
create policy "PPM users read feedback followups" on public.ppm_feedback_followups for select to authenticated using(public.ppm_project_access(project_id));
drop policy if exists "PPM managers manage feedback followups" on public.ppm_feedback_followups;
create policy "PPM managers manage feedback followups" on public.ppm_feedback_followups for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));
