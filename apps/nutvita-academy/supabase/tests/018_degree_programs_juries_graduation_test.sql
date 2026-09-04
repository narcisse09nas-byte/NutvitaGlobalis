-- Lot 9 structural and security smoke tests.
begin;
do $$ begin
 if to_regclass('public.academic_juries') is null or to_regclass('public.academic_jury_members') is null or to_regclass('public.academic_jury_decisions') is null then raise exception 'Jury registries missing';end if;
 if to_regclass('public.academic_graduation_eligibility_checks') is null or to_regclass('public.academic_transcripts') is null or to_regclass('public.academic_degree_awards') is null or to_regclass('public.academic_documents') is null then raise exception 'Graduation registries missing';end if;
 if not exists(select 1 from pg_proc where proname='academic_evaluate_graduation_eligibility')or not exists(select 1 from pg_proc where proname='academic_approve_jury_decision')or not exists(select 1 from pg_proc where proname='academic_verify_official_document')then raise exception 'Lot 9 workflow functions missing';end if;
 if exists(select 1 from information_schema.role_routine_grants where routine_schema='public'and routine_name in('academic_approve_jury_decision','academic_issue_degree','academic_generate_transcript')and grantee='PUBLIC')then raise exception 'Sensitive Lot 9 function executable by PUBLIC';end if;
 if not exists(select 1 from pg_policies where schemaname='public'and tablename='academic_juries')or not exists(select 1 from pg_policies where schemaname='public'and tablename='academic_degree_awards')then raise exception 'Lot 9 RLS policies missing';end if;
end $$;
rollback;