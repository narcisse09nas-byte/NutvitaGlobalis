begin;
do $$ declare missing text; begin
 select string_agg(name,', ') into missing from (values
  ('academic_instructors'),('academic_course_instructors'),('academic_course_spaces'),
  ('academic_course_modules'),('academic_course_lessons'),('academic_course_resources'),
  ('academic_lesson_progress'),('academic_class_sessions'),('academic_attendance_records')
 ) expected(name) where to_regclass('public.'||name) is null;
 if missing is not null then raise exception 'Missing Lot 5 tables: %',missing; end if;
 if not exists(select 1 from pg_proc where proname='academic_validate_teaching_assignment') then raise exception 'Missing teaching assignment validation'; end if;
 if not exists(select 1 from pg_proc where proname='academic_validate_course_space') then raise exception 'Missing course space validation'; end if;
 if not exists(select 1 from pg_proc where proname='academic_validate_class_session') then raise exception 'Missing class session validation'; end if;
 if not exists(select 1 from pg_proc where proname='academic_validate_lesson_progress') then raise exception 'Missing lesson progress validation'; end if;
 if not exists(select 1 from pg_proc where proname='academic_validate_attendance') then raise exception 'Missing attendance validation'; end if;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'academic_%' and c.relname in('academic_instructors','academic_course_instructors','academic_course_spaces','academic_course_modules','academic_course_lessons','academic_course_resources','academic_lesson_progress','academic_class_sessions','academic_attendance_records') and not c.relrowsecurity) then raise exception 'RLS is not enabled on every Lot 5 table'; end if;
 if (select count(*) from pg_policies where schemaname='public' and tablename in('academic_instructors','academic_course_instructors','academic_course_spaces','academic_course_modules','academic_course_lessons','academic_course_resources','academic_lesson_progress','academic_class_sessions','academic_attendance_records'))<18 then raise exception 'Lot 5 RLS policies are incomplete'; end if;
 if not exists(select 1 from storage.buckets where id='academic-course-resources' and public=false) then raise exception 'Private academic resources bucket is missing'; end if;
 if not exists(select 1 from public.academic_role_permissions where role='INSTRUCTOR' and permission_code='attendance.manage') then raise exception 'Missing instructor attendance permission'; end if;
end $$;
rollback;