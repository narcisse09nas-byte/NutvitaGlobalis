-- Run after services-and-recruitment-adjustments.sql and recruitment-panels-general.sql.
-- Question bank tagged by job offer ("poste"), with a generator that builds a specific
-- exam (N QCM + N QCM-multiple + N cas pratique, etc.) for that job offer. Candidates
-- applying to a job offer with a generated exam get that exam; others fall back to the
-- legacy generic question pool (job_offer_id is null), preserving current behaviour.

alter table public.recruitment_test_questions add column if not exists job_offer_id uuid references public.recruitment_job_offers(id) on delete set null;
create index if not exists recruitment_test_questions_job_offer on public.recruitment_test_questions(job_offer_id, question_type, active);

create table if not exists public.recruitment_generated_exams (
  id uuid primary key default gen_random_uuid(),
  job_offer_id uuid not null references public.recruitment_job_offers(id) on delete cascade,
  title text not null default 'Epreuve generee',
  question_ids uuid[] not null default '{}',
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists recruitment_generated_exams_job_offer on public.recruitment_generated_exams(job_offer_id, active, created_at desc);

alter table public.recruitment_test_attempts add column if not exists question_ids uuid[];

alter table public.recruitment_generated_exams enable row level security;
drop policy if exists "Admins manage generated exams" on public.recruitment_generated_exams;
create policy "Admins manage generated exams" on public.recruitment_generated_exams for all to authenticated using(public.is_admin()) with check(public.is_admin());

create or replace function public.generate_recruitment_exam(
  p_job_offer_id uuid, p_title text, p_qcm_count integer, p_multi_qcm_count integer,
  p_case_study_count integer, p_open_count integer, p_file_upload_count integer
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_exam_id uuid; v_ids uuid[];
begin
  if not public.is_admin() then raise exception 'Acces refuse.'; end if;
  select array(select id from public.recruitment_test_questions where job_offer_id=p_job_offer_id and question_type='qcm' and active order by random() limit greatest(p_qcm_count,0))
    into v_ids;
  v_ids := v_ids || (select array(select id from public.recruitment_test_questions where job_offer_id=p_job_offer_id and question_type='multi_qcm' and active order by random() limit greatest(p_multi_qcm_count,0)));
  v_ids := v_ids || (select array(select id from public.recruitment_test_questions where job_offer_id=p_job_offer_id and question_type='case_study' and active order by random() limit greatest(p_case_study_count,0)));
  v_ids := v_ids || (select array(select id from public.recruitment_test_questions where job_offer_id=p_job_offer_id and question_type='open' and active order by random() limit greatest(p_open_count,0)));
  v_ids := v_ids || (select array(select id from public.recruitment_test_questions where job_offer_id=p_job_offer_id and question_type='file_upload' and active order by random() limit greatest(p_file_upload_count,0)));
  if array_length(v_ids,1) is null or array_length(v_ids,1)=0 then
    raise exception 'Aucune question disponible dans la banque pour ce poste et ces criteres.';
  end if;
  update public.recruitment_generated_exams set active=false where job_offer_id=p_job_offer_id and active=true;
  insert into public.recruitment_generated_exams(job_offer_id,title,question_ids,created_by)
  values(p_job_offer_id,coalesce(nullif(p_title,''),'Epreuve generee'),v_ids,(select auth.uid()))
  returning id into v_exam_id;
  return v_exam_id;
end $$;

create or replace function public.start_recruitment_test() returns jsonb language plpgsql security definer set search_path=public as $$
declare app public.recruitment_applications; attempt public.recruitment_test_attempts; existing_attempt public.recruitment_test_attempts; settings public.recruitment_test_settings; last_invitation timestamptz; exam public.recruitment_generated_exams; v_question_ids uuid[];
begin
  select * into app from public.recruitment_applications where candidate_id=(select auth.uid());
  if app.id is null or app.status <> 'invited_to_test' then raise exception 'Vous n etes pas invite a ce test.'; end if;
  select * into settings from public.recruitment_test_settings where id=1;
  if settings.active is false then raise exception 'Le test ecrit n est pas encore actif.'; end if;
  if settings.available_from is not null and now() < settings.available_from then raise exception 'La periode du test n est pas encore ouverte.'; end if;
  if settings.available_until is not null and now() > settings.available_until then raise exception 'La periode du test est terminee.'; end if;
  if app.job_offer_id is not null then
    select * into exam from public.recruitment_generated_exams where job_offer_id=app.job_offer_id and active=true order by created_at desc limit 1;
  end if;
  v_question_ids := exam.question_ids;
  select max(created_at) into last_invitation from public.recruitment_history where application_id=app.id and to_status='invited_to_test';
  select * into attempt from public.recruitment_test_attempts where application_id=app.id and status='in_progress' and expires_at>now();
  if attempt.id is null then
    select * into existing_attempt from public.recruitment_test_attempts where application_id=app.id;
    if existing_attempt.id is null then
      insert into public.recruitment_test_attempts(application_id,candidate_id,expires_at,question_ids)
      values(app.id,(select auth.uid()),now() + make_interval(mins => settings.duration_minutes),v_question_ids) returning * into attempt;
    elsif last_invitation is not null and last_invitation > coalesce(existing_attempt.submitted_at, existing_attempt.started_at) then
      update public.recruitment_test_attempts
      set started_at=now(),
          expires_at=now() + make_interval(mins => settings.duration_minutes),
          submitted_at=null,
          status='in_progress',
          answers='{}'::jsonb,
          automatic_score=0,
          manual_score=null,
          reviewer_comments=null,
          question_ids=v_question_ids
      where id=existing_attempt.id
      returning * into attempt;
    else
      raise exception 'Ce test est deja termine ou expire. Attendez une nouvelle invitation de l administration.';
    end if;
  end if;
  return jsonb_build_object(
    'attempt_id',attempt.id,
    'expires_at',attempt.expires_at,
    'status',attempt.status,
    'answers',attempt.answers,
    'settings',jsonb_build_object('title',settings.title,'instructions',settings.instructions,'duration_minutes',settings.duration_minutes,'camera_required',settings.camera_required,'available_until',settings.available_until),
    'questions',(
      select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'category',q.category,'type',q.question_type,'prompt',q.prompt,'options',q.options,'points',q.points,'allow_external_window',q.allow_external_window,'file_instructions',q.file_instructions,'max_files',q.max_files) order by q.position),'[]')
      from public.recruitment_test_questions q
      where q.active and (
        (attempt.question_ids is not null and q.id = any(attempt.question_ids))
        or (attempt.question_ids is null and q.job_offer_id is null)
      )
    )
  );
end $$;

create or replace function public.submit_recruitment_test() returns numeric language plpgsql security definer set search_path=public as $$
declare earned numeric:=0; total numeric:=0; score numeric:=0; att public.recruitment_test_attempts;
begin
  select * into att from public.recruitment_test_attempts where candidate_id=(select auth.uid()) for update;
  if att.id is null or att.status<>'in_progress' then raise exception 'Aucun test actif.'; end if;
  select coalesce(sum(q.points),0) into total
  from public.recruitment_test_questions q
  where q.active and q.question_type='qcm'
    and ((att.question_ids is not null and q.id = any(att.question_ids)) or (att.question_ids is null and q.job_offer_id is null));
  select coalesce(sum(q.points),0) into earned
  from public.recruitment_test_questions q
  where q.active
    and q.question_type='qcm'
    and ((att.question_ids is not null and q.id = any(att.question_ids)) or (att.question_ids is null and q.job_offer_id is null))
    and att.answers->>q.id::text=q.correct_answer;
  if total > 0 then
    score := round((earned / total) * 100, 2);
  end if;
  update public.recruitment_test_attempts set automatic_score=score,submitted_at=now(),status=case when expires_at<now() then 'expired' else 'submitted' end where id=att.id;
  update public.recruitment_applications set status='test_completed' where id=att.application_id;
  insert into public.recruitment_history(application_id,actor_id,action,from_status,to_status) values(att.application_id,(select auth.uid()),'Test ecrit termine','invited_to_test','test_completed');
  return score;
end $$;
