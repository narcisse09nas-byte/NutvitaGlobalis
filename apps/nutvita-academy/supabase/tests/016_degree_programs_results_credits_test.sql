-- Lot 7 structural and deterministic smoke tests. Run after migration 016 in a non-production transaction.
begin;
do $$ begin
 if public.academic_grade_letter(92)<>'A+' or public.academic_grade_letter(50)<>'D' or public.academic_grade_letter(49.99)<>'F' then raise exception 'Grade letter boundaries are invalid';end if;
 if to_regclass('public.academic_course_results') is null or to_regclass('public.academic_teaching_unit_results') is null or to_regclass('public.academic_semester_results') is null then raise exception 'Result registries are missing';end if;
 if to_regclass('public.academic_resit_eligibility') is null or to_regclass('public.academic_credit_ledger') is null or to_regclass('public.academic_result_history') is null or to_regclass('public.academic_progression') is null or to_regclass('public.academic_credit_totals') is null then raise exception 'Resit, credit or history registry is missing';end if;
 if not exists(select 1 from pg_proc where proname='academic_calculate_student_semester_results') then raise exception 'Calculation function is missing';end if;
 if not exists(select 1 from pg_proc where proname='academic_transition_semester_result') then raise exception 'Workflow function is missing';end if;
 if exists(select 1 from information_schema.role_routine_grants where routine_schema='public' and routine_name in('academic_calculate_student_semester_results','academic_transition_semester_result') and grantee='PUBLIC') then raise exception 'Sensitive result functions are executable by PUBLIC';end if;
end $$;
rollback;