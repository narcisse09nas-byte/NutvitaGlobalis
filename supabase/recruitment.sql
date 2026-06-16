-- Run after supabase/schema.sql
create table if not exists public.candidate_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recruitment_applications (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text, birth_date date, country text, city text, whatsapp_phone text, email text, address text,
  professional_title text, highest_degree text, specialization text, years_experience integer,
  languages text[] not null default '{}', weekly_availability text, desired_rate numeric(12,2),
  intervention_domains text[] not null default '{}', documents jsonb not null default '{}', professional_references text,
  declaration_accuracy boolean not null default false, declaration_references boolean not null default false,
  declaration_privacy boolean not null default false, declaration_standards boolean not null default false,
  status text not null default 'started' check(status in ('started','submitted','under_review','incomplete','preselected','invited_to_test','test_completed','invited_to_interview','interview_completed','selected','rejected','integrated')),
  administrative_score numeric(5,2), internal_comments text, submitted_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.recruitment_notifications (
  id uuid primary key default gen_random_uuid(), candidate_id uuid not null references auth.users(id) on delete cascade,
  title text not null, message text not null, read_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.recruitment_history (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references public.recruitment_applications(id) on delete cascade,
  actor_id uuid references auth.users(id), action text not null, from_status text, to_status text, note text,
  created_at timestamptz not null default now()
);
create table if not exists public.recruitment_test_questions (
  id uuid primary key default gen_random_uuid(), category text not null, question_type text not null check(question_type in ('qcm','open','case_study')),
  prompt text not null, options jsonb, correct_answer text, points numeric(5,2) not null default 1, position integer not null default 0, active boolean not null default true
);
create unique index if not exists recruitment_test_question_prompt on public.recruitment_test_questions(prompt);
create table if not exists public.recruitment_test_attempts (
  id uuid primary key default gen_random_uuid(), application_id uuid not null unique references public.recruitment_applications(id) on delete cascade,
  candidate_id uuid not null references auth.users(id) on delete cascade, started_at timestamptz not null default now(),
  expires_at timestamptz not null, submitted_at timestamptz, status text not null default 'in_progress' check(status in ('in_progress','submitted','expired','graded')),
  answers jsonb not null default '{}', automatic_score numeric(7,2) not null default 0, manual_score numeric(7,2), reviewer_comments text
);

create index if not exists recruitment_applications_filters on public.recruitment_applications(status,country,city,specialization);
create index if not exists recruitment_notifications_candidate on public.recruitment_notifications(candidate_id,created_at desc);

create or replace function public.handle_candidate_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.candidate_profiles(id,email,full_name) values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name','')) on conflict(id) do nothing; return new; end $$;
drop trigger if exists on_auth_user_created_candidate on auth.users;
create trigger on_auth_user_created_candidate after insert on auth.users for each row execute function public.handle_candidate_user();

create or replace function public.guard_candidate_application() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() and old.status not in ('started','incomplete') then raise exception 'Cette candidature ne peut plus être modifiée.'; end if;
  new.updated_at=now(); return new;
end $$;
drop trigger if exists guard_candidate_application on public.recruitment_applications;
create trigger guard_candidate_application before update on public.recruitment_applications for each row execute function public.guard_candidate_application();

alter table public.candidate_profiles enable row level security;
alter table public.recruitment_applications enable row level security;
alter table public.recruitment_notifications enable row level security;
alter table public.recruitment_history enable row level security;
alter table public.recruitment_test_questions enable row level security;
alter table public.recruitment_test_attempts enable row level security;

create policy "Candidates own profile" on public.candidate_profiles for select to authenticated using(id=(select auth.uid()) or public.is_admin());
create policy "Candidates update profile" on public.candidate_profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy "Candidates read own application" on public.recruitment_applications for select to authenticated using(candidate_id=(select auth.uid()) or public.is_admin());
create policy "Candidates create own application" on public.recruitment_applications for insert to authenticated with check(candidate_id=(select auth.uid()));
create policy "Candidates edit open application" on public.recruitment_applications for update to authenticated using(candidate_id=(select auth.uid()) and status in ('started','incomplete')) with check(candidate_id=(select auth.uid()));
create policy "Admins manage applications" on public.recruitment_applications for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Candidates read notifications" on public.recruitment_notifications for select to authenticated using(candidate_id=(select auth.uid()) or public.is_admin());
create policy "Candidates mark notifications read" on public.recruitment_notifications for update to authenticated using(candidate_id=(select auth.uid())) with check(candidate_id=(select auth.uid()));
create policy "Admins manage notifications" on public.recruitment_notifications for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Candidates create own notifications" on public.recruitment_notifications for insert to authenticated with check(candidate_id=(select auth.uid()));
create policy "Candidates read own history" on public.recruitment_history for select to authenticated using(public.is_admin() or exists(select 1 from public.recruitment_applications a where a.id=application_id and a.candidate_id=(select auth.uid())));
create policy "Admins manage history" on public.recruitment_history for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Candidates create own history" on public.recruitment_history for insert to authenticated with check(exists(select 1 from public.recruitment_applications a where a.id=application_id and a.candidate_id=(select auth.uid())));
create policy "Admins manage questions" on public.recruitment_test_questions for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Candidates read attempt" on public.recruitment_test_attempts for select to authenticated using(candidate_id=(select auth.uid()) or public.is_admin());
create policy "Admins manage attempts" on public.recruitment_test_attempts for all to authenticated using(public.is_admin()) with check(public.is_admin());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('recruitment-documents','recruitment-documents',false,10485760,array['application/pdf','image/jpeg','image/png']) on conflict(id) do nothing;
create policy "Candidates upload own recruitment documents" on storage.objects for insert to authenticated with check(bucket_id='recruitment-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Candidates read own recruitment documents" on storage.objects for select to authenticated using(bucket_id='recruitment-documents' and ((storage.foldername(name))[1]=(select auth.uid())::text or public.is_admin()));
create policy "Candidates replace own recruitment documents" on storage.objects for update to authenticated using(bucket_id='recruitment-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Admins delete recruitment documents" on storage.objects for delete to authenticated using(bucket_id='recruitment-documents' and public.is_admin());

create or replace function public.start_recruitment_test() returns jsonb language plpgsql security definer set search_path=public as $$
declare app public.recruitment_applications; attempt public.recruitment_test_attempts;
begin
  select * into app from public.recruitment_applications where candidate_id=(select auth.uid());
  if app.id is null or app.status <> 'invited_to_test' then raise exception 'Vous n’êtes pas invité à ce test.'; end if;
  select * into attempt from public.recruitment_test_attempts where application_id=app.id;
  if attempt.id is null then insert into public.recruitment_test_attempts(application_id,candidate_id,expires_at) values(app.id,(select auth.uid()),now()+interval '60 minutes') returning * into attempt; end if;
  return jsonb_build_object('attempt_id',attempt.id,'expires_at',attempt.expires_at,'status',attempt.status,'answers',attempt.answers,'questions',(select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'category',q.category,'type',q.question_type,'prompt',q.prompt,'options',q.options,'points',q.points) order by q.position),'[]') from public.recruitment_test_questions q where q.active));
end $$;
create or replace function public.save_recruitment_test_answers(p_answers jsonb) returns void language plpgsql security definer set search_path=public as $$
begin update public.recruitment_test_attempts set answers=p_answers where candidate_id=(select auth.uid()) and status='in_progress' and expires_at>now(); if not found then raise exception 'Test expiré ou déjà terminé.'; end if; end $$;
create or replace function public.submit_recruitment_test() returns numeric language plpgsql security definer set search_path=public as $$
declare score numeric:=0; att public.recruitment_test_attempts;
begin
  select * into att from public.recruitment_test_attempts where candidate_id=(select auth.uid()) for update;
  if att.id is null or att.status<>'in_progress' then raise exception 'Aucun test actif.'; end if;
  select coalesce(sum(q.points),0) into score from public.recruitment_test_questions q where q.active and q.question_type='qcm' and att.answers->>q.id::text=q.correct_answer;
  update public.recruitment_test_attempts set automatic_score=score,submitted_at=now(),status=case when expires_at<now() then 'expired' else 'submitted' end where id=att.id;
  update public.recruitment_applications set status='test_completed' where id=att.application_id;
  insert into public.recruitment_history(application_id,actor_id,action,from_status,to_status) values(att.application_id,(select auth.uid()),'Test écrit terminé','invited_to_test','test_completed');
  return score;
end $$;

insert into public.recruitment_test_questions(category,question_type,prompt,options,correct_answer,points,position) values
('Nutrition générale','qcm','Quel macronutriment fournit principalement 4 kcal par gramme ?', '["Glucides","Lipides","Alcool","Eau"]','Glucides',1,1),
('Diabète','qcm','Quel indicateur reflète la glycémie moyenne des deux à trois derniers mois ?', '["IMC","HbA1c","Créatinine","Hémoglobine"]','HbA1c',1,2),
('Nutrition infantile','qcm','À quel âge recommande-t-on généralement de débuter la diversification alimentaire ?', '["2 mois","4 à 6 mois","9 mois","12 mois"]','4 à 6 mois',1,3),
('Éthique professionnelle','open','Comment réagiriez-vous face à une demande dépassant votre champ de compétence ?', null,null,3,4),
('Conseil nutritionnel','case_study','Un patient diabétique souhaite supprimer tous les féculents. Proposez une réponse éducative structurée.',null,null,5,5)
on conflict (prompt) do nothing;
