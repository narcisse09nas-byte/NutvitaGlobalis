-- HGSF V3 structural/security smoke tests. Run after the three wave migrations.
begin;
do $$ begin
 if to_regclass('public.ppm_ops_daily_needs') is null then raise exception 'daily needs missing'; end if;
 if to_regclass('public.ppm_ops_stock_movements') is null then raise exception 'stock movements missing'; end if;
 if to_regclass('public.ppm_ops_daily_service_reports') is null then raise exception 'daily reports missing'; end if;
 if to_regclass('public.ppm_ops_goods_receipts') is null then raise exception 'receipts missing'; end if;
 if to_regclass('public.ppm_ops_three_way_matches') is null then raise exception 'three way match missing'; end if;
 if to_regclass('public.ppm_ops_supervision_visits') is null then raise exception 'supervision missing'; end if;
 if to_regclass('public.ppm_ops_corrective_actions') is null then raise exception 'action tracker missing'; end if;
 if to_regclass('public.ppm_ops_hgsf_performance') is null then raise exception 'dashboard view missing'; end if;
 if not exists(select 1 from pg_class where oid='public.ppm_ops_daily_needs'::regclass and relrowsecurity) then raise exception 'daily need RLS missing'; end if;
 if not exists(select 1 from pg_class where oid='public.ppm_ops_stock_movements'::regclass and relrowsecurity) then raise exception 'stock RLS missing'; end if;
 if not exists(select 1 from pg_class where oid='public.ppm_ops_daily_service_reports'::regclass and relrowsecurity) then raise exception 'daily report RLS missing'; end if;
 if exists(select 1 from information_schema.role_table_grants where table_schema='public'
  and table_name in ('ppm_ops_daily_needs','ppm_ops_stock_movements','ppm_ops_daily_service_reports','ppm_ops_goods_receipts','ppm_ops_three_way_matches','ppm_ops_payment_transactions','ppm_ops_supervision_visits','ppm_ops_corrective_actions','ppm_ops_documents','ppm_ops_alerts')
  and grantee='anon' and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'))
 then raise exception 'anonymous write grant found on a new HGSF table'; end if;
end $$;
rollback;
