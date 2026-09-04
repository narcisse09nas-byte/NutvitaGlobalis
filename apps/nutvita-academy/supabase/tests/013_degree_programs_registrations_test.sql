begin;
do $$ declare missing text; begin
 select string_agg(name,', ') into missing from (values('academic_administrative_registrations'),('academic_registration_fee_ledger'),('academic_course_enrollments')) expected(name) where to_regclass('public.'||name) is null;
 if missing is not null then raise exception 'Missing Lot 4 tables: %',missing; end if;
 if not exists(select 1 from pg_proc where proname='academic_transition_registration') then raise exception 'Missing registration workflow'; end if;
 if not exists(select 1 from pg_proc where proname='academic_enroll_courses') then raise exception 'Missing enrollment workflow'; end if;
 if not exists(select 1 from pg_proc where proname='academic_refresh_registration_finance') then raise exception 'Missing financial recalculation'; end if;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in('academic_administrative_registrations','academic_registration_fee_ledger','academic_course_enrollments') and not c.relrowsecurity) then raise exception 'RLS is not enabled on every Lot 4 register'; end if;
 if (select count(*) from pg_policies where schemaname='public' and tablename in('academic_administrative_registrations','academic_registration_fee_ledger','academic_course_enrollments'))<6 then raise exception 'Lot 4 RLS policies are incomplete'; end if;
 if not exists(select 1 from public.academic_role_permissions where role='ACADEMIC_SECRETARY' and permission_code='registration.validate') then raise exception 'Missing registration validation permission'; end if;
 if not exists(select 1 from public.academic_role_permissions where role='FINANCE_OFFICER' and permission_code='registration.finance') then raise exception 'Missing registration finance permission'; end if;
end $$;
rollback;