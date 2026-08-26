-- NutVitaGlobalis health reporting engine v2. Run after health-analytics.sql and client-care-workspaces.sql.
-- Idempotent and non-destructive: existing reports, insights and goals remain readable.

create table if not exists public.health_report_references (
 id text primary key, organization text not null, guideline text not null, version text not null, year integer,
 population text[] not null default '{}', indicator_id text not null, rule jsonb not null default '{}'::jsonb,
 summary_fr text not null, summary_en text not null, valid_from date not null, valid_to date, active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.health_report_rules (
 id text primary key, indicator_id text not null, rule_type text not null, version text not null,
 configuration jsonb not null default '{}'::jsonb, reference_id text references public.health_report_references(id),
 active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.health_report_goal_cycles (
 id uuid primary key default gen_random_uuid(), client_id uuid not null references public.client_profiles(id) on delete cascade,
 report_id uuid references public.health_reports(id) on delete set null, cycle_start date not null, cycle_end date,
 status text not null default 'open' check(status in ('open','closed','cancelled')), created_by uuid references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.health_report_goal_evaluations (
 id uuid primary key default gen_random_uuid(), cycle_id uuid not null references public.health_report_goal_cycles(id) on delete cascade,
 goal_id uuid not null references public.client_care_goals(id) on delete cascade,
 status text not null check(status in ('todo','in_progress','achieved','partially_achieved','not_achieved','postponed','not_assessed')),
 evidence jsonb not null default '{}'::jsonb, evaluated_at timestamptz, evaluated_by uuid references auth.users(id), notes text,
 created_at timestamptz not null default now(), unique(cycle_id,goal_id)
);
create table if not exists public.health_report_traces (
 id uuid primary key default gen_random_uuid(), report_id uuid not null references public.health_reports(id) on delete cascade,
 client_id uuid not null references public.client_profiles(id) on delete cascade, indicator_id text not null,
 conclusion text not null, source_values jsonb not null default '[]'::jsonb, source_dates jsonb not null default '[]'::jsonb,
 reference_id text references public.health_report_references(id), rule_id text, calculation text not null,
 confidence_level text not null check(confidence_level in ('high','moderate','low','insufficient')),
 created_at timestamptz not null default now()
);

alter table public.health_reports add column if not exists report_type text not null default 'professional';
alter table public.health_reports add column if not exists engine_version text;
alter table public.health_reports add column if not exists data_quality text;
alter table public.health_reports add column if not exists profile_type text;
alter table public.health_reports add column if not exists validation_status text not null default 'legacy';
alter table public.health_reports add column if not exists source_snapshot jsonb not null default '{}'::jsonb;
alter table public.health_reports add column if not exists language text not null default 'fr';
alter table public.ai_insights add column if not exists engine_version text;
alter table public.ai_insights add column if not exists deterministic_model jsonb not null default '{}'::jsonb;
alter table public.client_care_goals add column if not exists indicator_id text;
alter table public.client_care_goals add column if not exists priority text not null default 'normal';
alter table public.client_care_goals add column if not exists responsible_party text;
alter table public.client_care_goals add column if not exists baseline_value numeric;
alter table public.client_care_goals add column if not exists report_cycle_id uuid references public.health_report_goal_cycles(id) on delete set null;

insert into public.health_report_references(id,organization,guideline,version,year,population,indicator_id,rule,summary_fr,summary_en,valid_from)
values
 ('bmi-adult-screening-v1','NutVitaGlobalis','Adult BMI screening categories','1.0',2026,array['adult','pregnancy','general'],'anthropometry.bmi','{"context_required":true}'::jsonb,'Catégories de dépistage adulte; interprétation contextuelle requise.','Adult screening categories; contextual interpretation required.','2026-01-01'),
 ('wellness-score-v2','NutVitaGlobalis','Wellness questionnaire scoring','2.0',2026,array['adult','adolescent','child','pregnancy','general'],'questionnaire.nutrition','{"minimum":0,"maximum":4}'::jsonb,'Score catégoriel NutVita de 0 à 4.','NutVita categorical score from 0 to 4.','2026-01-01'),
 ('blood-pressure-config-v1','NutVitaGlobalis','Configured blood-pressure vigilance rules','1.0',2026,array['adult','pregnancy','general'],'cardiovascular.blood_pressure','{"single_measurement_is_not_diagnostic":true}'::jsonb,'Seuils de vigilance configurés; une mesure isolée ne constitue pas un diagnostic.','Configured vigilance thresholds; one measurement is not diagnostic.','2026-01-01')
on conflict(id) do update set organization=excluded.organization,guideline=excluded.guideline,version=excluded.version,year=excluded.year,population=excluded.population,indicator_id=excluded.indicator_id,rule=excluded.rule,summary_fr=excluded.summary_fr,summary_en=excluded.summary_en,valid_from=excluded.valid_from,active=true;

create index if not exists health_report_traces_report on public.health_report_traces(report_id,indicator_id);
create index if not exists health_report_goal_cycles_client on public.health_report_goal_cycles(client_id,cycle_start desc);
create index if not exists health_report_goal_evaluations_cycle on public.health_report_goal_evaluations(cycle_id,status);
alter table public.health_report_references enable row level security;
alter table public.health_report_rules enable row level security;
alter table public.health_report_goal_cycles enable row level security;
alter table public.health_report_goal_evaluations enable row level security;
alter table public.health_report_traces enable row level security;

drop policy if exists "Authenticated read active health references" on public.health_report_references;
create policy "Authenticated read active health references" on public.health_report_references for select to authenticated using(active=true or public.is_admin());
drop policy if exists "Admins manage health references" on public.health_report_references;
create policy "Admins manage health references" on public.health_report_references for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "Authenticated read active health rules" on public.health_report_rules;
create policy "Authenticated read active health rules" on public.health_report_rules for select to authenticated using(active=true or public.is_admin());
drop policy if exists "Admins manage health rules" on public.health_report_rules;
create policy "Admins manage health rules" on public.health_report_rules for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "Health participants read goal cycles" on public.health_report_goal_cycles;
create policy "Health participants read goal cycles" on public.health_report_goal_cycles for select to authenticated using(public.can_access_client(client_id));
drop policy if exists "Health participants manage goal cycles" on public.health_report_goal_cycles;
create policy "Health participants manage goal cycles" on public.health_report_goal_cycles for all to authenticated using(public.can_access_client(client_id)) with check(public.can_access_client(client_id));
drop policy if exists "Health participants read goal evaluations" on public.health_report_goal_evaluations;
create policy "Health participants read goal evaluations" on public.health_report_goal_evaluations for select to authenticated using(exists(select 1 from public.health_report_goal_cycles c where c.id=cycle_id and public.can_access_client(c.client_id)));
drop policy if exists "Health participants manage goal evaluations" on public.health_report_goal_evaluations;
create policy "Health participants manage goal evaluations" on public.health_report_goal_evaluations for all to authenticated using(exists(select 1 from public.health_report_goal_cycles c where c.id=cycle_id and public.can_access_client(c.client_id))) with check(exists(select 1 from public.health_report_goal_cycles c where c.id=cycle_id and public.can_access_client(c.client_id)));
drop policy if exists "Health participants read traces" on public.health_report_traces;
create policy "Health participants read traces" on public.health_report_traces for select to authenticated using(public.can_access_client(client_id));
drop policy if exists "Admins manage health traces" on public.health_report_traces;
create policy "Admins manage health traces" on public.health_report_traces for all to authenticated using(public.is_admin()) with check(public.is_admin());