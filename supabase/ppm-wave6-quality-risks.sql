-- Refinement program, Wave 6: Quality Plan/Actual separation and a Risk monitoring register.
-- Run after ppm-procurement-quality.sql and ppm-results-governance.sql (risks).

-- Quality: the existing ppm_quality_requirements row mixed the recurring control PLAN
-- (control_method/frequency/responsible_name) with a single ACTUAL result (control_date/
-- result/checklist/score) — a requirement could only ever record one constat. Actuals move to
-- their own table, one row per time the planned control is actually performed.
create table if not exists public.ppm_quality_control_actuals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  quality_requirement_id uuid not null references public.ppm_quality_requirements(id) on delete cascade,
  control_date date,
  result text not null default 'pending' check(result in ('pending','conforme','non_conforme','non_applicable')),
  checklist jsonb not null default '[]'::jsonb,
  score integer,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists ppm_quality_control_actuals_requirement on public.ppm_quality_control_actuals(quality_requirement_id, created_at desc);

alter table public.ppm_quality_control_actuals enable row level security;
drop policy if exists "PPM users read quality actuals" on public.ppm_quality_control_actuals;
create policy "PPM users read quality actuals" on public.ppm_quality_control_actuals for select to authenticated using(public.ppm_project_access(project_id));
drop policy if exists "PPM managers manage quality actuals" on public.ppm_quality_control_actuals;
create policy "PPM managers manage quality actuals" on public.ppm_quality_control_actuals for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));

-- Risks: a periodic review register (item 35) — each review re-assesses probability/impact and
-- can close the risk, keeping full history instead of only the risk's current snapshot.
create table if not exists public.ppm_risk_reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  risk_id uuid not null references public.ppm_risks(id) on delete cascade,
  review_date date not null default current_date,
  reviewer_name text,
  probability integer not null check(probability between 1 and 5),
  impact integer not null check(impact between 1 and 5),
  status_after text not null check(status_after in ('open','monitoring','closed')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists ppm_risk_reviews_risk on public.ppm_risk_reviews(risk_id, created_at desc);

alter table public.ppm_risk_reviews enable row level security;
drop policy if exists "PPM users read risk reviews" on public.ppm_risk_reviews;
create policy "PPM users read risk reviews" on public.ppm_risk_reviews for select to authenticated using(public.ppm_project_access(project_id));
drop policy if exists "PPM managers manage risk reviews" on public.ppm_risk_reviews;
create policy "PPM managers manage risk reviews" on public.ppm_risk_reviews for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));
