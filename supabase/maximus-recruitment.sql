-- Maximus staff and vendor recruitment.
-- Run after accounts-growth-admin.sql and maximus-internal-management.sql.
-- This domain is intentionally separate from the dietitian recruitment tables.

create table if not exists public.maximus_job_offers (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  title text not null,
  department text not null,
  contract_type text not null,
  location text,
  country text,
  region text,
  summary text not null,
  terms_of_reference text not null,
  responsibilities text,
  requirements text,
  application_instructions text,
  closing_at timestamptz,
  status text not null default 'draft'
    check(status in ('draft','submitted','endorsed','validated','rejected','published','closed','archived')),
  rejection_reason text,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  endorsed_by uuid references auth.users(id) on delete set null,
  validated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.maximus_candidate_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  country text,
  region text,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.maximus_staff_applications (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.maximus_job_offers(id) on delete cascade,
  candidate_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  address text,
  professional_title text,
  highest_degree text,
  years_experience numeric(5,1),
  cover_letter text,
  documents jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check(status in (
    'draft','submitted','under_review','invited_to_test','test_in_progress','test_submitted',
    'test_graded','invited_to_interview','interview_completed','offer_proposed',
    'offer_accepted','offer_declined','hired','rejected','withdrawn'
  )),
  written_test_score numeric(7,2) check(written_test_score between 0 and 100),
  interview_score numeric(7,2) check(interview_score between 0 and 100),
  final_score numeric(7,2) check(final_score between 0 and 100),
  decision_note text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(offer_id,candidate_id)
);

create table if not exists public.maximus_candidate_notifications (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid references public.maximus_staff_applications(id) on delete cascade,
  title text not null,
  message text not null,
  action_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.maximus_written_tests (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.maximus_job_offers(id) on delete cascade,
  title text not null,
  instructions text,
  duration_minutes integer not null default 60 check(duration_minutes between 5 and 480),
  pass_score numeric(5,2) not null default 50 check(pass_score between 0 and 100),
  status text not null default 'draft'
    check(status in ('draft','submitted','endorsed','validated','rejected','archived')),
  created_by uuid references auth.users(id) on delete set null,
  validated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.maximus_written_tests add column if not exists proctoring_mode text not null default 'activity';
alter table public.maximus_written_tests alter column proctoring_mode set default 'activity';
alter table public.maximus_written_tests add column if not exists require_camera boolean not null default false;
alter table public.maximus_written_tests add column if not exists require_screen_share boolean not null default false;
alter table public.maximus_written_tests add column if not exists track_tab_switches boolean not null default true;
alter table public.maximus_written_tests add column if not exists track_disconnects boolean not null default true;
alter table public.maximus_written_tests add column if not exists track_audio_activity boolean not null default false;
alter table public.maximus_written_tests add column if not exists track_face_presence boolean not null default false;
alter table public.maximus_written_tests add column if not exists proctoring_consent_text text;
alter table public.maximus_written_tests drop constraint if exists maximus_written_tests_proctoring_mode_check;
alter table public.maximus_written_tests add constraint maximus_written_tests_proctoring_mode_check
  check(proctoring_mode in ('none','activity','live'));

create table if not exists public.maximus_test_questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.maximus_written_tests(id) on delete cascade,
  question_type text not null check(question_type in ('single_choice','multiple_choice','open','file_upload')),
  prompt text not null,
  help_text text,
  options jsonb not null default '[]'::jsonb,
  correct_answers jsonb not null default '[]'::jsonb,
  required boolean not null default true,
  points numeric(7,2) not null default 1 check(points >= 0),
  max_words integer,
  allowed_mime_types text[],
  max_file_size_mb integer,
  position integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.maximus_test_assignments (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.maximus_written_tests(id) on delete cascade,
  application_id uuid not null references public.maximus_staff_applications(id) on delete cascade,
  sent_by uuid references auth.users(id) on delete set null,
  sent_at timestamptz not null default now(),
  available_from timestamptz not null default now(),
  expires_at timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  status text not null default 'sent'
    check(status in ('sent','opened','in_progress','submitted','graded','expired','cancelled')),
  answers jsonb not null default '{}'::jsonb,
  automatic_score numeric(7,2),
  final_score numeric(7,2),
  unique(test_id,application_id)
);

alter table public.maximus_test_assignments add column if not exists proctor_room text;
alter table public.maximus_test_assignments add column if not exists proctoring_consent_at timestamptz;
alter table public.maximus_test_assignments add column if not exists camera_started_at timestamptz;
alter table public.maximus_test_assignments add column if not exists screen_started_at timestamptz;
alter table public.maximus_test_assignments add column if not exists last_heartbeat_at timestamptz;
alter table public.maximus_test_assignments add column if not exists proctoring_summary jsonb not null default '{}'::jsonb;

create table if not exists public.maximus_proctoring_events (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.maximus_test_assignments(id) on delete cascade,
  event_type text not null check(event_type in (
    'consent_granted','session_started','heartbeat','online','offline',
    'tab_hidden','tab_visible','window_blur','window_focus',
    'camera_started','camera_stopped','camera_error',
    'screen_started','screen_stopped','screen_error',
    'audio_activity','speech_detected','face_absent','face_present',
    'conference_joined','conference_left','test_submitted'
  )),
  severity text not null default 'info' check(severity in ('info','warning','critical')),
  details jsonb not null default '{}'::jsonb,
  client_recorded_at timestamptz,
  retention_until timestamptz not null default (now() + interval '90 days'),
  created_at timestamptz not null default now()
);

create table if not exists public.maximus_test_reviews (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.maximus_test_assignments(id) on delete cascade,
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewer_email text not null,
  score numeric(7,2) check(score between 0 and 100),
  comments text,
  status text not null default 'invited'
    check(status in ('invited','in_progress','submitted','cancelled')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  unique(assignment_id,reviewer_email)
);

create table if not exists public.maximus_recruitment_interviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.maximus_staff_applications(id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 45,
  provider text not null default 'jitsi',
  room_name text not null,
  meeting_url text not null,
  agenda text,
  status text not null default 'scheduled'
    check(status in ('scheduled','in_progress','completed','cancelled','rescheduled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.maximus_interview_panel (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.maximus_recruitment_interviews(id) on delete cascade,
  member_id uuid references auth.users(id) on delete set null,
  email text not null,
  full_name text,
  role text not null default 'jury' check(role in ('jury','manager','observer','candidate')),
  invited_at timestamptz not null default now(),
  unique(interview_id,email)
);

create table if not exists public.maximus_interview_evaluations (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.maximus_recruitment_interviews(id) on delete cascade,
  evaluator_email text not null,
  evaluator_id uuid references auth.users(id) on delete set null,
  technical_score numeric(5,2) check(technical_score between 0 and 100),
  communication_score numeric(5,2) check(communication_score between 0 and 100),
  culture_score numeric(5,2) check(culture_score between 0 and 100),
  overall_score numeric(5,2) check(overall_score between 0 and 100),
  recommendation text check(recommendation in ('hire','reserve','reject')),
  comments text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  unique(interview_id,evaluator_email)
);

create table if not exists public.maximus_employment_proposals (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.maximus_staff_applications(id) on delete cascade,
  position_title text not null,
  contract_type text,
  proposed_start_date date,
  salary_amount numeric,
  salary_currency text not null default 'XAF',
  terms text,
  status text not null default 'sent' check(status in ('draft','sent','accepted','declined','withdrawn')),
  candidate_response text,
  sent_at timestamptz,
  responded_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.maximus_vendor_calls (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  title text not null,
  category text not null,
  service_area text,
  requirements text not null,
  terms_of_reference text not null,
  closing_at timestamptz,
  status text not null default 'draft'
    check(status in ('draft','submitted','endorsed','validated','rejected','published','closed','archived')),
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.maximus_vendor_applications (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.maximus_vendor_calls(id) on delete cascade,
  company_name text not null,
  registration_number text,
  contact_name text not null,
  email text not null,
  phone text,
  country text,
  region text,
  city text,
  address text,
  experience_summary text,
  documents jsonb not null default '{}'::jsonb,
  status text not null default 'submitted' check(status in (
    'submitted','under_review','site_visit_planned','site_visit_completed',
    'approved','rejected','contracted','archived'
  )),
  decision_note text,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.maximus_vendor_site_visits (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.maximus_vendor_applications(id) on delete cascade,
  scheduled_at timestamptz,
  completed_at timestamptz,
  inspectors jsonb not null default '[]'::jsonb,
  location text,
  checklist jsonb not null default '[]'::jsonb,
  findings text,
  score numeric(5,2) check(score between 0 and 100),
  recommendation text check(recommendation in ('approve','reserve','reject')),
  report_path text,
  status text not null default 'planned' check(status in ('planned','in_progress','completed','cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.maximus_recruitment_events (
  id uuid primary key default gen_random_uuid(),
  process_type text not null check(process_type in ('staff','vendor')),
  offer_id uuid,
  staff_application_id uuid references public.maximus_staff_applications(id) on delete cascade,
  vendor_application_id uuid references public.maximus_vendor_applications(id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  details jsonb not null default '{}'::jsonb,
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  created_at timestamptz not null default now()
);

create table if not exists public.maximus_recruitment_audit_reports (
  id uuid primary key default gen_random_uuid(),
  process_type text not null check(process_type in ('staff','vendor')),
  process_id uuid not null,
  report_scope text not null default 'progress' check(report_scope in ('progress','final')),
  period_start timestamptz,
  period_end timestamptz,
  structured_data jsonb not null default '{}'::jsonb,
  ai_narrative jsonb not null default '{}'::jsonb,
  provider text,
  model text,
  generated_by uuid references auth.users(id) on delete set null,
  generated_at timestamptz not null default now()
);

create index if not exists maximus_job_offers_status on public.maximus_job_offers(status,published_at desc);
create index if not exists maximus_staff_applications_offer on public.maximus_staff_applications(offer_id,status,created_at desc);
create index if not exists maximus_candidate_notifications_candidate on public.maximus_candidate_notifications(candidate_id,created_at desc);
create index if not exists maximus_test_assignments_application on public.maximus_test_assignments(application_id,status);
create index if not exists maximus_proctoring_events_assignment on public.maximus_proctoring_events(assignment_id,created_at);
create index if not exists maximus_proctoring_events_retention on public.maximus_proctoring_events(retention_until);

create or replace function public.purge_expired_maximus_proctoring_events()
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare deleted_count integer;
begin
  if not public.is_super_admin() then
    raise exception 'Acces super administrateur requis.';
  end if;
  delete from public.maximus_proctoring_events where retention_until < now();
  get diagnostics deleted_count = row_count;
  return deleted_count;
end $$;

revoke all on function public.purge_expired_maximus_proctoring_events() from public;
grant execute on function public.purge_expired_maximus_proctoring_events() to authenticated;
create index if not exists maximus_interviews_application on public.maximus_recruitment_interviews(application_id,scheduled_at desc);
create index if not exists maximus_vendor_applications_call on public.maximus_vendor_applications(call_id,status,created_at desc);
create index if not exists maximus_recruitment_events_process on public.maximus_recruitment_events(process_type,offer_id,created_at);

alter table public.maximus_job_offers enable row level security;
alter table public.maximus_candidate_profiles enable row level security;
alter table public.maximus_staff_applications enable row level security;
alter table public.maximus_candidate_notifications enable row level security;
alter table public.maximus_written_tests enable row level security;
alter table public.maximus_test_questions enable row level security;
alter table public.maximus_test_assignments enable row level security;
alter table public.maximus_test_reviews enable row level security;
alter table public.maximus_proctoring_events enable row level security;
alter table public.maximus_recruitment_interviews enable row level security;
alter table public.maximus_interview_panel enable row level security;
alter table public.maximus_interview_evaluations enable row level security;
alter table public.maximus_employment_proposals enable row level security;
alter table public.maximus_vendor_calls enable row level security;
alter table public.maximus_vendor_applications enable row level security;
alter table public.maximus_vendor_site_visits enable row level security;
alter table public.maximus_recruitment_events enable row level security;
alter table public.maximus_recruitment_audit_reports enable row level security;

drop policy if exists "Published Maximus job offers are public" on public.maximus_job_offers;
create policy "Published Maximus job offers are public" on public.maximus_job_offers
for select to anon,authenticated using(status='published' or public.is_super_admin());
drop policy if exists "Super admins manage Maximus job offers" on public.maximus_job_offers;
create policy "Super admins manage Maximus job offers" on public.maximus_job_offers
for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
drop policy if exists "Candidates own Maximus profile" on public.maximus_candidate_profiles;
create policy "Candidates own Maximus profile" on public.maximus_candidate_profiles
for all to authenticated using(id=(select auth.uid()) or public.is_super_admin())
with check(id=(select auth.uid()) or public.is_super_admin());
drop policy if exists "Candidates read own staff applications" on public.maximus_staff_applications;
create policy "Candidates read own staff applications" on public.maximus_staff_applications
for select to authenticated using(candidate_id=(select auth.uid()) or public.is_super_admin());
drop policy if exists "Candidates create own staff applications" on public.maximus_staff_applications;
create policy "Candidates create own staff applications" on public.maximus_staff_applications
for insert to authenticated with check(
  candidate_id=(select auth.uid())
  and status in ('draft','submitted')
  and written_test_score is null
  and interview_score is null
  and final_score is null
  and decision_note is null
);
drop policy if exists "Candidates edit draft staff applications" on public.maximus_staff_applications;
create policy "Candidates edit draft staff applications" on public.maximus_staff_applications
for update to authenticated using(candidate_id=(select auth.uid()) and status='draft')
with check(
  candidate_id=(select auth.uid())
  and status in ('draft','submitted')
  and written_test_score is null
  and interview_score is null
  and final_score is null
  and decision_note is null
);
drop policy if exists "Super admins manage staff applications" on public.maximus_staff_applications;
create policy "Super admins manage staff applications" on public.maximus_staff_applications
for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
drop policy if exists "Candidates read own Maximus notifications" on public.maximus_candidate_notifications;
create policy "Candidates read own Maximus notifications" on public.maximus_candidate_notifications
for select to authenticated using(candidate_id=(select auth.uid()) or public.is_super_admin());
drop policy if exists "Candidates mark own Maximus notifications" on public.maximus_candidate_notifications;
create policy "Candidates mark own Maximus notifications" on public.maximus_candidate_notifications
for update to authenticated using(candidate_id=(select auth.uid()))
with check(candidate_id=(select auth.uid()));
drop policy if exists "Super admins manage Maximus notifications" on public.maximus_candidate_notifications;
create policy "Super admins manage Maximus notifications" on public.maximus_candidate_notifications
for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());

drop policy if exists "Candidates read assigned tests" on public.maximus_test_assignments;
create policy "Candidates read assigned tests" on public.maximus_test_assignments
for select to authenticated using(public.is_super_admin() or exists(
  select 1 from public.maximus_staff_applications a
  where a.id=application_id and a.candidate_id=(select auth.uid())
));
drop policy if exists "Candidates submit assigned tests" on public.maximus_test_assignments;
-- Assignment mutations run through /api/staff-candidate/tests.
-- Direct updates are disabled to protect scores, timing and proctoring fields.
drop policy if exists "Candidates create own proctoring events" on public.maximus_proctoring_events;
create policy "Candidates create own proctoring events" on public.maximus_proctoring_events
for insert to authenticated with check(exists(
  select 1
  from public.maximus_test_assignments assignment
  join public.maximus_staff_applications application on application.id=assignment.application_id
  where assignment.id=assignment_id and application.candidate_id=(select auth.uid())
));
drop policy if exists "Candidates read own proctoring events" on public.maximus_proctoring_events;
create policy "Candidates read own proctoring events" on public.maximus_proctoring_events
for select to authenticated using(public.is_super_admin() or exists(
  select 1
  from public.maximus_test_assignments assignment
  join public.maximus_staff_applications application on application.id=assignment.application_id
  where assignment.id=assignment_id and application.candidate_id=(select auth.uid())
));
drop policy if exists "Candidates read assigned test definitions" on public.maximus_written_tests;
create policy "Candidates read assigned test definitions" on public.maximus_written_tests
for select to authenticated using(public.is_super_admin() or exists(
  select 1
  from public.maximus_test_assignments assignment
  join public.maximus_staff_applications application on application.id=assignment.application_id
  where assignment.test_id=maximus_written_tests.id
    and application.candidate_id=(select auth.uid())
));
drop policy if exists "Candidates read assigned test questions" on public.maximus_test_questions;
-- Questions are returned through the candidate API after server-side authorization.
-- Direct table access is intentionally disabled because this table contains correct_answers.
drop policy if exists "Reviewers read assigned Maximus reviews" on public.maximus_test_reviews;
create policy "Reviewers read assigned Maximus reviews" on public.maximus_test_reviews
for select to authenticated using(
  public.is_super_admin()
  or reviewer_id=(select auth.uid())
  or lower(reviewer_email)=lower(coalesce((select auth.jwt()->>'email'),''))
);
drop policy if exists "Reviewers update assigned Maximus reviews" on public.maximus_test_reviews;
create policy "Reviewers update assigned Maximus reviews" on public.maximus_test_reviews
for update to authenticated using(
  public.is_super_admin()
  or reviewer_id=(select auth.uid())
  or lower(reviewer_email)=lower(coalesce((select auth.jwt()->>'email'),''))
) with check(
  public.is_super_admin()
  or reviewer_id=(select auth.uid())
  or lower(reviewer_email)=lower(coalesce((select auth.jwt()->>'email'),''))
);
drop policy if exists "Candidates read own recruitment interviews" on public.maximus_recruitment_interviews;
create policy "Candidates read own recruitment interviews" on public.maximus_recruitment_interviews
for select to authenticated using(public.is_super_admin() or exists(
  select 1 from public.maximus_staff_applications application
  where application.id=application_id and application.candidate_id=(select auth.uid())
));
drop policy if exists "Candidates read own employment proposals" on public.maximus_employment_proposals;
create policy "Candidates read own employment proposals" on public.maximus_employment_proposals
for select to authenticated using(public.is_super_admin() or exists(
  select 1 from public.maximus_staff_applications application
  where application.id=application_id and application.candidate_id=(select auth.uid())
));
drop policy if exists "Candidates answer own employment proposals" on public.maximus_employment_proposals;
-- Proposal responses run through the candidate API or the signature endpoint.
-- Direct updates are disabled to protect contractual and financial terms.

drop policy if exists "Published vendor calls are public" on public.maximus_vendor_calls;
create policy "Published vendor calls are public" on public.maximus_vendor_calls
for select to anon,authenticated using(status='published' or public.is_super_admin());
drop policy if exists "Super admins manage vendor calls" on public.maximus_vendor_calls;
create policy "Super admins manage vendor calls" on public.maximus_vendor_calls
for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
drop policy if exists "Public submits vendor applications" on public.maximus_vendor_applications;
create policy "Public submits vendor applications" on public.maximus_vendor_applications
for insert to anon,authenticated with check(status='submitted');

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'maximus_written_tests','maximus_test_questions','maximus_test_reviews',
    'maximus_proctoring_events',
    'maximus_recruitment_interviews','maximus_interview_panel','maximus_interview_evaluations',
    'maximus_employment_proposals','maximus_vendor_applications','maximus_vendor_site_visits',
    'maximus_recruitment_events','maximus_recruitment_audit_reports'
  ] loop
    execute format('drop policy if exists %I on public.%I', 'Super admins manage ' || table_name, table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin())',
      'Super admins manage ' || table_name,
      table_name
    );
  end loop;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'maximus-recruitment',
  'maximus-recruitment',
  false,
  15728640,
  array['application/pdf','image/jpeg','image/png','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) on conflict(id) do nothing;

drop policy if exists "Candidates upload Maximus recruitment files" on storage.objects;
create policy "Candidates upload Maximus recruitment files" on storage.objects
for insert to authenticated with check(
  bucket_id='maximus-recruitment' and (storage.foldername(name))[1]=(select auth.uid())::text
);
drop policy if exists "Candidates read Maximus recruitment files" on storage.objects;
create policy "Candidates read Maximus recruitment files" on storage.objects
for select to authenticated using(
  bucket_id='maximus-recruitment'
  and ((storage.foldername(name))[1]=(select auth.uid())::text or public.is_super_admin())
);
drop policy if exists "Super admins manage Maximus recruitment files" on storage.objects;
create policy "Super admins manage Maximus recruitment files" on storage.objects
for all to authenticated using(bucket_id='maximus-recruitment' and public.is_super_admin())
with check(bucket_id='maximus-recruitment' and public.is_super_admin());
