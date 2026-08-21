-- Sprint 16: Stakeholder register + Communication plan (spec sections 20-21).
-- Run after ppm-risks-issues.sql (reuses public.ppm_project_access).

create table if not exists public.ppm_stakeholders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  name text not null,
  organization text,
  role_title text,
  category text not null default 'internal' check(category in (
    'internal','external','donor','beneficiary','government','partner','community','other'
  )),
  influence_level text not null default 'medium' check(influence_level in ('low','medium','high')),
  interest_level text not null default 'medium' check(interest_level in ('low','medium','high')),
  position text not null default 'neutral' check(position in ('champion','supporter','neutral','critic','blocker')),
  contact_email text,
  contact_phone text,
  engagement_strategy text,
  notes text,
  status text not null default 'active' check(status in ('draft','active','on_hold','closed','cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Communication plan: qui recoit quoi, par quel canal, a quelle frequence (spec section 21).
create table if not exists public.ppm_communication_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  stakeholder_id uuid references public.ppm_stakeholders(id) on delete set null,
  audience text,
  topic text not null,
  message text,
  channel text not null default 'email' check(channel in ('email','meeting','report','sms','radio','phone','other')),
  frequency text,
  responsible_name text,
  next_date date,
  last_sent_date date,
  status text not null default 'planned' check(status in ('planned','sent','done','cancelled')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ppm_stakeholders_project on public.ppm_stakeholders(project_id);
create index if not exists ppm_communication_items_project on public.ppm_communication_items(project_id,status);

alter table public.ppm_stakeholders enable row level security;
alter table public.ppm_communication_items enable row level security;

drop policy if exists "PPM users read stakeholders" on public.ppm_stakeholders;
create policy "PPM users read stakeholders" on public.ppm_stakeholders for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage stakeholders" on public.ppm_stakeholders;
create policy "PPM managers manage stakeholders" on public.ppm_stakeholders for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));

drop policy if exists "PPM users read communication items" on public.ppm_communication_items;
create policy "PPM users read communication items" on public.ppm_communication_items for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage communication items" on public.ppm_communication_items;
create policy "PPM managers manage communication items" on public.ppm_communication_items for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));
