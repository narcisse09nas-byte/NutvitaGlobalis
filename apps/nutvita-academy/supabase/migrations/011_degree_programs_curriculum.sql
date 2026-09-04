-- Degree Programs - Lot 2: versioned programs and curriculum. Run after 010_degree_programs_foundation.sql.
do $$ begin create type public.academic_program_level as enum ('DUT','LICENCE_PRO','MASTER_PRO','OTHER'); exception when duplicate_object then null; end $$;
do $$ begin create type public.academic_version_status as enum ('DRAFT','SUBMITTED','APPROVED','REJECTED','RETIRED'); exception when duplicate_object then null; end $$;
do $$ begin create type public.academic_unit_type as enum ('CORE','SPECIALIZATION','ELECTIVE','INTERNSHIP','THESIS','PROJECT'); exception when duplicate_object then null; end $$;

create table if not exists public.academic_programs (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
 code citext not null, name_fr text not null, name_en text not null, level public.academic_program_level not null,
 degree_type text not null, description_fr text, description_en text, duration_years numeric(3,1) not null check(duration_years>0),
 duration_semesters smallint not null check(duration_semesters>0), total_credits numeric(7,2) not null check(total_credits>0),
 admission_requirements_fr text, admission_requirements_en text, language text not null default 'FR_EN' check(language in ('FR','EN','FR_EN')),
 status public.academic_record_status not null default 'DRAFT', department_id uuid references public.academic_departments(id) on delete restrict,
 coordinator_id uuid references public.profiles(id) on delete set null, accreditation_reference text,
 accreditation_start_date date, accreditation_end_date date, created_by uuid references public.profiles(id) on delete set null,
 updated_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,code), check(accreditation_end_date is null or accreditation_start_date is null or accreditation_end_date>=accreditation_start_date)
);
create table if not exists public.academic_program_versions (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
 program_id uuid not null references public.academic_programs(id) on delete restrict, version_number integer not null check(version_number>0),
 effective_from date not null, effective_to date, total_credits numeric(7,2) not null check(total_credits>0),
 status public.academic_version_status not null default 'DRAFT', approved_by uuid references public.profiles(id) on delete set null,
 approval_date timestamptz, notes_fr text, notes_en text, rejection_reason text, created_by uuid references public.profiles(id) on delete set null,
 updated_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(program_id,version_number), check(effective_to is null or effective_to>=effective_from),
 check((status='APPROVED' and approved_by is not null and approval_date is not null) or status<>'APPROVED')
);
create unique index if not exists academic_program_versions_one_approved_idx on public.academic_program_versions(program_id) where status='APPROVED' and effective_to is null;

create table if not exists public.academic_years (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
 label text not null, start_date date not null, end_date date not null, registration_open_date date, registration_close_date date,
 status public.academic_record_status not null default 'DRAFT', created_by uuid references public.profiles(id) on delete set null,
 updated_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,label), check(end_date>start_date), check(registration_close_date is null or registration_open_date is null or registration_close_date>=registration_open_date)
);
create table if not exists public.academic_semesters (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
 academic_year_id uuid not null references public.academic_years(id) on delete restrict, program_id uuid not null references public.academic_programs(id) on delete restrict,
 program_version_id uuid not null references public.academic_program_versions(id) on delete restrict, semester_number smallint not null check(semester_number>0),
 label_fr text not null, label_en text not null, start_date date not null, end_date date not null, registration_deadline date,
 exam_start_date date, exam_end_date date, resit_start_date date, resit_end_date date, status public.academic_record_status not null default 'DRAFT',
 created_by uuid references public.profiles(id) on delete set null, updated_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(academic_year_id,program_version_id,semester_number),
 check(end_date>=start_date), check(exam_end_date is null or exam_start_date is null or exam_end_date>=exam_start_date),
 check(resit_end_date is null or resit_start_date is null or resit_end_date>=resit_start_date)
);
create table if not exists public.academic_teaching_units (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
 program_version_id uuid not null references public.academic_program_versions(id) on delete restrict, code citext not null,
 name_fr text not null, name_en text not null, semester_number smallint not null check(semester_number>0), credits numeric(6,2) not null check(credits>0),
 coefficient numeric(6,2) not null default 1 check(coefficient>0), unit_type public.academic_unit_type not null default 'CORE',
 is_mandatory boolean not null default true, minimum_pass_mark numeric(5,2) not null default 10 check(minimum_pass_mark between 0 and 100),
 compensable boolean not null default true, status public.academic_record_status not null default 'DRAFT',
 created_by uuid references public.profiles(id) on delete set null, updated_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(program_version_id,code)
);
create table if not exists public.academic_courses (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
 teaching_unit_id uuid not null references public.academic_teaching_units(id) on delete restrict, code citext not null,
 name_fr text not null, name_en text not null, credits numeric(6,2) not null check(credits>=0), coefficient numeric(6,2) not null default 1 check(coefficient>0),
 hours_lecture numeric(7,2) not null default 0 check(hours_lecture>=0), hours_tutorial numeric(7,2) not null default 0 check(hours_tutorial>=0),
 hours_practical numeric(7,2) not null default 0 check(hours_practical>=0), hours_online numeric(7,2) not null default 0 check(hours_online>=0),
 minimum_pass_mark numeric(5,2) not null default 10 check(minimum_pass_mark between 0 and 100),
 continuous_assessment_weight numeric(5,2) not null default 40 check(continuous_assessment_weight between 0 and 100),
 final_exam_weight numeric(5,2) not null default 60 check(final_exam_weight between 0 and 100),
 resit_allowed boolean not null default true, attendance_required boolean not null default false,
 attendance_threshold numeric(5,2) check(attendance_threshold between 0 and 100), status public.academic_record_status not null default 'DRAFT',
 created_by uuid references public.profiles(id) on delete set null, updated_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(teaching_unit_id,code),
 check(continuous_assessment_weight+final_exam_weight=100), check(not attendance_required or attendance_threshold is not null)
);
create table if not exists public.academic_course_prerequisites (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
 course_id uuid not null references public.academic_courses(id) on delete cascade, prerequisite_course_id uuid not null references public.academic_courses(id) on delete restrict,
 minimum_grade numeric(5,2), mandatory boolean not null default true, created_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(), unique(course_id,prerequisite_course_id), check(course_id<>prerequisite_course_id)
);
create table if not exists public.academic_rules (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
 program_id uuid not null references public.academic_programs(id) on delete restrict,
 program_version_id uuid not null references public.academic_program_versions(id) on delete restrict,
 rule_type text not null, rule_code citext not null, description_fr text not null, description_en text not null,
 value_numeric numeric(12,4), value_text_fr text, value_text_en text, effective_from date not null, effective_to date,
 status public.academic_record_status not null default 'DRAFT', created_by uuid references public.profiles(id) on delete set null,
 updated_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(program_version_id,rule_code), check(value_numeric is not null or value_text_fr is not null or value_text_en is not null),
 check(effective_to is null or effective_to>=effective_from)
);

create index if not exists academic_programs_org_status_idx on public.academic_programs(organization_id,status,level);
create index if not exists academic_versions_program_idx on public.academic_program_versions(program_id,version_number desc);
create index if not exists academic_years_org_dates_idx on public.academic_years(organization_id,start_date desc);
create index if not exists academic_semesters_program_idx on public.academic_semesters(program_version_id,semester_number);
create index if not exists academic_units_version_idx on public.academic_teaching_units(program_version_id,semester_number);
create index if not exists academic_courses_unit_idx on public.academic_courses(teaching_unit_id,status);
create index if not exists academic_rules_version_idx on public.academic_rules(program_version_id,rule_type,status);

create or replace function public.academic_touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create or replace function public.academic_guard_approved_curriculum() returns trigger language plpgsql as $$ begin
 if old.status='APPROVED' then raise exception 'Approved curriculum records are immutable; create a new program version.'; end if; return new;
end $$;
create or replace function public.academic_audit_curriculum_change() returns trigger language plpgsql security definer set search_path=public as $$ begin
 insert into public.academic_audit_logs(organization_id,actor_user_id,entity_type,entity_id,action,old_value,new_value,reason)
 values(coalesce(new.organization_id,old.organization_id),auth.uid(),tg_table_name,coalesce(new.id,old.id),tg_op,
 case when tg_op='INSERT' then null else to_jsonb(old) end,case when tg_op='DELETE' then null else to_jsonb(new) end,
 coalesce(current_setting('app.academic_change_reason',true),'Curriculum registry change'));
 return coalesce(new,old); end $$;

do $$ declare t text; begin foreach t in array array['academic_programs','academic_program_versions','academic_years','academic_semesters','academic_teaching_units','academic_courses','academic_rules'] loop
 execute format('drop trigger if exists %I_touch on public.%I',t,t);
 execute format('create trigger %I_touch before update on public.%I for each row execute function public.academic_touch_updated_at()',t,t);
 execute format('drop trigger if exists %I_audit on public.%I',t,t);
 execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.academic_audit_curriculum_change()',t,t);
 end loop; end $$;
drop trigger if exists academic_program_versions_guard on public.academic_program_versions;
create trigger academic_program_versions_guard before update or delete on public.academic_program_versions for each row execute function public.academic_guard_approved_curriculum();

insert into public.academic_role_permissions(role,permission_code,description_fr,description_en) values
 ('PROGRAM_COORDINATOR','curriculum.read','Consulter le curriculum','Read curriculum'),
 ('PROGRAM_COORDINATOR','curriculum.manage','Construire les versions du curriculum','Manage curriculum versions'),
 ('ACADEMIC_SECRETARY','curriculum.read','Consulter les programmes et calendriers','Read programs and calendars'),('ACADEMIC_ADMIN','curriculum.read','Consulter le curriculum','Read curriculum'),
 ('ACADEMIC_ADMIN','curriculum.manage','Gerer le curriculum','Manage curriculum'),
 ('ACADEMIC_ADMIN','curriculum.approve','Approuver une version de curriculum','Approve curriculum versions'),
 ('SUPER_ADMIN','curriculum.read','Consulter tous les curriculums','Read all curricula'),
 ('SUPER_ADMIN','curriculum.manage','Gerer tous les curriculums','Manage all curricula'),
 ('SUPER_ADMIN','curriculum.approve','Approuver les versions de curriculum','Approve curriculum versions'),
 ('INSTRUCTOR','curriculum.read','Consulter les curriculums autorises','Read authorized curricula'),
 ('COURSE_COORDINATOR','curriculum.read','Consulter les curriculums autorises','Read authorized curricula'),
 ('UNIT_COORDINATOR','curriculum.read','Consulter les curriculums autorises','Read authorized curricula')
on conflict(role,permission_code) do update set description_fr=excluded.description_fr,description_en=excluded.description_en;

do $$ declare t text; begin foreach t in array array['academic_programs','academic_program_versions','academic_years','academic_semesters','academic_teaching_units','academic_courses','academic_course_prerequisites','academic_rules'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('drop policy if exists %I on public.%I','academic curriculum read',t);
 execute format('create policy %I on public.%I for select to authenticated using(public.academic_has_access(organization_id))','academic curriculum read',t);
 execute format('drop policy if exists %I on public.%I','academic curriculum manage',t);
 execute format('create policy %I on public.%I for all to authenticated using(public.academic_has_permission(organization_id,''curriculum.manage'')) with check(public.academic_has_permission(organization_id,''curriculum.manage''))','academic curriculum manage',t);
 end loop; end $$;

create or replace function public.academic_submit_program_version(p_version_id uuid,p_reason text) returns public.academic_program_versions language plpgsql security invoker as $$ declare v public.academic_program_versions; begin
 update public.academic_program_versions set status='SUBMITTED',updated_by=auth.uid() where id=p_version_id and status in ('DRAFT','REJECTED') returning * into v;
 if v.id is null then raise exception 'Only a draft or rejected version can be submitted.'; end if;
 insert into public.academic_audit_logs(organization_id,actor_user_id,entity_type,entity_id,action,reason) values(v.organization_id,auth.uid(),'academic_program_versions',v.id,'SUBMITTED',p_reason);
 return v; end $$;
create or replace function public.academic_decide_program_version(p_version_id uuid,p_approve boolean,p_reason text) returns public.academic_program_versions language plpgsql security invoker as $$ declare v public.academic_program_versions; begin
 select * into v from public.academic_program_versions where id=p_version_id for update;
 if v.id is null or not public.academic_has_permission(v.organization_id,'curriculum.approve') then raise exception 'Forbidden'; end if;
 if v.status<>'SUBMITTED' then raise exception 'Only a submitted version can be decided.'; end if;
 if p_approve then
  update public.academic_program_versions set effective_to=current_date-1,status='RETIRED',updated_by=auth.uid() where program_id=v.program_id and id<>v.id and status='APPROVED' and effective_to is null;
  update public.academic_program_versions set status='APPROVED',approved_by=auth.uid(),approval_date=now(),rejection_reason=null,updated_by=auth.uid() where id=v.id returning * into v;
 else
  update public.academic_program_versions set status='REJECTED',rejection_reason=p_reason,updated_by=auth.uid() where id=v.id returning * into v;
 end if;
 insert into public.academic_audit_logs(organization_id,actor_user_id,entity_type,entity_id,action,reason) values(v.organization_id,auth.uid(),'academic_program_versions',v.id,case when p_approve then 'APPROVED' else 'REJECTED' end,p_reason);
 return v; end $$;
grant execute on function public.academic_submit_program_version(uuid,text) to authenticated;
grant execute on function public.academic_decide_program_version(uuid,boolean,text) to authenticated;


-- An approved version and all of its curriculum children are immutable.
create or replace function public.academic_guard_approved_curriculum() returns trigger language plpgsql as $$ begin
 if old.status='APPROVED' and (tg_op='DELETE' or not (new.status='RETIRED' and new.effective_to is not null and public.academic_has_permission(old.organization_id,'curriculum.approve'))) then
  raise exception 'Approved curriculum records are immutable; create a new program version.';
 end if; return new; end $$;
create or replace function public.academic_guard_curriculum_child() returns trigger language plpgsql as $$ declare v_status public.academic_version_status; begin
 if tg_table_name='academic_courses' then select v.status into v_status from public.academic_teaching_units u join public.academic_program_versions v on v.id=u.program_version_id where u.id=coalesce(new.teaching_unit_id,old.teaching_unit_id);
 elsif tg_table_name='academic_course_prerequisites' then select v.status into v_status from public.academic_courses c join public.academic_teaching_units u on u.id=c.teaching_unit_id join public.academic_program_versions v on v.id=u.program_version_id where c.id=coalesce(new.course_id,old.course_id);
 else select status into v_status from public.academic_program_versions where id=coalesce(new.program_version_id,old.program_version_id); end if;
 if v_status='APPROVED' then raise exception 'Approved curriculum children are immutable; create a new program version.'; end if; return coalesce(new,old); end $$;
do $$ declare t text; begin foreach t in array array['academic_semesters','academic_teaching_units','academic_courses','academic_course_prerequisites','academic_rules'] loop
 execute format('drop trigger if exists %I_version_guard on public.%I',t,t);
 execute format('create trigger %I_version_guard before update or delete on public.%I for each row execute function public.academic_guard_curriculum_child()',t,t); end loop; end $$;

create or replace function public.academic_clone_program_version(p_program_id uuid,p_effective_from date,p_reason text)
returns public.academic_program_versions language plpgsql security invoker as $$ declare old_v public.academic_program_versions; new_v public.academic_program_versions; old_u record; new_u_id uuid; begin
 select * into old_v from public.academic_program_versions where program_id=p_program_id order by version_number desc limit 1;
 if old_v.id is null or not public.academic_has_permission(old_v.organization_id,'curriculum.manage') then raise exception 'Forbidden'; end if;
 insert into public.academic_program_versions(organization_id,program_id,version_number,effective_from,total_credits,status,notes_fr,notes_en,created_by,updated_by)
 values(old_v.organization_id,p_program_id,old_v.version_number+1,p_effective_from,old_v.total_credits,'DRAFT',p_reason,p_reason,auth.uid(),auth.uid()) returning * into new_v;
 for old_u in select * from public.academic_teaching_units where program_version_id=old_v.id loop
  insert into public.academic_teaching_units(organization_id,program_version_id,code,name_fr,name_en,semester_number,credits,coefficient,unit_type,is_mandatory,minimum_pass_mark,compensable,status,created_by,updated_by)
  values(old_u.organization_id,new_v.id,old_u.code,old_u.name_fr,old_u.name_en,old_u.semester_number,old_u.credits,old_u.coefficient,old_u.unit_type,old_u.is_mandatory,old_u.minimum_pass_mark,old_u.compensable,'DRAFT',auth.uid(),auth.uid()) returning id into new_u_id;
  insert into public.academic_courses(organization_id,teaching_unit_id,code,name_fr,name_en,credits,coefficient,hours_lecture,hours_tutorial,hours_practical,hours_online,minimum_pass_mark,continuous_assessment_weight,final_exam_weight,resit_allowed,attendance_required,attendance_threshold,status,created_by,updated_by)
  select organization_id,new_u_id,code,name_fr,name_en,credits,coefficient,hours_lecture,hours_tutorial,hours_practical,hours_online,minimum_pass_mark,continuous_assessment_weight,final_exam_weight,resit_allowed,attendance_required,attendance_threshold,'DRAFT',auth.uid(),auth.uid() from public.academic_courses where teaching_unit_id=old_u.id;
 end loop;
 insert into public.academic_rules(organization_id,program_id,program_version_id,rule_type,rule_code,description_fr,description_en,value_numeric,value_text_fr,value_text_en,effective_from,effective_to,status,created_by,updated_by)
 select organization_id,program_id,new_v.id,rule_type,rule_code,description_fr,description_en,value_numeric,value_text_fr,value_text_en,p_effective_from,null,'DRAFT',auth.uid(),auth.uid() from public.academic_rules where program_version_id=old_v.id;
 insert into public.academic_course_prerequisites(organization_id,course_id,prerequisite_course_id,minimum_grade,mandatory,created_by)
 select cp.organization_id,new_c.id,new_p.id,cp.minimum_grade,cp.mandatory,auth.uid() from public.academic_course_prerequisites cp
 join public.academic_courses old_c on old_c.id=cp.course_id join public.academic_teaching_units old_u1 on old_u1.id=old_c.teaching_unit_id
 join public.academic_courses old_p on old_p.id=cp.prerequisite_course_id join public.academic_teaching_units old_u2 on old_u2.id=old_p.teaching_unit_id
 join public.academic_teaching_units new_u1 on new_u1.program_version_id=new_v.id and new_u1.code=old_u1.code join public.academic_courses new_c on new_c.teaching_unit_id=new_u1.id and new_c.code=old_c.code
 join public.academic_teaching_units new_u2 on new_u2.program_version_id=new_v.id and new_u2.code=old_u2.code join public.academic_courses new_p on new_p.teaching_unit_id=new_u2.id and new_p.code=old_p.code
 where old_u1.program_version_id=old_v.id;
 return new_v; end $$;
grant execute on function public.academic_clone_program_version(uuid,date,text) to authenticated;
comment on table public.academic_program_versions is 'Immutable approved curriculum versions; new changes require a new version.';
comment on table public.academic_course_prerequisites is 'Normalized many-to-many prerequisites; no critical prerequisite list is stored as text or JSON.';
