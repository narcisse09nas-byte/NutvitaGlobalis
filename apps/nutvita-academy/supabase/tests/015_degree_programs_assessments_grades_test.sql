begin;
do $$ declare missing text; normalized numeric; begin
 select string_agg(name,', ') into missing from (values('academic_assessments'),('academic_assessment_attempts'),('academic_grades'),('academic_grade_history')) expected(name) where to_regclass('public.'||name) is null;
 if missing is not null then raise exception 'Missing Lot 6 tables: %',missing; end if;
 foreach missing in array array['academic_validate_assessment','academic_validate_attempt','academic_start_attempt','academic_submit_attempt','academic_validate_grade','academic_normalize_score','academic_save_draft_grades','academic_transition_grade','academic_transition_assessment_grades','academic_correct_grade','academic_transition_assessment'] loop
  if not exists(select 1 from pg_proc where proname=missing) then raise exception 'Missing Lot 6 function: %',missing; end if;
 end loop;
 select public.academic_normalize_score(15,20) into normalized;
 if normalized<>75.0000 then raise exception 'Deterministic normalization failed: expected 75, got %',normalized; end if;
 begin perform public.academic_normalize_score(21,20); raise exception 'Out-of-range score was accepted'; exception when others then if sqlerrm='Out-of-range score was accepted' then raise; end if; end;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in('academic_assessments','academic_assessment_attempts','academic_grades','academic_grade_history') and not c.relrowsecurity) then raise exception 'RLS is not enabled on every Lot 6 register'; end if;
 if (select count(*) from pg_policies where schemaname='public' and tablename in('academic_assessments','academic_assessment_attempts','academic_grades','academic_grade_history'))<10 then raise exception 'Lot 6 RLS policies are incomplete'; end if;
 if exists(select 1 from pg_policies where schemaname='public' and tablename in('academic_grades','academic_grade_history') and cmd='DELETE') then raise exception 'Official grades or their history must not be deletable'; end if;
 if not exists(select 1 from public.academic_role_permissions where role='STUDENT' and permission_code='assessment.self.read') then raise exception 'Missing student self-assessment permission'; end if;
 if not exists(select 1 from public.academic_role_permissions where role='ACADEMIC_ADMIN' and permission_code='grade.publish') then raise exception 'Missing grade publication permission'; end if;
 if not exists(select 1 from public.academic_role_permissions where role='ACADEMIC_ADMIN' and permission_code='grade.correct') then raise exception 'Missing authorized grade correction permission'; end if;
end $$;
rollback;