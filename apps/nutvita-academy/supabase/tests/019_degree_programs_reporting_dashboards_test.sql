-- Lot 10 structural and security smoke tests.
begin;
do $$ begin
 if to_regclass('public.academic_report_definitions')is null or to_regclass('public.academic_report_runs')is null or to_regclass('public.academic_report_metric_rows')is null then raise exception 'Reporting registries missing';end if;
 if to_regclass('public.academic_program_reporting_v')is null or to_regclass('public.academic_student_dashboard_v')is null then raise exception 'Dashboard views missing';end if;
 if not exists(select 1 from pg_proc where proname='academic_create_report_snapshot')then raise exception 'Snapshot function missing';end if;
 if exists(select 1 from information_schema.role_routine_grants where routine_schema='public'and routine_name='academic_create_report_snapshot'and grantee='PUBLIC')then raise exception 'Snapshot function executable by PUBLIC';end if;
 if not exists(select 1 from pg_policies where schemaname='public'and tablename='academic_report_runs')or not exists(select 1 from pg_policies where schemaname='public'and tablename='academic_report_metric_rows')then raise exception 'Reporting RLS missing';end if;
 if(select count(*)from information_schema.views where table_schema='public'and table_name in('academic_program_reporting_v','academic_student_dashboard_v')and is_updatable='YES')>0 then raise exception 'Reporting views unexpectedly updatable';end if;
end $$;
rollback;