-- Lot 8 structural and security smoke tests. Run after migration 017 in a non-production transaction.
begin;
do $$ begin
 if to_regclass('public.academic_internships') is null or to_regclass('public.academic_internship_supervisions') is null then raise exception 'Internship registries are missing';end if;
 if to_regclass('public.academic_theses') is null or to_regclass('public.academic_thesis_milestones') is null then raise exception 'Thesis registries are missing';end if;
 if to_regclass('public.academic_defenses') is null or to_regclass('public.academic_practicum_documents') is null or to_regclass('public.academic_practicum_history') is null then raise exception 'Defense, document or history registry is missing';end if;
 if not exists(select 1 from pg_proc where proname='academic_transition_internship') or not exists(select 1 from pg_proc where proname='academic_transition_thesis') then raise exception 'Workflow functions are missing';end if;
 if not exists(select 1 from pg_proc where proname='academic_register_practicum_document') then raise exception 'Document versioning function is missing';end if;
 if not exists(select 1 from pg_proc where proname='academic_transition_thesis_milestone') or not exists(select 1 from pg_proc where proname='academic_schedule_defense') then raise exception 'Milestone or defense workflow function is missing';end if;
 if exists(select 1 from information_schema.role_routine_grants where routine_schema='public' and routine_name in('academic_transition_internship','academic_transition_thesis','academic_register_practicum_document','academic_update_internship_progress','academic_update_thesis_review','academic_transition_thesis_milestone','academic_schedule_defense') and grantee='PUBLIC') then raise exception 'Sensitive Lot 8 functions are executable by PUBLIC';end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='academic_internships') or not exists(select 1 from pg_policies where schemaname='public' and tablename='academic_theses') then raise exception 'Lot 8 RLS policies are missing';end if;
end $$;
rollback;