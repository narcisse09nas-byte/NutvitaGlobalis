-- Degree Programs - Lot 6: academic assessments, attempts, grades, moderation and publication. Run after 014.
do $$ begin create type public.academic_assessment_type as enum ('QUIZ','ASSIGNMENT','PRACTICAL','MIDTERM','FINAL_EXAM','ORAL','PROJECT','CASE_STUDY','DEFENSE'); exception when duplicate_object then null; end $$;
do $$ begin create type public.academic_assessment_status as enum ('DRAFT','SCHEDULED','OPEN','CLOSED','CANCELLED','ARCHIVED'); exception when duplicate_object then null; end $$;
do $$ begin create type public.academic_attempt_status as enum ('NOT_STARTED','IN_PROGRESS','SUBMITTED','GRADED','INVALIDATED'); exception when duplicate_object then null; end $$;
do $$ begin create type public.academic_grade_status as enum ('DRAFT','SUBMITTED','MODERATED','APPROVED','PUBLISHED'); exception when duplicate_object then null; end $$;
create sequence if not exists public.academic_assessment_code_seq;

create table if not exists public.academic_assessments(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete restrict,
 assessment_code text not null unique,
 course_id uuid not null references public.academic_courses(id) on delete restrict,
 semester_id uuid not null references public.academic_semesters(id) on delete restrict,
 instructor_id uuid not null references public.academic_instructors(id) on delete restrict,
 parent_assessment_id uuid references public.academic_assessments(id) on delete restrict,
 assessment_type public.academic_assessment_type not null,
 title_fr text not null,
 title_en text not null,
 instructions_fr text,
 instructions_en text,
 assessment_date date not null,
 opens_at timestamptz,
 closes_at timestamptz,
 maximum_score numeric(8,2) not null check(maximum_score>0),
 weight numeric(5,2) not null check(weight>0 and weight<=100),
 is_mandatory boolean not null default true,
 is_resit boolean not null default false,
 allowed_attempts integer not null default 1 check(allowed_attempts between 1 and 20),
 duration_minutes integer check(duration_minutes is null or duration_minutes>0),
 delivery_mode text not null default 'IN_PERSON' check(delivery_mode in('IN_PERSON','ONLINE','HYBRID','TAKE_HOME')),
 proctoring_required boolean not null default false,
 external_assessment_ref text,
 status public.academic_assessment_status not null default 'DRAFT',
 created_by uuid not null references public.profiles(id) on delete restrict,
 updated_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(closes_at is null or opens_at is null or closes_at>opens_at),
 check((is_resit=false and parent_assessment_id is null) or is_resit=true)
);

create table if not exists public.academic_assessment_attempts(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete restrict,
 assessment_id uuid not null references public.academic_assessments(id) on delete restrict,
 course_enrollment_id uuid not null references public.academic_course_enrollments(id) on delete restrict,
 student_id uuid not null references public.academic_students(id) on delete restrict,
 attempt_number integer not null check(attempt_number>0),
 status public.academic_attempt_status not null default 'NOT_STARTED',
 started_at timestamptz,
 submitted_at timestamptz,
 submission_text text,
 submission_file_id text,
 external_attempt_ref text,
 proctoring_reference text,
 invalidation_reason text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(assessment_id,student_id,attempt_number)
);

create table if not exists public.academic_grades(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete restrict,
 assessment_id uuid not null references public.academic_assessments(id) on delete restrict,
 course_enrollment_id uuid not null references public.academic_course_enrollments(id) on delete restrict,
 student_id uuid not null references public.academic_students(id) on delete restrict,
 attempt_id uuid references public.academic_assessment_attempts(id) on delete restrict,
 raw_score numeric(8,2) not null,
 maximum_score numeric(8,2) not null check(maximum_score>0),
 normalized_score numeric(7,4) not null check(normalized_score between 0 and 100),
 status public.academic_grade_status not null default 'DRAFT',
 locked boolean not null default false,
 graded_by uuid not null references public.profiles(id) on delete restrict,
 graded_at timestamptz not null default now(),
 moderated_by uuid references public.profiles(id) on delete set null,
 moderated_at timestamptz,
 approved_by uuid references public.profiles(id) on delete set null,
 approved_at timestamptz,
 published_by uuid references public.profiles(id) on delete set null,
 published_at timestamptz,
 comment_fr text,
 comment_en text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(assessment_id,student_id),
 check(raw_score>=0 and raw_score<=maximum_score),
 check((status in('APPROVED','PUBLISHED') and locked=true) or status not in('APPROVED','PUBLISHED'))
);

create table if not exists public.academic_grade_history(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete restrict,
 grade_id uuid not null references public.academic_grades(id) on delete restrict,
 old_raw_score numeric(8,2),
 new_raw_score numeric(8,2),
 old_normalized_score numeric(7,4),
 new_normalized_score numeric(7,4),
 old_status public.academic_grade_status,
 new_status public.academic_grade_status,
 reason text not null,
 changed_by uuid not null references public.profiles(id) on delete restrict,
 changed_at timestamptz not null default now(),
 authorized_by uuid references public.profiles(id) on delete restrict
);

create index if not exists academic_assessments_course_idx on public.academic_assessments(course_id,semester_id,status,assessment_date);
create index if not exists academic_assessments_org_idx on public.academic_assessments(organization_id,status,created_at desc);
create index if not exists academic_attempts_student_idx on public.academic_assessment_attempts(student_id,assessment_id,status);
create index if not exists academic_attempts_assessment_idx on public.academic_assessment_attempts(assessment_id,status);
create index if not exists academic_grades_student_idx on public.academic_grades(student_id,status,assessment_id);
create index if not exists academic_grades_assessment_idx on public.academic_grades(assessment_id,status);
create index if not exists academic_grade_history_grade_idx on public.academic_grade_history(grade_id,changed_at desc);

create or replace function public.academic_set_assessment_code() returns trigger language plpgsql as $$ begin
 if new.assessment_code is null or btrim(new.assessment_code)='' then new.assessment_code='ASM-'||extract(year from new.assessment_date)::int||'-'||lpad(nextval('public.academic_assessment_code_seq')::text,6,'0'); end if; return new; end $$;
drop trigger if exists academic_assessment_code on public.academic_assessments;
create trigger academic_assessment_code before insert on public.academic_assessments for each row execute function public.academic_set_assessment_code();

create or replace function public.academic_validate_assessment() returns trigger language plpgsql as $$ declare ci public.academic_course_instructors; total_weight numeric; parent_row public.academic_assessments; begin
 select * into ci from public.academic_course_instructors where course_id=new.course_id and semester_id=new.semester_id and instructor_id=new.instructor_id and status='ACTIVE' limit 1;
 if ci.id is null then raise exception 'Instructor is not actively assigned to this course and semester'; end if;
 if new.organization_id<>ci.organization_id then raise exception 'Cross-organization assessment forbidden'; end if;
 if new.is_resit then
  if new.parent_assessment_id is null then raise exception 'A resit must reference its original assessment'; end if;
  select * into parent_row from public.academic_assessments where id=new.parent_assessment_id;
  if parent_row.id is null or parent_row.course_id<>new.course_id or parent_row.semester_id<>new.semester_id or parent_row.is_resit then raise exception 'Invalid original assessment for resit'; end if;
 else new.parent_assessment_id:=null; end if;
 select coalesce(sum(weight),0) into total_weight from public.academic_assessments where course_id=new.course_id and semester_id=new.semester_id and is_resit=new.is_resit and status not in('CANCELLED','ARCHIVED') and id<>new.id;
 if total_weight+new.weight>100 then raise exception 'Assessment weights exceed 100 percent for this course and semester'; end if;
 return new; end $$;
drop trigger if exists academic_assessment_links on public.academic_assessments;
create trigger academic_assessment_links before insert or update on public.academic_assessments for each row execute function public.academic_validate_assessment();

create or replace function public.academic_validate_attempt() returns trigger language plpgsql as $$ declare a public.academic_assessments; e public.academic_course_enrollments; bypass text; begin
 select * into a from public.academic_assessments where id=new.assessment_id; select * into e from public.academic_course_enrollments where id=new.course_enrollment_id;
 if a.id is null or e.id is null or e.student_id<>new.student_id or e.course_id<>a.course_id or e.semester_id<>a.semester_id or e.status<>'ACTIVE' then raise exception 'Attempt does not match an active course enrollment'; end if;
 if new.organization_id<>a.organization_id then raise exception 'Cross-organization attempt forbidden'; end if;
 if new.attempt_number>a.allowed_attempts then raise exception 'Attempt limit exceeded'; end if;
 if new.status='IN_PROGRESS' and a.status<>'OPEN' then raise exception 'Assessment is not open for a new attempt'; end if;
 if new.status='SUBMITTED' and a.status not in('OPEN','CLOSED') then raise exception 'Assessment does not accept submissions'; end if;
 return new; end $$;
create or replace function public.academic_start_attempt(p_assessment_id uuid)
returns public.academic_assessment_attempts language plpgsql security definer set search_path=public as $$ declare a public.academic_assessments; s public.academic_students; e public.academic_course_enrollments; n integer; result public.academic_assessment_attempts; begin
 select * into a from public.academic_assessments where id=p_assessment_id for update; if a.id is null then raise exception 'Assessment not found'; end if;
 if a.status<>'OPEN' or(a.opens_at is not null and now()<a.opens_at)or(a.closes_at is not null and now()>a.closes_at)then raise exception 'Assessment is not currently open'; end if;
 select * into s from public.academic_students where user_id=auth.uid() and organization_id=a.organization_id; if s.id is null then raise exception 'Student profile required'; end if;
 select * into e from public.academic_course_enrollments where student_id=s.id and course_id=a.course_id and semester_id=a.semester_id and status='ACTIVE'; if e.id is null then raise exception 'Active enrollment required'; end if;
 select coalesce(max(attempt_number),0)+1 into n from public.academic_assessment_attempts where assessment_id=a.id and student_id=s.id;
 if n>a.allowed_attempts then raise exception 'Attempt limit exceeded'; end if;
 insert into public.academic_assessment_attempts(organization_id,assessment_id,course_enrollment_id,student_id,attempt_number,status,started_at) values(a.organization_id,a.id,e.id,s.id,n,'IN_PROGRESS',now()) returning * into result; return result; end $$;

create or replace function public.academic_submit_attempt(p_attempt_id uuid,p_submission_text text,p_submission_file_id text,p_external_attempt_ref text,p_proctoring_reference text)
returns public.academic_assessment_attempts language plpgsql security definer set search_path=public as $$ declare at public.academic_assessment_attempts; s public.academic_students; result public.academic_assessment_attempts; begin
 select * into at from public.academic_assessment_attempts where id=p_attempt_id for update; if at.id is null then raise exception 'Attempt not found'; end if;
 select * into s from public.academic_students where id=at.student_id; if s.user_id<>auth.uid() then raise exception 'Attempt ownership required'; end if;
 if at.status<>'IN_PROGRESS' then raise exception 'Only an in-progress attempt can be submitted'; end if;
 update public.academic_assessment_attempts set status='SUBMITTED',submitted_at=now(),submission_text=p_submission_text,submission_file_id=p_submission_file_id,external_attempt_ref=p_external_attempt_ref,proctoring_reference=p_proctoring_reference,updated_at=now() where id=at.id returning * into result; return result; end $$;
revoke all on function public.academic_start_attempt(uuid) from public;
revoke all on function public.academic_submit_attempt(uuid,text,text,text,text) from public;
grant execute on function public.academic_start_attempt(uuid) to authenticated;
grant execute on function public.academic_submit_attempt(uuid,text,text,text,text) to authenticated;
drop trigger if exists academic_attempt_links on public.academic_assessment_attempts;
create trigger academic_attempt_links before insert or update on public.academic_assessment_attempts for each row execute function public.academic_validate_attempt();

create or replace function public.academic_normalize_score(p_raw_score numeric,p_maximum_score numeric) returns numeric language plpgsql immutable as $$ begin
 if p_maximum_score is null or p_maximum_score<=0 then raise exception 'Maximum score must be positive'; end if;
 if p_raw_score is null or p_raw_score<0 or p_raw_score>p_maximum_score then raise exception 'Raw score is outside the permitted range'; end if;
 return round((p_raw_score/p_maximum_score)*100,4); end $$;
revoke all on function public.academic_normalize_score(numeric,numeric) from public;
grant execute on function public.academic_normalize_score(numeric,numeric) to authenticated;
create or replace function public.academic_validate_grade() returns trigger language plpgsql as $$ declare a public.academic_assessments; e public.academic_course_enrollments; at public.academic_assessment_attempts; bypass text; begin
 select * into a from public.academic_assessments where id=new.assessment_id; select * into e from public.academic_course_enrollments where id=new.course_enrollment_id;
 if a.id is null or e.id is null or e.student_id<>new.student_id or e.course_id<>a.course_id or e.semester_id<>a.semester_id or e.status<>'ACTIVE' then raise exception 'Grade does not match an active course enrollment'; end if;
 if new.organization_id<>a.organization_id then raise exception 'Cross-organization grade forbidden'; end if;
 new.maximum_score:=a.maximum_score; new.normalized_score:=public.academic_normalize_score(new.raw_score,a.maximum_score);
 if new.raw_score<0 or new.raw_score>a.maximum_score then raise exception 'Score must be between zero and the assessment maximum'; end if;
 if new.attempt_id is not null then select * into at from public.academic_assessment_attempts where id=new.attempt_id; if at.id is null or at.assessment_id<>new.assessment_id or at.student_id<>new.student_id then raise exception 'Attempt does not match the grade'; end if; end if;
 if tg_op='UPDATE' then bypass:=current_setting('app.academic_grade_workflow',true); if (old.locked or old.status<>'DRAFT') and coalesce(bypass,'')<>'on' then raise exception 'Validated grades can only change through the authorized workflow'; end if; end if;
 return new; end $$;
drop trigger if exists academic_grade_validation on public.academic_grades;
create trigger academic_grade_validation before insert or update on public.academic_grades for each row execute function public.academic_validate_grade();

create or replace function public.academic_record_grade_history() returns trigger language plpgsql security definer set search_path=public as $$ declare why text; authorizer uuid; begin
 if old.raw_score is distinct from new.raw_score or old.normalized_score is distinct from new.normalized_score or old.status is distinct from new.status then
  why:=coalesce(nullif(current_setting('app.academic_grade_reason',true),''),'Draft grade update');
  begin authorizer:=nullif(current_setting('app.academic_grade_authorizer',true),'')::uuid; exception when others then authorizer:=null; end;
  insert into public.academic_grade_history(organization_id,grade_id,old_raw_score,new_raw_score,old_normalized_score,new_normalized_score,old_status,new_status,reason,changed_by,authorized_by)
  values(new.organization_id,new.id,old.raw_score,new.raw_score,old.normalized_score,new.normalized_score,old.status,new.status,why,auth.uid(),authorizer);
 end if; return new; end $$;
drop trigger if exists academic_grade_history_capture on public.academic_grades;
create trigger academic_grade_history_capture after update on public.academic_grades for each row execute function public.academic_record_grade_history();

create or replace function public.academic_has_course_permission(p_course_id uuid,p_permission text) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.academic_courses c join public.academic_teaching_units u on u.id=c.teaching_unit_id join public.academic_program_versions v on v.id=u.program_version_id where c.id=p_course_id and public.academic_has_program_scope(c.organization_id,v.program_id,p_permission)) $$;
grant execute on function public.academic_has_course_permission(uuid,text) to authenticated;
create or replace function public.academic_can_read_assessment(p_assessment_id uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.academic_assessments a where a.id=p_assessment_id and(
  public.academic_is_course_instructor(a.course_id,a.semester_id) or
  public.academic_has_course_permission(a.course_id,'assessment.read') or
  (a.status in('SCHEDULED','OPEN','CLOSED') and public.academic_is_course_student(a.course_id,a.semester_id))
 )) $$;
create or replace function public.academic_can_manage_assessment(p_assessment_id uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.academic_assessments a where a.id=p_assessment_id and(public.academic_is_course_instructor(a.course_id,a.semester_id) or public.academic_has_course_permission(a.course_id,'assessment.manage'))) $$;
grant execute on function public.academic_can_read_assessment(uuid) to authenticated;
grant execute on function public.academic_can_manage_assessment(uuid) to authenticated;

create or replace function public.academic_transition_grade(p_grade_id uuid,p_status public.academic_grade_status,p_reason text)
returns public.academic_grades language plpgsql security definer set search_path=public as $$ declare g public.academic_grades; a public.academic_assessments; allowed boolean:=false; permitted boolean:=false; begin
 if p_reason is null or length(btrim(p_reason))<3 then raise exception 'A reason is required'; end if;
 select * into g from public.academic_grades where id=p_grade_id for update; if g.id is null then raise exception 'Grade not found'; end if;
 select * into a from public.academic_assessments where id=g.assessment_id;
 allowed:=case when g.status='DRAFT' then p_status='SUBMITTED' when g.status='SUBMITTED' then p_status in('MODERATED','DRAFT') when g.status='MODERATED' then p_status in('APPROVED','SUBMITTED') when g.status='APPROVED' then p_status in('PUBLISHED','MODERATED') else false end;
 if not allowed then raise exception 'Invalid grade transition: % -> %',g.status,p_status; end if;
 permitted:=case when p_status in('SUBMITTED','DRAFT') then public.academic_is_course_instructor(a.course_id,a.semester_id) or public.academic_has_course_permission(a.course_id,'grade.enter')
  when p_status='MODERATED' then public.academic_has_course_permission(a.course_id,'grade.moderate')
  when p_status='APPROVED' then public.academic_has_course_permission(a.course_id,'grade.approve')
  when p_status='PUBLISHED' then public.academic_has_course_permission(a.course_id,'grade.publish') else false end;
 if not permitted then raise exception 'Permission denied for grade transition'; end if;
 perform set_config('app.academic_grade_workflow','on',true); perform set_config('app.academic_grade_reason',p_reason,true); perform set_config('app.academic_grade_authorizer',auth.uid()::text,true);
 update public.academic_grades set status=p_status,locked=p_status in('APPROVED','PUBLISHED'),
  moderated_by=case when p_status='MODERATED' then auth.uid() else moderated_by end,moderated_at=case when p_status='MODERATED' then now() else moderated_at end,
  approved_by=case when p_status='APPROVED' then auth.uid() else approved_by end,approved_at=case when p_status='APPROVED' then now() else approved_at end,
  published_by=case when p_status='PUBLISHED' then auth.uid() else published_by end,published_at=case when p_status='PUBLISHED' then now() else published_at end,
  updated_at=now() where id=g.id returning * into g; return g; end $$;

create or replace function public.academic_correct_grade(p_grade_id uuid,p_raw_score numeric,p_reason text)
returns public.academic_grades language plpgsql security definer set search_path=public as $$ declare g public.academic_grades; a public.academic_assessments; begin
 if p_reason is null or length(btrim(p_reason))<10 then raise exception 'A detailed correction reason of at least 10 characters is required'; end if;
 select * into g from public.academic_grades where id=p_grade_id for update; if g.id is null then raise exception 'Grade not found'; end if;
 select * into a from public.academic_assessments where id=g.assessment_id;
 if not public.academic_has_course_permission(a.course_id,'grade.correct') then raise exception 'Grade correction permission required'; end if;
 if g.status not in('APPROVED','PUBLISHED') then raise exception 'Authorized correction is reserved for approved or published grades'; end if;
 perform set_config('app.academic_grade_workflow','on',true); perform set_config('app.academic_grade_reason',p_reason,true); perform set_config('app.academic_grade_authorizer',auth.uid()::text,true);
 update public.academic_grades set raw_score=p_raw_score,status='SUBMITTED',locked=false,moderated_by=null,moderated_at=null,approved_by=null,approved_at=null,published_by=null,published_at=null,updated_at=now() where id=g.id returning * into g; return g; end $$;
grant execute on function public.academic_transition_grade(uuid,public.academic_grade_status,text) to authenticated;
create or replace function public.academic_transition_assessment_grades(p_assessment_id uuid,p_status public.academic_grade_status,p_reason text)
returns integer language plpgsql security definer set search_path=public as $$ declare g record; changed integer:=0; begin
 for g in select id from public.academic_grades where assessment_id=p_assessment_id order by id for update loop
  perform public.academic_transition_grade(g.id,p_status,p_reason); changed:=changed+1;
 end loop;
 if changed=0 then raise exception 'No grades found for this assessment'; end if; return changed; end $$;
revoke all on function public.academic_transition_assessment_grades(uuid,public.academic_grade_status,text) from public;
grant execute on function public.academic_transition_assessment_grades(uuid,public.academic_grade_status,text) to authenticated;
grant execute on function public.academic_correct_grade(uuid,numeric,text) to authenticated;
create or replace function public.academic_save_draft_grades(p_assessment_id uuid,p_enrollment_ids uuid[],p_scores numeric[],p_comments_fr text[],p_comments_en text[])
returns setof public.academic_grades language plpgsql security definer set search_path=public as $$ declare a public.academic_assessments; idx integer; e public.academic_course_enrollments; current_grade public.academic_grades; saved public.academic_grades; begin
 if cardinality(p_enrollment_ids)=0 or cardinality(p_enrollment_ids)<>cardinality(p_scores) then raise exception 'Enrollment and score arrays must have the same non-zero length'; end if;
 if coalesce(cardinality(p_comments_fr),0) not in(0,cardinality(p_scores)) or coalesce(cardinality(p_comments_en),0) not in(0,cardinality(p_scores)) then raise exception 'Comment arrays must be empty or match score count'; end if;
 select * into a from public.academic_assessments where id=p_assessment_id;
 if a.id is null then raise exception 'Assessment not found'; end if;
 if not(public.academic_is_course_instructor(a.course_id,a.semester_id) or public.academic_has_course_permission(a.course_id,'grade.enter')) then raise exception 'Grade entry permission required'; end if;
 for idx in 1..cardinality(p_enrollment_ids) loop
  select * into e from public.academic_course_enrollments where id=p_enrollment_ids[idx] and course_id=a.course_id and semester_id=a.semester_id and status='ACTIVE';
  if e.id is null then raise exception 'Enrollment % is not active for this assessment',p_enrollment_ids[idx]; end if;
  select * into current_grade from public.academic_grades where assessment_id=a.id and student_id=e.student_id for update;
  if current_grade.id is not null and current_grade.status<>'DRAFT' then raise exception 'Grade for student % is no longer a draft',e.student_id; end if;
  insert into public.academic_grades(organization_id,assessment_id,course_enrollment_id,student_id,raw_score,maximum_score,normalized_score,status,locked,graded_by,graded_at,comment_fr,comment_en)
  values(a.organization_id,a.id,e.id,e.student_id,p_scores[idx],a.maximum_score,0,'DRAFT',false,auth.uid(),now(),case when cardinality(p_comments_fr)>0 then p_comments_fr[idx] else null end,case when cardinality(p_comments_en)>0 then p_comments_en[idx] else null end)
  on conflict(assessment_id,student_id) do update set raw_score=excluded.raw_score,comment_fr=excluded.comment_fr,comment_en=excluded.comment_en,graded_by=auth.uid(),graded_at=now(),updated_at=now()
  returning * into saved; return next saved;
 end loop; return; end $$;
revoke all on function public.academic_save_draft_grades(uuid,uuid[],numeric[],text[],text[]) from public;
grant execute on function public.academic_save_draft_grades(uuid,uuid[],numeric[],text[],text[]) to authenticated;
create or replace function public.academic_transition_assessment(p_assessment_id uuid,p_status public.academic_assessment_status,p_reason text)
returns public.academic_assessments language plpgsql security definer set search_path=public as $$ declare a public.academic_assessments; allowed boolean:=false; begin
 if p_reason is null or length(btrim(p_reason))<3 then raise exception 'A reason is required'; end if;
 select * into a from public.academic_assessments where id=p_assessment_id for update; if a.id is null then raise exception 'Assessment not found'; end if;
 if not(public.academic_is_course_instructor(a.course_id,a.semester_id) or public.academic_has_course_permission(a.course_id,'assessment.manage')) then raise exception 'Assessment management permission required'; end if;
 allowed:=case when a.status='DRAFT' then p_status in('SCHEDULED','CANCELLED') when a.status='SCHEDULED' then p_status in('OPEN','CANCELLED','DRAFT') when a.status='OPEN' then p_status in('CLOSED','CANCELLED') when a.status='CLOSED' then p_status='ARCHIVED' else false end;
 if not allowed then raise exception 'Invalid assessment transition: % -> %',a.status,p_status; end if;
 update public.academic_assessments set status=p_status,updated_by=auth.uid(),updated_at=now() where id=a.id returning * into a;
 insert into public.academic_audit_logs(organization_id,actor_user_id,entity_type,entity_id,action,reason) values(a.organization_id,auth.uid(),'academic_assessments',a.id,'STATUS_'||p_status::text,p_reason);
 return a; end $$;
grant execute on function public.academic_transition_assessment(uuid,public.academic_assessment_status,text) to authenticated;

do $$ declare t text; begin foreach t in array array['academic_assessments','academic_assessment_attempts','academic_grades'] loop
 execute format('drop trigger if exists %I_touch on public.%I',t,t); execute format('create trigger %I_touch before update on public.%I for each row execute function public.academic_touch_updated_at()',t,t);
 execute format('drop trigger if exists %I_audit on public.%I',t,t); execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.academic_audit_curriculum_change()',t,t); end loop; end $$;
drop trigger if exists academic_grade_history_audit on public.academic_grade_history;
create trigger academic_grade_history_audit after insert on public.academic_grade_history for each row execute function public.academic_audit_curriculum_change();

insert into public.academic_role_permissions(role,permission_code,description_fr,description_en) values
('STUDENT','grade.self.read','Consulter ses notes publiees','Read own published grades'),
('STUDENT','assessment.self.read','Consulter ses evaluations planifiees','Read own scheduled assessments'),
('INSTRUCTOR','assessment.read','Consulter les evaluations affectees','Read assigned assessments'),
('INSTRUCTOR','grade.read','Consulter les notes des cours affectes','Read assigned course grades'),
('COURSE_COORDINATOR','assessment.read','Consulter les evaluations coordonnees','Read coordinated assessments'),
('COURSE_COORDINATOR','assessment.manage','Gerer les evaluations coordonnees','Manage coordinated assessments'),
('COURSE_COORDINATOR','grade.read','Consulter les notes coordonnees','Read coordinated grades'),
('COURSE_COORDINATOR','grade.enter','Saisir les notes coordonnees','Enter coordinated grades'),
('COURSE_COORDINATOR','grade.moderate','Moderer les notes','Moderate grades'),
('UNIT_COORDINATOR','assessment.read','Consulter les evaluations de UE','Read unit assessments'),
('UNIT_COORDINATOR','grade.read','Consulter les notes de UE','Read unit grades'),
('UNIT_COORDINATOR','grade.moderate','Moderer les notes de UE','Moderate unit grades'),
('PROGRAM_COORDINATOR','assessment.read','Consulter les evaluations du programme','Read program assessments'),
('PROGRAM_COORDINATOR','assessment.manage','Gerer les evaluations du programme','Manage program assessments'),
('PROGRAM_COORDINATOR','grade.read','Consulter les notes du programme','Read program grades'),
('PROGRAM_COORDINATOR','grade.moderate','Moderer les notes du programme','Moderate program grades'),
('PROGRAM_COORDINATOR','grade.approve','Approuver les notes du programme','Approve program grades'),
('ACADEMIC_SECRETARY','assessment.read','Consulter le calendrier des evaluations','Read assessment schedule'),
('ACADEMIC_SECRETARY','grade.read','Consulter les notes autorisees','Read authorized grades'),
('ACADEMIC_ADMIN','assessment.read','Consulter toutes les evaluations','Read all assessments'),
('ACADEMIC_ADMIN','assessment.manage','Gerer toutes les evaluations','Manage all assessments'),
('ACADEMIC_ADMIN','grade.read','Consulter toutes les notes','Read all grades'),
('ACADEMIC_ADMIN','grade.enter','Saisir les notes','Enter grades'),
('ACADEMIC_ADMIN','grade.moderate','Moderer les notes','Moderate grades'),
('ACADEMIC_ADMIN','grade.approve','Approuver les notes','Approve grades'),
('ACADEMIC_ADMIN','grade.publish','Publier les notes','Publish grades'),
('ACADEMIC_ADMIN','grade.correct','Corriger une note officielle avec historique','Correct an official grade with history'),
('SUPER_ADMIN','assessment.read','Consulter toutes les evaluations','Read all assessments'),
('SUPER_ADMIN','assessment.manage','Gerer toutes les evaluations','Manage all assessments'),
('SUPER_ADMIN','grade.read','Consulter toutes les notes','Read all grades'),
('SUPER_ADMIN','grade.enter','Saisir les notes','Enter grades'),
('SUPER_ADMIN','grade.moderate','Moderer les notes','Moderate grades'),
('SUPER_ADMIN','grade.approve','Approuver les notes','Approve grades'),
('SUPER_ADMIN','grade.publish','Publier les notes','Publish grades'),
('SUPER_ADMIN','grade.correct','Corriger une note officielle avec historique','Correct an official grade with history')
on conflict(role,permission_code) do update set description_fr=excluded.description_fr,description_en=excluded.description_en;

drop policy if exists "course instructors read enrolled students" on public.academic_course_enrollments;
create policy "course instructors read enrolled students" on public.academic_course_enrollments for select to authenticated using(public.academic_is_course_instructor(course_id,semester_id));
alter table public.academic_assessments enable row level security;
alter table public.academic_assessment_attempts enable row level security;
alter table public.academic_grades enable row level security;
alter table public.academic_grade_history enable row level security;

drop policy if exists "assessments read" on public.academic_assessments;
create policy "assessments read" on public.academic_assessments for select to authenticated using(public.academic_can_read_assessment(id));
drop policy if exists "assessments insert" on public.academic_assessments;
create policy "assessments insert" on public.academic_assessments for insert to authenticated with check(public.academic_is_course_instructor(course_id,semester_id) or public.academic_has_course_permission(course_id,'assessment.manage'));
drop policy if exists "assessments update" on public.academic_assessments;
create policy "assessments update" on public.academic_assessments for update to authenticated using(status='DRAFT' and(public.academic_is_course_instructor(course_id,semester_id) or public.academic_has_course_permission(course_id,'assessment.manage'))) with check(public.academic_is_course_instructor(course_id,semester_id) or public.academic_has_course_permission(course_id,'assessment.manage'));

drop policy if exists "attempts read" on public.academic_assessment_attempts;
create policy "attempts read" on public.academic_assessment_attempts for select to authenticated using(exists(select 1 from public.academic_students s where s.id=student_id and s.user_id=auth.uid()) or public.academic_can_manage_assessment(assessment_id));
drop policy if exists "attempts self insert" on public.academic_assessment_attempts;
create policy "attempts self insert" on public.academic_assessment_attempts for insert to authenticated with check(exists(select 1 from public.academic_students s where s.id=student_id and s.user_id=auth.uid()) and public.academic_can_read_assessment(assessment_id));
drop policy if exists "attempts self update" on public.academic_assessment_attempts;
create policy "attempts self update" on public.academic_assessment_attempts for update to authenticated using(exists(select 1 from public.academic_students s where s.id=student_id and s.user_id=auth.uid()) and status in('NOT_STARTED','IN_PROGRESS')) with check(exists(select 1 from public.academic_students s where s.id=student_id and s.user_id=auth.uid()));

drop policy if exists "grades read" on public.academic_grades;
create policy "grades read" on public.academic_grades for select to authenticated using(
 (status='PUBLISHED' and exists(select 1 from public.academic_students s where s.id=student_id and s.user_id=auth.uid()))
 or public.academic_can_manage_assessment(assessment_id)
 or public.academic_has_course_permission((select a.course_id from public.academic_assessments a where a.id=assessment_id),'grade.read')
);
drop policy if exists "grades insert" on public.academic_grades;
create policy "grades insert" on public.academic_grades for insert to authenticated with check(status='DRAFT' and graded_by=auth.uid() and(public.academic_can_manage_assessment(assessment_id) or public.academic_has_course_permission((select a.course_id from public.academic_assessments a where a.id=assessment_id),'grade.enter')));
drop policy if exists "grades update draft" on public.academic_grades;
create policy "grades update draft" on public.academic_grades for update to authenticated using(status='DRAFT' and(public.academic_can_manage_assessment(assessment_id) or public.academic_has_course_permission((select a.course_id from public.academic_assessments a where a.id=assessment_id),'grade.enter'))) with check(public.academic_can_manage_assessment(assessment_id) or public.academic_has_course_permission((select a.course_id from public.academic_assessments a where a.id=assessment_id),'grade.enter'));

drop policy if exists "grade history read" on public.academic_grade_history;
create policy "grade history read" on public.academic_grade_history for select to authenticated using(exists(select 1 from public.academic_grades g join public.academic_assessments a on a.id=g.assessment_id where g.id=academic_grade_history.grade_id and public.academic_has_course_permission(a.course_id,'grade.read')) or public.academic_has_permission(organization_id,'audit.read'));
drop policy if exists "grade history no direct writes" on public.academic_grade_history;

revoke all on function public.academic_record_grade_history() from public;
revoke all on function public.academic_has_course_permission(uuid,text) from public;
revoke all on function public.academic_can_read_assessment(uuid) from public;
revoke all on function public.academic_can_manage_assessment(uuid) from public;
revoke all on function public.academic_transition_grade(uuid,public.academic_grade_status,text) from public;
revoke all on function public.academic_correct_grade(uuid,numeric,text) from public;
revoke all on function public.academic_transition_assessment(uuid,public.academic_assessment_status,text) from public;comment on table public.academic_assessments is 'Normalized assessment registry; weights are validated per course, semester and regular/resit group.';
comment on table public.academic_grades is 'Official academic grades with deterministic normalization, workflow and locking.';
comment on table public.academic_grade_history is 'Immutable structured history for every score or status change.';