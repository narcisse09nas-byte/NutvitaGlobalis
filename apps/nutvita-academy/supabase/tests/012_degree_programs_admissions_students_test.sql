begin;
do $$ declare missing text; begin
 select string_agg(name,', ') into missing from (values('academic_applications'),('academic_application_documents'),('academic_application_reviews'),('academic_students'),('academic_student_status_history')) expected(name) where to_regclass('public.'||name) is null;
 if missing is not null then raise exception 'Missing Lot 3 tables: %',missing; end if;
 if not exists(select 1 from pg_proc where proname='academic_transition_application') then raise exception 'Missing application workflow'; end if;
 if not exists(select 1 from pg_proc where proname='academic_materialize_student') then raise exception 'Missing student materialization workflow'; end if;
 if not exists(select 1 from pg_proc where proname='academic_transition_student') then raise exception 'Missing student status workflow'; end if;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in('academic_applications','academic_application_documents','academic_application_reviews','academic_students','academic_student_status_history') and not c.relrowsecurity) then raise exception 'RLS is not enabled on every Lot 3 register'; end if;
 if (select count(*) from pg_policies where schemaname='public' and tablename in('academic_applications','academic_application_documents','academic_application_reviews','academic_students','academic_student_status_history'))<10 then raise exception 'Lot 3 RLS policies are incomplete'; end if;
 if not exists(select 1 from public.academic_role_permissions where role='ACADEMIC_ADMIN' and permission_code='application.decide') then raise exception 'Missing admission decision permission'; end if;
 if not exists(select 1 from storage.buckets where id='academic-documents' and public=false) then raise exception 'Private academic document bucket is missing'; end if;
end $$;
rollback;