-- Affectation explicite des épreuves et paramètres propres à chaque session.
-- À exécuter après recruitment-question-bank.sql.

alter table public.recruitment_generated_exams add column if not exists duration_minutes integer not null default 60 check(duration_minutes between 5 and 480);
alter table public.recruitment_generated_exams add column if not exists available_from timestamptz;
alter table public.recruitment_generated_exams add column if not exists available_until timestamptz;
alter table public.recruitment_generated_exams add column if not exists camera_required boolean not null default false;
alter table public.recruitment_generated_exams add column if not exists invited_only boolean not null default true;
alter table public.recruitment_applications add column if not exists assigned_exam_id uuid references public.recruitment_generated_exams(id) on delete set null;
alter table public.recruitment_test_attempts add column if not exists generated_exam_id uuid references public.recruitment_generated_exams(id) on delete set null;

create or replace function public.start_recruitment_test()
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  app public.recruitment_applications;
  attempt public.recruitment_test_attempts;
  existing_attempt public.recruitment_test_attempts;
  settings public.recruitment_test_settings;
  last_invitation timestamptz;
  exam public.recruitment_generated_exams;
  v_question_ids uuid[];
  v_duration integer;
  v_open timestamptz;
  v_close timestamptz;
  v_camera boolean;
begin
  select * into app from public.recruitment_applications where candidate_id=auth.uid();
  if app.id is null or app.status <> 'invited_to_test' then raise exception 'Vous n êtes pas invité à ce test.'; end if;
  select * into settings from public.recruitment_test_settings where id=1;

  if app.assigned_exam_id is not null then
    select * into exam from public.recruitment_generated_exams where id=app.assigned_exam_id;
  elsif app.job_offer_id is not null then
    select * into exam from public.recruitment_generated_exams where job_offer_id=app.job_offer_id and active=true order by created_at desc limit 1;
  end if;

  v_question_ids:=exam.question_ids;
  v_duration:=coalesce(exam.duration_minutes,settings.duration_minutes,60);
  v_open:=coalesce(exam.available_from,settings.available_from);
  v_close:=coalesce(exam.available_until,settings.available_until);
  v_camera:=coalesce(exam.camera_required,settings.camera_required,false);
  if coalesce(exam.active,settings.active,false)=false then raise exception 'Le test écrit n est pas actif.'; end if;
  if v_open is not null and now()<v_open then raise exception 'La période du test n est pas encore ouverte.'; end if;
  if v_close is not null and now()>v_close then raise exception 'La période du test est terminée.'; end if;

  select max(created_at) into last_invitation from public.recruitment_history where application_id=app.id and to_status='invited_to_test';
  select * into attempt from public.recruitment_test_attempts where application_id=app.id and status='in_progress' and expires_at>now();
  if attempt.id is null then
    select * into existing_attempt from public.recruitment_test_attempts where application_id=app.id;
    if existing_attempt.id is null then
      insert into public.recruitment_test_attempts(application_id,candidate_id,expires_at,question_ids,generated_exam_id)
      values(app.id,auth.uid(),now()+make_interval(mins=>v_duration),v_question_ids,exam.id) returning * into attempt;
    elsif last_invitation is not null and last_invitation>coalesce(existing_attempt.submitted_at,existing_attempt.started_at) then
      update public.recruitment_test_attempts set started_at=now(),expires_at=now()+make_interval(mins=>v_duration),submitted_at=null,status='in_progress',answers='{}'::jsonb,automatic_score=0,manual_score=null,reviewer_comments=null,question_ids=v_question_ids,generated_exam_id=exam.id where id=existing_attempt.id returning * into attempt;
    else raise exception 'Ce test est déjà terminé ou expiré.';
    end if;
  end if;
  return jsonb_build_object(
    'attempt_id',attempt.id,'expires_at',attempt.expires_at,'status',attempt.status,'answers',attempt.answers,
    'settings',jsonb_build_object('title',coalesce(exam.title,settings.title),'instructions',settings.instructions,'duration_minutes',v_duration,'camera_required',v_camera,'available_until',v_close),
    'questions',(select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'category',q.category,'type',q.question_type,'prompt',q.prompt,'options',q.options,'points',q.points,'allow_external_window',q.allow_external_window,'file_instructions',q.file_instructions,'max_files',q.max_files) order by q.position),'[]') from public.recruitment_test_questions q where q.active and ((attempt.question_ids is not null and q.id=any(attempt.question_ids)) or (attempt.question_ids is null and q.job_offer_id is null)))
  );
end $$;
