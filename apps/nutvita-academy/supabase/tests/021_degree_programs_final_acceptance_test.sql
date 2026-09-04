-- Final cross-module acceptance checks. Run after migration 020.
begin;
do $$declare missing text;begin
 select string_agg(x,', ')into missing from unnest(array['academic_programs','academic_students','academic_administrative_registrations','academic_course_enrollments','academic_assessments','academic_grades','academic_course_results','academic_credit_ledger','academic_internships','academic_theses','academic_juries','academic_degree_awards','academic_report_runs','academic_student_financial_accounts','academic_competencies','academic_portfolio_items'])x where to_regclass('public.'||x)is null;
 if missing is not null then raise exception 'Missing final registries: %',missing;end if;
 if exists(select 1 from information_schema.role_routine_grants where routine_schema='public'and routine_name in('academic_approve_jury_decision','academic_issue_degree','academic_create_report_snapshot','academic_seed_degree_demo')and grantee='PUBLIC')then raise exception 'Sensitive function executable by PUBLIC';end if;
 if(select count(*)from pg_tables where schemaname='public'and tablename like'academic_%'and rowsecurity=false)>0 then raise exception 'One or more academic tables have RLS disabled';end if;
end$$;
rollback;