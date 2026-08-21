-- Execution add-on, Phase A+B: Planned / Reported / Validated Actual architecture, applied
-- first to PDM activities. Achievement is the Reported/Validated-Actual counterpart to an
-- existing ppm_activities row. Run after ppm-notifications-approvals.sql / ppm-closure.sql
-- (reuses public.ppm_project_access).

alter table public.ppm_activities add column if not exists responsible_email text;

create table if not exists public.ppm_achievements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  activity_id uuid not null references public.ppm_activities(id) on delete cascade,
  code text,
  period_label text,
  achievement_date date,
  location text,
  title text not null,
  description text,
  achievement_type text check(achievement_type in (
    'training','sensitization','distribution','supervision','meeting','mission',
    'data_collection','service_delivery','construction','documentation','other'
  )),
  actual_start date,
  actual_end date,
  partners_involved text,
  progress_method text not null default 'manual' check(progress_method in ('quantitative','milestones','manual')),
  target_value numeric(14,2),
  previous_validated_cumulative numeric(14,2),
  period_achieved numeric(14,2),
  proposed_cumulative numeric(14,2),
  milestones_planned integer,
  milestones_completed integer,
  manual_progress_percent numeric(5,2),
  manual_justification text,
  progress_percent numeric(5,2),
  beneficiaries_period integer,
  beneficiaries_cumulative integer,
  beneficiaries_breakdown jsonb not null default '[]'::jsonb,
  indicator_id uuid references public.ppm_indicators(id) on delete set null,
  indicator_contribution numeric(14,2),
  indicator_contribution_note text,
  difficulty_encountered boolean not null default false,
  difficulty_category text check(difficulty_category in (
    'technical','logistics','financial','hr','procurement','security','partner','community','environment','weather','other'
  )),
  difficulty_description text,
  difficulty_severity text check(difficulty_severity in ('low','medium','high','critical')),
  difficulty_cause text,
  difficulty_impact text,
  variance_note text,
  corrective_action text,
  corrective_action_responsible text,
  corrective_action_deadline date,
  support_required text,
  linked_issue_id uuid references public.ppm_issues(id) on delete set null,
  linked_risk_id uuid references public.ppm_risks(id) on delete set null,
  next_steps text,
  next_steps_responsible text,
  next_steps_deadline date,
  next_steps_support text,
  management_decision_required boolean not null default false,
  management_decision_requested text,
  management_decision_authority text,
  management_decision_deadline date,
  -- Full lifecycle already modelled so Phase C (validation/review) needs no new migration;
  -- this phase's UI only exercises draft -> submitted (+ owner-side cancelled).
  status text not null default 'draft' check(status in (
    'draft','submitted','under_review','validated','returned','rejected','cancelled'
  )),
  submitted_at timestamptz,
  reviewed_by_name text,
  review_note text,
  reviewed_at timestamptz,
  validated_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ppm_achievement_evidence (
  id uuid primary key default gen_random_uuid(),
  achievement_id uuid not null references public.ppm_achievements(id) on delete cascade,
  title text not null,
  category text not null default 'document' check(category in (
    'report','photo','attendance_list','minutes','dataset','form','gps','video','document','url','other'
  )),
  file_path text,
  external_url text,
  evidence_date date,
  location text,
  description text,
  uploaded_by_name text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ppm_achievements_project on public.ppm_achievements(project_id,status);
create index if not exists ppm_achievements_activity on public.ppm_achievements(activity_id);
create index if not exists ppm_achievement_evidence_achievement on public.ppm_achievement_evidence(achievement_id);

alter table public.ppm_achievements enable row level security;
alter table public.ppm_achievement_evidence enable row level security;

drop policy if exists "PPM users read achievements" on public.ppm_achievements;
create policy "PPM users read achievements" on public.ppm_achievements for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM project members manage achievements" on public.ppm_achievements;
create policy "PPM project members manage achievements" on public.ppm_achievements for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));

drop policy if exists "PPM users read achievement evidence" on public.ppm_achievement_evidence;
create policy "PPM users read achievement evidence" on public.ppm_achievement_evidence for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM project members manage achievement evidence" on public.ppm_achievement_evidence;
create policy "PPM project members manage achievement evidence" on public.ppm_achievement_evidence for all to authenticated using(
  exists(select 1 from public.ppm_achievements a where a.id = achievement_id and public.ppm_project_access(a.project_id))
) with check(
  exists(select 1 from public.ppm_achievements a where a.id = achievement_id and public.ppm_project_access(a.project_id))
);
