-- Run after child-growth-who-upgrade.sql.

create table if not exists public.child_growth_analyses (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  summary text not null, positives jsonb not null default '[]', attention_points jsonb not null default '[]',
  practical_advice jsonb not null default '[]', parent_advice jsonb not null default '[]',
  consultation_recommended boolean not null default false,
  model text not null default 'nvg-child-rules-v1', generated_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists public.child_growth_alerts (
  id uuid primary key default gen_random_uuid(), child_id uuid not null references public.children(id) on delete cascade,
  analysis_id uuid references public.child_growth_analyses(id) on delete set null,
  alert_type text not null, severity text not null check(severity in ('info','warning','critical')),
  title text not null, message text not null, email_sent_at timestamptz,
  acknowledged_at timestamptz, reviewed_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.child_growth_reports (
  id uuid primary key default gen_random_uuid(), child_id uuid not null references public.children(id) on delete cascade,
  analysis_id uuid references public.child_growth_analyses(id) on delete set null,
  period_start date not null, period_end date not null, title text not null, file_path text not null,
  generated_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create index if not exists child_growth_analysis_date on public.child_growth_analyses(child_id,created_at desc);
create index if not exists child_growth_alert_open on public.child_growth_alerts(child_id,acknowledged_at,created_at desc);
create index if not exists child_growth_report_date on public.child_growth_reports(child_id,created_at desc);
alter table public.child_growth_analyses enable row level security;
alter table public.child_growth_alerts enable row level security;
alter table public.child_growth_reports enable row level security;

create policy "Parents read child analyses" on public.child_growth_analyses for select to authenticated
using(exists(select 1 from public.children c where c.id=child_id and (c.parent_id=(select auth.uid()) or public.is_admin())));
create policy "Parents read child alerts" on public.child_growth_alerts for select to authenticated
using(exists(select 1 from public.children c where c.id=child_id and (c.parent_id=(select auth.uid()) or public.is_admin())));
create policy "Admins manage child alerts" on public.child_growth_alerts for all to authenticated
using(public.is_admin()) with check(public.is_admin());
create policy "Parents read child reports" on public.child_growth_reports for select to authenticated
using(exists(select 1 from public.children c where c.id=child_id and (c.parent_id=(select auth.uid()) or public.is_admin())));
create policy "Admins manage child analyses" on public.child_growth_analyses for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Admins manage child reports" on public.child_growth_reports for all to authenticated using(public.is_admin()) with check(public.is_admin());

insert into public.system_email_templates(id,name,subject,body_text) values
('child_growth_critical_alert','Alerte croissance enfant','Point d attention pour le suivi de {{child_name}}','Bonjour {{name}},\n\nUne mesure recente de {{child_name}} necessite une verification professionnelle : {{alert}}\n\nCette notification ne constitue pas un diagnostic. Consultez rapidement un professionnel de sante si l enfant presente un malaise, des oedemes, une perte de poids ou une aggravation.\n\n{{action_url}}\n\nEquipe NutVitaGlobalis')
on conflict(id) do update set name=excluded.name,subject=excluded.subject,body_text=excluded.body_text;
