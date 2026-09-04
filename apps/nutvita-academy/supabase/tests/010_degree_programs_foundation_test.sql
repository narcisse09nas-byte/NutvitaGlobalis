-- Non-destructive structural assertions for Degree Programs Lot 1.
do $$
declare missing text;
begin
  select string_agg(name,', ') into missing from (values
    ('academic_departments'),('academic_campuses'),('academic_role_assignments'),
    ('academic_role_permissions'),('academic_module_settings'),('academic_audit_logs'),
    ('academic_registry_exports')) expected(name)
  where to_regclass('public.'||name) is null;
  if missing is not null then raise exception 'Missing academic tables: %',missing; end if;
  if to_regprocedure('public.academic_has_access(uuid)') is null then raise exception 'academic_has_access is missing'; end if;
  if to_regprocedure('public.academic_has_permission(uuid,text)') is null then raise exception 'academic_has_permission is missing'; end if;
  if (select count(*) from public.academic_role_permissions where role='SUPER_ADMIN')<5 then raise exception 'SUPER_ADMIN permission seed is incomplete'; end if;
  if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'academic_%' and c.relkind='r' and not c.relrowsecurity) then raise exception 'At least one academic table has RLS disabled'; end if;
  if (select count(*) from pg_policies where schemaname='public' and tablename like 'academic_%')<10 then raise exception 'Academic RLS policy set is incomplete'; end if;
end $$;
select 'Degree Programs Lot 1 structural checks passed' as result;