-- HGSF V3 - Wave 3, lots 11-13. Additive/rerunnable.
create table if not exists public.ppm_ops_documents (
 id uuid primary key default gen_random_uuid(), operation_id uuid not null references public.ppm_ops_operations(id) on delete cascade,
 site_id uuid references public.ppm_ops_sites(id), entity_type text not null, entity_id text not null,
 document_type text not null, file_path text not null, file_name text not null, mime_type text, file_size bigint,
 status text not null default 'active' check(status in ('active','archived')),
 uploaded_by uuid references auth.users(id) on delete set null, uploaded_at timestamptz not null default now()
);
create index if not exists ppm_ops_documents_entity_idx on public.ppm_ops_documents(entity_type,entity_id);
create table if not exists public.ppm_ops_alerts (
 id uuid primary key default gen_random_uuid(), operation_id uuid not null references public.ppm_ops_operations(id) on delete cascade,
 site_id uuid references public.ppm_ops_sites(id), alert_type text not null, severity text not null check(severity in ('info','warning','critical')),
 entity_type text, entity_id text, title_fr text not null, title_en text not null, body_fr text, body_en text,
 status text not null default 'open' check(status in ('open','acknowledged','resolved','dismissed')),
 assigned_to uuid references auth.users(id) on delete set null, due_at timestamptz, created_at timestamptz not null default now(), resolved_at timestamptz
);
create index if not exists ppm_ops_alerts_inbox_idx on public.ppm_ops_alerts(operation_id,assigned_to,status,due_at);
create or replace view public.ppm_ops_hgsf_performance with (security_invoker=true) as
select o.id operation_id,
 count(distinct s.id) filter(where s.status='active') active_sites,
 coalesce(sum(r.target_children) filter(where r.status in ('validated','locked')),0) target_children,
 coalesce(sum(r.present_children) filter(where r.status in ('validated','locked')),0) present_children,
 coalesce(sum(r.served_children) filter(where r.status in ('validated','locked')),0) served_children,
 coalesce(sum(r.meals_served) filter(where r.status in ('validated','locked')),0) meals_served,
 count(distinct r.id) filter(where r.status in ('validated','locked')) validated_reports
from public.ppm_ops_operations o left join public.ppm_ops_sites s on s.operation_id=o.id
left join public.ppm_ops_daily_service_reports r on r.operation_id=o.id and r.site_id=s.id
where o.is_sf_hgsf=true group by o.id;
create or replace view public.ppm_ops_my_tasks with (security_invoker=true) as
select a.id::text task_id,a.operation_id,a.site_id,'corrective_action'::text task_type,a.title,a.status,a.due_date::timestamptz due_at,a.responsible_user_id assigned_to
from public.ppm_ops_corrective_actions a where a.status not in ('closed','cancelled')
union all
select x.id::text,x.operation_id,x.site_id,'alert',x.title_fr,x.status,x.due_at,x.assigned_to from public.ppm_ops_alerts x where x.status='open';

alter table public.ppm_ops_documents enable row level security;
alter table public.ppm_ops_alerts enable row level security;
grant select,insert,update on public.ppm_ops_documents,public.ppm_ops_alerts to authenticated;
revoke insert,update,delete,truncate,references,trigger on public.ppm_ops_documents,public.ppm_ops_alerts from anon;
grant select on public.ppm_ops_hgsf_performance,public.ppm_ops_my_tasks to authenticated;
drop policy if exists hgsf_scoped_documents on public.ppm_ops_documents;
create policy hgsf_scoped_documents on public.ppm_ops_documents for all to authenticated using(public.ppm_ops_hgsf_access(operation_id,site_id)) with check(public.ppm_ops_hgsf_access(operation_id,site_id));
drop policy if exists hgsf_scoped_alerts on public.ppm_ops_alerts;
create policy hgsf_scoped_alerts on public.ppm_ops_alerts for all to authenticated using(public.ppm_ops_hgsf_access(operation_id,site_id)) with check(public.ppm_ops_hgsf_access(operation_id,site_id));
