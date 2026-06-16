-- Run after schema.sql and recruitment.sql
alter table public.recruitment_test_attempts add column if not exists identity_photo_path text;
alter table public.recruitment_test_attempts add column if not exists identity_confirmed boolean not null default false;
alter table public.recruitment_test_attempts add column if not exists tab_switch_count integer not null default 0;
alter table public.recruitment_test_attempts add column if not exists reconnect_count integer not null default 0;
alter table public.recruitment_test_attempts add column if not exists suspicion_level text not null default 'none' check(suspicion_level in ('none','low','medium','high'));

create table if not exists public.test_proctoring_logs (
  id uuid primary key default gen_random_uuid(), attempt_id uuid not null references public.recruitment_test_attempts(id) on delete cascade,
  candidate_id uuid not null references auth.users(id) on delete cascade, event_type text not null,
  details jsonb not null default '{}', created_at timestamptz not null default now()
);
create table if not exists public.video_interviews (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references public.recruitment_applications(id) on delete cascade,
  candidate_id uuid not null references auth.users(id) on delete cascade, scheduled_at timestamptz not null,
  duration_minutes integer not null default 45, provider text not null default 'jitsi', room_name text not null unique,
  meeting_url text, status text not null default 'scheduled' check(status in ('scheduled','in_progress','completed','cancelled')),
  admin_notes text, created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.interview_evaluations (
  id uuid primary key default gen_random_uuid(), interview_id uuid not null unique references public.video_interviews(id) on delete cascade,
  technical_skill integer check(technical_skill between 1 and 5), communication integer check(communication between 1 and 5),
  professional_ethics integer check(professional_ethics between 1 and 5), clinical_experience integer check(clinical_experience between 1 and 5),
  teleconsultation_aptitude integer check(teleconsultation_aptitude between 1 and 5), availability integer check(availability between 1 and 5),
  motivation integer check(motivation between 1 and 5), notes text, recommendation text check(recommendation in ('pending','select','reject')),
  evaluator_id uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.recruitment_messages (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references public.recruitment_applications(id) on delete cascade,
  sender_id uuid not null references auth.users(id), recipient_id uuid references auth.users(id), body text,
  attachment_path text, attachment_name text, read_at timestamptz, created_at timestamptz not null default now(),
  check(coalesce(length(trim(body)),0)>0 or attachment_path is not null)
);
create table if not exists public.recruitment_notes (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references public.recruitment_applications(id) on delete cascade,
  admin_id uuid not null references auth.users(id), note text not null, created_at timestamptz not null default now()
);
create table if not exists public.candidate_documents (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references public.recruitment_applications(id) on delete cascade,
  candidate_id uuid not null references auth.users(id), document_type text not null, file_path text not null, file_name text not null,
  mime_type text, file_size bigint, verified_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.dietitian_profiles (
  id uuid primary key default gen_random_uuid(), candidate_id uuid not null unique references auth.users(id), application_id uuid not null unique references public.recruitment_applications(id),
  status text not null default 'active' check(status in ('active','inactive')), full_name text not null, specialties text[] not null default '{}',
  photo_path text, short_bio text, languages text[] not null default '{}', availability text, rate numeric(12,2), booking_url text,
  internal_quality_score numeric(5,2), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- Compatibility names requested by the recruitment specification.
create or replace view public.candidates as select * from public.recruitment_applications;
create or replace view public.candidate_status_history as select * from public.recruitment_history;
create or replace view public.written_tests as select * from public.recruitment_test_attempts;
create or replace view public.test_questions as select * from public.recruitment_test_questions;
create or replace view public.test_sessions as select * from public.recruitment_test_attempts;
create or replace view public.test_answers as select id,attempt_id,candidate_id,answers,created_at from (select id,id as attempt_id,candidate_id,answers,started_at as created_at from public.recruitment_test_attempts) a;

alter table public.test_proctoring_logs enable row level security;
alter table public.video_interviews enable row level security;
alter table public.interview_evaluations enable row level security;
alter table public.recruitment_messages enable row level security;
alter table public.recruitment_notes enable row level security;
alter table public.candidate_documents enable row level security;
alter table public.dietitian_profiles enable row level security;

create policy "Candidates read own proctor logs" on public.test_proctoring_logs for select to authenticated using(candidate_id=(select auth.uid()) or public.is_admin());
create policy "Candidates write own proctor logs" on public.test_proctoring_logs for insert to authenticated with check(candidate_id=(select auth.uid()));
create policy "Interview participants read" on public.video_interviews for select to authenticated using(candidate_id=(select auth.uid()) or public.is_admin());
create policy "Admins manage interviews" on public.video_interviews for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Admins manage interview evaluations" on public.interview_evaluations for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Candidates read interview evaluations" on public.interview_evaluations for select to authenticated using(public.is_admin() or exists(select 1 from public.video_interviews i where i.id=interview_id and i.candidate_id=(select auth.uid())));
create policy "Conversation participants read" on public.recruitment_messages for select to authenticated using(public.is_admin() or sender_id=(select auth.uid()) or recipient_id=(select auth.uid()) or exists(select 1 from public.recruitment_applications a where a.id=application_id and a.candidate_id=(select auth.uid())));
create policy "Conversation participants send" on public.recruitment_messages for insert to authenticated with check(sender_id=(select auth.uid()) and (public.is_admin() or exists(select 1 from public.recruitment_applications a where a.id=application_id and a.candidate_id=(select auth.uid()))));
create policy "Recipients mark read" on public.recruitment_messages for update to authenticated using(recipient_id=(select auth.uid()) or public.is_admin()) with check(recipient_id=(select auth.uid()) or public.is_admin());
create policy "Admins manage notes" on public.recruitment_notes for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Candidates read own documents metadata" on public.candidate_documents for select to authenticated using(candidate_id=(select auth.uid()) or public.is_admin());
create policy "Candidates create documents metadata" on public.candidate_documents for insert to authenticated with check(candidate_id=(select auth.uid()));
create policy "Admins manage documents metadata" on public.candidate_documents for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Admins manage dietitian profiles" on public.dietitian_profiles for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Active dietitian profiles public" on public.dietitian_profiles for select to anon,authenticated using(status='active' or public.is_admin());

create policy "Recruitment attachments upload" on storage.objects for insert to authenticated with check(bucket_id='recruitment-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Admins upload recruitment attachments" on storage.objects for insert to authenticated with check(bucket_id='recruitment-documents' and public.is_admin());

create or replace function public.log_test_event(p_attempt_id uuid,p_event_type text,p_details jsonb default '{}') returns void language plpgsql security definer set search_path=public as $$
declare switches integer; reconnects integer; level text;
begin
  if not exists(select 1 from public.recruitment_test_attempts where id=p_attempt_id and candidate_id=(select auth.uid())) then raise exception 'Tentative inaccessible.'; end if;
  insert into public.test_proctoring_logs(attempt_id,candidate_id,event_type,details) values(p_attempt_id,(select auth.uid()),p_event_type,p_details);
  if p_event_type='tab_hidden' then update public.recruitment_test_attempts set tab_switch_count=tab_switch_count+1 where id=p_attempt_id; end if;
  if p_event_type='reconnected' then update public.recruitment_test_attempts set reconnect_count=reconnect_count+1 where id=p_attempt_id; end if;
  select tab_switch_count,reconnect_count into switches,reconnects from public.recruitment_test_attempts where id=p_attempt_id;
  level:=case when switches>=6 or reconnects>=4 then 'high' when switches>=3 or reconnects>=2 then 'medium' when switches>0 or reconnects>0 then 'low' else 'none' end;
  update public.recruitment_test_attempts set suspicion_level=level where id=p_attempt_id;
end $$;

create or replace function public.confirm_test_identity(p_photo_path text) returns void language plpgsql security definer set search_path=public as $$
begin update public.recruitment_test_attempts set identity_confirmed=true,identity_photo_path=p_photo_path where candidate_id=(select auth.uid()) and status='in_progress'; if not found then raise exception 'Aucun test actif.'; end if; end $$;

create or replace function public.create_dietitian_from_application(p_application_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare app public.recruitment_applications; profile_id uuid; photo text;
begin
  if not public.is_admin() then raise exception 'Accès refusé.'; end if;
  select * into app from public.recruitment_applications where id=p_application_id;
  photo:=app.documents->'photo'->0->>'path';
  insert into public.dietitian_profiles(candidate_id,application_id,full_name,specialties,photo_path,languages,availability,rate,internal_quality_score)
  values(app.candidate_id,app.id,app.full_name,app.intervention_domains,photo,app.languages,app.weekly_availability,app.desired_rate,app.administrative_score)
  on conflict(candidate_id) do update set status='active',full_name=excluded.full_name,specialties=excluded.specialties,photo_path=excluded.photo_path,languages=excluded.languages,availability=excluded.availability,rate=excluded.rate,internal_quality_score=excluded.internal_quality_score,updated_at=now()
  returning id into profile_id; return profile_id;
end $$;
