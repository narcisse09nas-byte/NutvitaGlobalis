-- Run after contracts-nutrition.sql, health-analytics.sql and child-growth-advanced.sql.
-- Persists weekly lifestyle assessments and custom child-growth indicators.

alter table public.child_growth_measurements
  add column if not exists custom_values jsonb not null default '{}'::jsonb;

alter table public.child_growth_analyses
  add column if not exists professional_summary text,
  add column if not exists indicator_insights jsonb not null default '[]'::jsonb,
  add column if not exists parent_conclusion text,
  add column if not exists professional_conclusion text;

alter table public.ai_insights
  add column if not exists indicator_insights jsonb not null default '[]'::jsonb,
  add column if not exists public_conclusion text,
  add column if not exists professional_conclusion text;

create table if not exists public.health_lifestyle_assessments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.client_profiles(id) on delete cascade,
  assessment_date date not null default current_date,
  activity_level integer not null check(activity_level between 1 and 5),
  diet_level integer not null check(diet_level between 1 and 5),
  notes text,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(client_id, assessment_date)
);

create index if not exists health_lifestyle_client_date
  on public.health_lifestyle_assessments(client_id, assessment_date desc);

alter table public.health_lifestyle_assessments enable row level security;

drop policy if exists "Client lifestyle read" on public.health_lifestyle_assessments;
create policy "Client lifestyle read"
on public.health_lifestyle_assessments for select to authenticated
using(public.can_access_client(client_id));

drop policy if exists "Client lifestyle insert" on public.health_lifestyle_assessments;
create policy "Client lifestyle insert"
on public.health_lifestyle_assessments for insert to authenticated
with check(public.can_access_client(client_id));

drop policy if exists "Client lifestyle update" on public.health_lifestyle_assessments;
create policy "Client lifestyle update"
on public.health_lifestyle_assessments for update to authenticated
using(public.can_access_client(client_id))
with check(public.can_access_client(client_id));

drop policy if exists "Admins manage lifestyle assessments" on public.health_lifestyle_assessments;
create policy "Admins manage lifestyle assessments"
on public.health_lifestyle_assessments for all to authenticated
using(public.is_admin())
with check(public.is_admin());
