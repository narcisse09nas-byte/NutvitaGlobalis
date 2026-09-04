begin;
do $$ declare missing text; begin
 select string_agg(name,', ') into missing from (values('academic_programs'),('academic_program_versions'),('academic_years'),('academic_semesters'),('academic_teaching_units'),('academic_courses'),('academic_course_prerequisites'),('academic_rules')) expected(name) where to_regclass('public.'||name) is null;
 if missing is not null then raise exception 'Missing Lot 2 tables: %',missing; end if;
 if not exists(select 1 from pg_proc where proname='academic_clone_program_version') then raise exception 'Missing clone workflow'; end if;
 if not exists(select 1 from pg_proc where proname='academic_decide_program_version') then raise exception 'Missing approval workflow'; end if;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'academic_%' and c.relname in ('academic_programs','academic_program_versions','academic_years','academic_semesters','academic_teaching_units','academic_courses','academic_course_prerequisites','academic_rules') and not c.relrowsecurity) then raise exception 'RLS is not enabled on every Lot 2 registry'; end if;
 if (select count(*) from pg_policies where schemaname='public' and tablename in ('academic_programs','academic_program_versions','academic_years','academic_semesters','academic_teaching_units','academic_courses','academic_course_prerequisites','academic_rules'))<16 then raise exception 'Expected read and manage policies on every Lot 2 registry'; end if;
 if not exists(select 1 from public.academic_role_permissions where role='ACADEMIC_ADMIN' and permission_code='curriculum.approve') then raise exception 'Missing curriculum approval permission'; end if;
end $$;
rollback;