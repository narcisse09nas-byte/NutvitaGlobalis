-- Degree Programs - Lot 5: instructors, teaching assignments, academic LMS, sessions and attendance. Run after 013.
do $$ begin create type public.academic_instructor_status as enum ('ACTIVE','INACTIVE','SUSPENDED','ARCHIVED'); exception when duplicate_object then null; end $$;
do $$ begin create type public.academic_teaching_role as enum ('LEAD','LECTURER','TUTOR','PRACTICAL_SUPERVISOR'); exception when duplicate_object then null; end $$;
do $$ begin create type public.academic_lms_status as enum ('DRAFT','PUBLISHED','ARCHIVED'); exception when duplicate_object then null; end $$;
do $$ begin create type public.academic_lesson_type as enum ('READING','VIDEO','AUDIO','LIVE','PRACTICAL','ASSIGNMENT','QUIZ','DISCUSSION'); exception when duplicate_object then null; end $$;
do $$ begin create type public.academic_session_type as enum ('LECTURE','TUTORIAL','PRACTICAL','ONLINE','SEMINAR','EXAM','DEFENSE'); exception when duplicate_object then null; end $$;
do $$ begin create type public.academic_attendance_status as enum ('PRESENT','ABSENT','EXCUSED','LATE'); exception when duplicate_object then null; end $$;

create table if not exists public.academic_instructors(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
 user_id uuid not null references public.profiles(id) on delete restrict, employee_or_partner_id text not null,
 academic_title text not null, specialty_fr text not null, specialty_en text not null,
 status public.academic_instructor_status not null default 'ACTIVE',
 created_by uuid references public.profiles(id) on delete set null, updated_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,user_id),unique(organization_id,employee_or_partner_id)
);
create table if not exists public.academic_course_instructors(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
 course_id uuid not null references public.academic_courses(id) on delete restrict, semester_id uuid not null references public.academic_semesters(id) on delete restrict,
 instructor_id uuid not null references public.academic_instructors(id) on delete restrict, role public.academic_teaching_role not null,
 hours_assigned numeric(7,2) not null default 0 check(hours_assigned>=0), status public.academic_record_status not null default 'ACTIVE',
 assigned_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(course_id,semester_id,instructor_id,role)
);
create table if not exists public.academic_course_spaces(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
 course_id uuid not null references public.academic_courses(id) on delete restrict, semester_id uuid not null references public.academic_semesters(id) on delete restrict,
 title_fr text not null, title_en text not null, welcome_fr text, welcome_en text,
 status public.academic_lms_status not null default 'DRAFT', published_at timestamptz,
 created_by uuid references public.profiles(id) on delete set null, updated_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(course_id,semester_id)
);
create table if not exists public.academic_course_modules(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
 course_space_id uuid not null references public.academic_course_spaces(id) on delete cascade,
 code citext not null, title_fr text not null, title_en text not null, description_fr text, description_en text,
 position integer not null default 1 check(position>0), status public.academic_lms_status not null default 'DRAFT',
 available_from timestamptz, available_until timestamptz, created_by uuid references public.profiles(id) on delete set null,
 updated_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(course_space_id,code),unique(course_space_id,position),check(available_until is null or available_from is null or available_until>=available_from)
);
create table if not exists public.academic_course_lessons(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
 module_id uuid not null references public.academic_course_modules(id) on delete cascade,
 code citext not null, title_fr text not null, title_en text not null, lesson_type public.academic_lesson_type not null,
 body_fr text, body_en text, external_url text, position integer not null default 1 check(position>0),
 duration_minutes integer not null default 0 check(duration_minutes>=0), required boolean not null default true,
 status public.academic_lms_status not null default 'DRAFT', created_by uuid references public.profiles(id) on delete set null,
 updated_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(module_id,code),unique(module_id,position)
);
create table if not exists public.academic_course_resources(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
 lesson_id uuid not null references public.academic_course_lessons(id) on delete cascade, resource_type text not null,
 title_fr text not null, title_en text not null, storage_bucket text, storage_path text, external_url text, mime_type text, file_size_bytes bigint check(file_size_bytes is null or file_size_bytes>=0),
 position integer not null default 1 check(position>0), downloadable boolean not null default true,
 created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(),
 check(storage_path is not null or external_url is not null),unique(lesson_id,position)
);
create table if not exists public.academic_lesson_progress(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
 lesson_id uuid not null references public.academic_course_lessons(id) on delete cascade, student_id uuid not null references public.academic_students(id) on delete cascade,
 course_enrollment_id uuid not null references public.academic_course_enrollments(id) on delete cascade,
 status text not null default 'NOT_STARTED' check(status in('NOT_STARTED','IN_PROGRESS','COMPLETED')),
 progress_percent integer not null default 0 check(progress_percent between 0 and 100), time_spent_seconds integer not null default 0 check(time_spent_seconds>=0),
 first_started_at timestamptz, last_visited_at timestamptz not null default now(), completed_at timestamptz,
 unique(lesson_id,student_id)
);
create table if not exists public.academic_class_sessions(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
 course_id uuid not null references public.academic_courses(id) on delete restrict, semester_id uuid not null references public.academic_semesters(id) on delete restrict,
 course_space_id uuid references public.academic_course_spaces(id) on delete set null, session_type public.academic_session_type not null,
 session_date date not null, start_time time not null, end_time time not null, room_or_link text not null,
 instructor_id uuid not null references public.academic_instructors(id) on delete restrict,
 status text not null default 'SCHEDULED' check(status in('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED')),
 topic_fr text, topic_en text, created_by uuid references public.profiles(id) on delete set null, updated_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),check(end_time>start_time)
);
create table if not exists public.academic_attendance_records(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
 session_id uuid not null references public.academic_class_sessions(id) on delete cascade,
 student_id uuid not null references public.academic_students(id) on delete restrict,
 course_enrollment_id uuid not null references public.academic_course_enrollments(id) on delete restrict,
 status public.academic_attendance_status not null, check_in_time timestamptz, comment text,
 recorded_by uuid not null references public.profiles(id) on delete restrict, recorded_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(session_id,student_id)
);

create index if not exists academic_instructors_org_idx on public.academic_instructors(organization_id,status);
create index if not exists academic_course_instructors_course_idx on public.academic_course_instructors(course_id,semester_id,status);
create index if not exists academic_course_spaces_course_idx on public.academic_course_spaces(course_id,semester_id,status);
create index if not exists academic_modules_space_idx on public.academic_course_modules(course_space_id,position);
create index if not exists academic_lessons_module_idx on public.academic_course_lessons(module_id,position);
create index if not exists academic_resources_lesson_idx on public.academic_course_resources(lesson_id,position);
create index if not exists academic_progress_student_idx on public.academic_lesson_progress(student_id,status,last_visited_at desc);
create index if not exists academic_sessions_course_idx on public.academic_class_sessions(course_id,semester_id,session_date,start_time);
create index if not exists academic_attendance_student_idx on public.academic_attendance_records(student_id,session_id,status);

create or replace function public.academic_is_course_instructor(p_course_id uuid,p_semester_id uuid default null) returns boolean language sql stable security definer set search_path=public as $$
 select public.academic_is_super_admin() or exists(select 1 from public.academic_course_instructors ci join public.academic_instructors i on i.id=ci.instructor_id where ci.course_id=p_course_id and(p_semester_id is null or ci.semester_id=p_semester_id) and ci.status='ACTIVE' and i.user_id=auth.uid() and i.status='ACTIVE') $$;
create or replace function public.academic_is_course_student(p_course_id uuid,p_semester_id uuid default null) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.academic_course_enrollments ce join public.academic_students s on s.id=ce.student_id where ce.course_id=p_course_id and(p_semester_id is null or ce.semester_id=p_semester_id) and ce.status='ACTIVE' and s.user_id=auth.uid()) $$;
grant execute on function public.academic_is_course_instructor(uuid,uuid) to authenticated;
grant execute on function public.academic_is_course_student(uuid,uuid) to authenticated;

create or replace function public.academic_validate_teaching_assignment() returns trigger language plpgsql as $$ declare c public.academic_courses; u public.academic_teaching_units; s public.academic_semesters; i public.academic_instructors; begin
 select * into c from public.academic_courses where id=new.course_id; select * into u from public.academic_teaching_units where id=c.teaching_unit_id; select * into s from public.academic_semesters where id=new.semester_id; select * into i from public.academic_instructors where id=new.instructor_id;
 if c.id is null or s.id is null or i.id is null then raise exception 'Course, semester or instructor not found'; end if;
 if u.program_version_id<>s.program_version_id or u.semester_number<>s.semester_number then raise exception 'Course does not belong to the selected semester'; end if;
 if i.organization_id<>new.organization_id or s.organization_id<>new.organization_id then raise exception 'Cross-organization assignment forbidden'; end if; return new; end $$;
drop trigger if exists academic_teaching_assignment_links on public.academic_course_instructors;
create trigger academic_teaching_assignment_links before insert or update on public.academic_course_instructors for each row execute function public.academic_validate_teaching_assignment();
create or replace function public.academic_validate_course_space() returns trigger language plpgsql as $$ declare c public.academic_courses; u public.academic_teaching_units; s public.academic_semesters; begin
 select * into c from public.academic_courses where id=new.course_id; select * into u from public.academic_teaching_units where id=c.teaching_unit_id; select * into s from public.academic_semesters where id=new.semester_id;
 if c.id is null or s.id is null or u.program_version_id<>s.program_version_id or u.semester_number<>s.semester_number then raise exception 'Course does not belong to the selected semester'; end if;
 if new.organization_id<>c.organization_id or new.organization_id<>s.organization_id then raise exception 'Cross-organization course space forbidden'; end if; return new; end $$;
drop trigger if exists academic_course_space_links on public.academic_course_spaces;
create trigger academic_course_space_links before insert or update on public.academic_course_spaces for each row execute function public.academic_validate_course_space();

create or replace function public.academic_validate_class_session() returns trigger language plpgsql as $$ declare ci public.academic_course_instructors; cs public.academic_course_spaces; begin
 select * into ci from public.academic_course_instructors where course_id=new.course_id and semester_id=new.semester_id and instructor_id=new.instructor_id and status='ACTIVE' limit 1;
 if ci.id is null then raise exception 'Instructor is not actively assigned to this course and semester'; end if;
 if new.course_space_id is not null then select * into cs from public.academic_course_spaces where id=new.course_space_id; if cs.id is null or cs.course_id<>new.course_id or cs.semester_id<>new.semester_id then raise exception 'Course space does not match the session'; end if; end if;
 if new.organization_id<>ci.organization_id then raise exception 'Cross-organization class session forbidden'; end if; return new; end $$;
drop trigger if exists academic_class_session_links on public.academic_class_sessions;
create trigger academic_class_session_links before insert or update on public.academic_class_sessions for each row execute function public.academic_validate_class_session();

create or replace function public.academic_validate_lesson_progress() returns trigger language plpgsql as $$ declare l public.academic_course_lessons; m public.academic_course_modules; cs public.academic_course_spaces; ce public.academic_course_enrollments; begin
 select * into l from public.academic_course_lessons where id=new.lesson_id; select * into m from public.academic_course_modules where id=l.module_id; select * into cs from public.academic_course_spaces where id=m.course_space_id; select * into ce from public.academic_course_enrollments where id=new.course_enrollment_id;
 if ce.id is null or ce.student_id<>new.student_id or ce.course_id<>cs.course_id or ce.semester_id<>cs.semester_id or ce.status<>'ACTIVE' then raise exception 'Lesson progress does not match an active course enrollment'; end if;
 if new.organization_id<>cs.organization_id then raise exception 'Cross-organization lesson progress forbidden'; end if;
 if new.status='COMPLETED' then new.progress_percent:=100; new.completed_at:=coalesce(new.completed_at,now()); elsif new.progress_percent=100 then new.status:='COMPLETED'; new.completed_at:=coalesce(new.completed_at,now()); end if;
 return new; end $$;
drop trigger if exists academic_lesson_progress_links on public.academic_lesson_progress;
create trigger academic_lesson_progress_links before insert or update on public.academic_lesson_progress for each row execute function public.academic_validate_lesson_progress();

create or replace function public.academic_validate_attendance() returns trigger language plpgsql as $$ declare cs public.academic_class_sessions; ce public.academic_course_enrollments; begin
 select * into cs from public.academic_class_sessions where id=new.session_id; select * into ce from public.academic_course_enrollments where id=new.course_enrollment_id;
 if cs.id is null or ce.id is null or ce.student_id<>new.student_id or ce.course_id<>cs.course_id or ce.semester_id<>cs.semester_id or ce.status<>'ACTIVE' then raise exception 'Attendance does not match an active course enrollment'; end if;
 if new.organization_id<>cs.organization_id then raise exception 'Cross-organization attendance forbidden'; end if; return new; end $$;
drop trigger if exists academic_attendance_links on public.academic_attendance_records;
create trigger academic_attendance_links before insert or update on public.academic_attendance_records for each row execute function public.academic_validate_attendance();

do $$ declare t text; begin foreach t in array array['academic_instructors','academic_course_instructors','academic_course_spaces','academic_course_modules','academic_course_lessons','academic_class_sessions','academic_attendance_records'] loop
 execute format('drop trigger if exists %I_touch on public.%I',t,t); execute format('create trigger %I_touch before update on public.%I for each row execute function public.academic_touch_updated_at()',t,t);
 execute format('drop trigger if exists %I_audit on public.%I',t,t); execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.academic_audit_curriculum_change()',t,t); end loop; end $$;
drop trigger if exists academic_resources_audit on public.academic_course_resources;
create trigger academic_resources_audit after insert or update or delete on public.academic_course_resources for each row execute function public.academic_audit_curriculum_change();

insert into public.academic_role_permissions(role,permission_code,description_fr,description_en) values
('STUDENT','learning.self','Acceder a ses cours et sa progression','Access own courses and progress'),
('INSTRUCTOR','teaching.read','Consulter ses enseignements','Read assigned teaching'),
('INSTRUCTOR','teaching.content','Gerer les contenus affectes','Manage assigned content'),
('INSTRUCTOR','attendance.manage','Gerer la presence des cours affectes','Manage attendance for assigned courses'),
('COURSE_COORDINATOR','teaching.read','Consulter les enseignements coordonnes','Read coordinated teaching'),
('COURSE_COORDINATOR','teaching.manage','Gerer les affectations et espaces de cours','Manage assignments and course spaces'),
('COURSE_COORDINATOR','attendance.manage','Gerer les presences des cours coordonnes','Manage coordinated course attendance'),
('PROGRAM_COORDINATOR','teaching.read','Consulter les enseignements du programme','Read program teaching'),
('PROGRAM_COORDINATOR','teaching.manage','Gerer les enseignements du programme','Manage program teaching'),
('PROGRAM_COORDINATOR','attendance.read','Consulter les presences du programme','Read program attendance'),
('PROGRAM_COORDINATOR','attendance.manage','Gerer les presences du programme','Manage program attendance'),
('ACADEMIC_SECRETARY','teaching.read','Consulter les cours et seances','Read courses and sessions'),
('ACADEMIC_SECRETARY','attendance.read','Consulter les presences','Read attendance'),
('ACADEMIC_ADMIN','teaching.read','Consulter tous les enseignements','Read all teaching'),
('ACADEMIC_ADMIN','teaching.manage','Gerer enseignants, affectations et contenus','Manage instructors, assignments and content'),
('ACADEMIC_ADMIN','attendance.read','Consulter toutes les presences','Read all attendance'),
('ACADEMIC_ADMIN','attendance.manage','Gerer toutes les presences','Manage all attendance'),
('SUPER_ADMIN','teaching.read','Consulter tous les enseignements','Read all teaching'),
('SUPER_ADMIN','teaching.manage','Gerer tous les enseignements','Manage all teaching'),
('SUPER_ADMIN','attendance.read','Consulter toutes les presences','Read all attendance'),
('SUPER_ADMIN','attendance.manage','Gerer toutes les presences','Manage all attendance')
on conflict(role,permission_code) do update set description_fr=excluded.description_fr,description_en=excluded.description_en;

do $$ declare t text; begin foreach t in array array['academic_instructors','academic_course_instructors','academic_course_spaces','academic_course_modules','academic_course_lessons','academic_course_resources','academic_lesson_progress','academic_class_sessions','academic_attendance_records'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;
drop policy if exists "instructors read" on public.academic_instructors;
create policy "instructors read" on public.academic_instructors for select to authenticated using(public.academic_has_access(organization_id));
drop policy if exists "instructors manage" on public.academic_instructors;
create policy "instructors manage" on public.academic_instructors for all to authenticated using(public.academic_has_permission(organization_id,'teaching.manage')) with check(public.academic_has_permission(organization_id,'teaching.manage'));
drop policy if exists "course instructors read" on public.academic_course_instructors;
create policy "course instructors read" on public.academic_course_instructors for select to authenticated using(public.academic_is_course_instructor(course_id,semester_id) or public.academic_is_course_student(course_id,semester_id) or public.academic_has_permission(organization_id,'teaching.read'));
drop policy if exists "course instructors manage" on public.academic_course_instructors;
create policy "course instructors manage" on public.academic_course_instructors for all to authenticated using(public.academic_has_permission(organization_id,'teaching.manage')) with check(public.academic_has_permission(organization_id,'teaching.manage'));
drop policy if exists "course spaces read" on public.academic_course_spaces;
create policy "course spaces read" on public.academic_course_spaces for select to authenticated using(public.academic_is_course_instructor(course_id,semester_id) or(public.academic_is_course_student(course_id,semester_id) and status='PUBLISHED') or public.academic_has_permission(organization_id,'teaching.read'));
drop policy if exists "course spaces manage" on public.academic_course_spaces;
create policy "course spaces manage" on public.academic_course_spaces for all to authenticated using(public.academic_is_course_instructor(course_id,semester_id) or public.academic_has_permission(organization_id,'teaching.manage')) with check(public.academic_is_course_instructor(course_id,semester_id) or public.academic_has_permission(organization_id,'teaching.manage'));

create or replace function public.academic_can_read_space(p_space_id uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.academic_course_spaces cs where cs.id=p_space_id and(public.academic_is_course_instructor(cs.course_id,cs.semester_id) or(public.academic_is_course_student(cs.course_id,cs.semester_id) and cs.status='PUBLISHED') or public.academic_has_permission(cs.organization_id,'teaching.read'))) $$;
create or replace function public.academic_can_manage_space(p_space_id uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.academic_course_spaces cs where cs.id=p_space_id and(public.academic_is_course_instructor(cs.course_id,cs.semester_id) or public.academic_has_permission(cs.organization_id,'teaching.manage'))) $$;
grant execute on function public.academic_can_read_space(uuid) to authenticated;
grant execute on function public.academic_can_manage_space(uuid) to authenticated;
drop policy if exists "modules read" on public.academic_course_modules;
create policy "modules read" on public.academic_course_modules for select to authenticated using(public.academic_can_read_space(course_space_id));
drop policy if exists "modules manage" on public.academic_course_modules;
create policy "modules manage" on public.academic_course_modules for all to authenticated using(public.academic_can_manage_space(course_space_id)) with check(public.academic_can_manage_space(course_space_id));
drop policy if exists "lessons read" on public.academic_course_lessons;
create policy "lessons read" on public.academic_course_lessons for select to authenticated using(exists(select 1 from public.academic_course_modules m where m.id=module_id and public.academic_can_read_space(m.course_space_id)));
drop policy if exists "lessons manage" on public.academic_course_lessons;
create policy "lessons manage" on public.academic_course_lessons for all to authenticated using(exists(select 1 from public.academic_course_modules m where m.id=module_id and public.academic_can_manage_space(m.course_space_id))) with check(exists(select 1 from public.academic_course_modules m where m.id=module_id and public.academic_can_manage_space(m.course_space_id)));
drop policy if exists "resources read" on public.academic_course_resources;
create policy "resources read" on public.academic_course_resources for select to authenticated using(exists(select 1 from public.academic_course_lessons l join public.academic_course_modules m on m.id=l.module_id where l.id=lesson_id and public.academic_can_read_space(m.course_space_id)));
drop policy if exists "resources manage" on public.academic_course_resources;
create policy "resources manage" on public.academic_course_resources for all to authenticated using(exists(select 1 from public.academic_course_lessons l join public.academic_course_modules m on m.id=l.module_id where l.id=lesson_id and public.academic_can_manage_space(m.course_space_id))) with check(exists(select 1 from public.academic_course_lessons l join public.academic_course_modules m on m.id=l.module_id where l.id=lesson_id and public.academic_can_manage_space(m.course_space_id)));
drop policy if exists "progress read" on public.academic_lesson_progress;
create policy "progress read" on public.academic_lesson_progress for select to authenticated using(exists(select 1 from public.academic_students s where s.id=student_id and s.user_id=auth.uid()) or public.academic_has_permission(organization_id,'teaching.read'));
drop policy if exists "progress self manage" on public.academic_lesson_progress;
create policy "progress self manage" on public.academic_lesson_progress for all to authenticated using(exists(select 1 from public.academic_students s where s.id=student_id and s.user_id=auth.uid())) with check(exists(select 1 from public.academic_students s where s.id=student_id and s.user_id=auth.uid()));
drop policy if exists "sessions read" on public.academic_class_sessions;
create policy "sessions read" on public.academic_class_sessions for select to authenticated using(public.academic_is_course_instructor(course_id,semester_id) or public.academic_is_course_student(course_id,semester_id) or public.academic_has_permission(organization_id,'teaching.read'));
drop policy if exists "sessions manage" on public.academic_class_sessions;
create policy "sessions manage" on public.academic_class_sessions for all to authenticated using(public.academic_is_course_instructor(course_id,semester_id) or public.academic_has_permission(organization_id,'teaching.manage')) with check(public.academic_is_course_instructor(course_id,semester_id) or public.academic_has_permission(organization_id,'teaching.manage'));
drop policy if exists "attendance read" on public.academic_attendance_records;
create policy "attendance read" on public.academic_attendance_records for select to authenticated using(exists(select 1 from public.academic_students s where s.id=student_id and s.user_id=auth.uid()) or exists(select 1 from public.academic_class_sessions cs where cs.id=session_id and(public.academic_is_course_instructor(cs.course_id,cs.semester_id) or public.academic_has_permission(cs.organization_id,'attendance.read'))));
drop policy if exists "attendance manage" on public.academic_attendance_records;
create policy "attendance manage" on public.academic_attendance_records for all to authenticated using(exists(select 1 from public.academic_class_sessions cs where cs.id=session_id and(public.academic_is_course_instructor(cs.course_id,cs.semester_id) or public.academic_has_permission(cs.organization_id,'attendance.manage')))) with check(recorded_by=auth.uid() and exists(select 1 from public.academic_class_sessions cs where cs.id=session_id and(public.academic_is_course_instructor(cs.course_id,cs.semester_id) or public.academic_has_permission(cs.organization_id,'attendance.manage'))));

insert into storage.buckets(id,name,public) values('academic-course-resources','academic-course-resources',false) on conflict(id) do nothing;
drop policy if exists "academic course resources read" on storage.objects;
create policy "academic course resources read" on storage.objects for select to authenticated using(bucket_id='academic-course-resources' and exists(select 1 from public.academic_course_spaces cs where (storage.foldername(name))[1]~'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' and cs.id=(storage.foldername(name))[1]::uuid and public.academic_can_read_space(cs.id)));
drop policy if exists "academic course resources upload" on storage.objects;
create policy "academic course resources upload" on storage.objects for insert to authenticated with check(bucket_id='academic-course-resources' and exists(select 1 from public.academic_course_spaces cs where (storage.foldername(name))[1]~'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' and cs.id=(storage.foldername(name))[1]::uuid and public.academic_can_manage_space(cs.id)));

comment on table public.academic_course_lessons is 'Normalized bilingual academic lessons; official content is not persisted as a JSON blob.';
comment on table public.academic_lesson_progress is 'Per-student, per-lesson progress linked to an active pedagogical enrollment.';
