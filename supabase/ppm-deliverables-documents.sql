-- Sprint 18: Deliverables + Document management (spec sections 24-25).
-- Run after ppm-meal.sql (reuses public.ppm_project_access).

create table if not exists public.ppm_deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  work_package_id uuid references public.ppm_wbs_nodes(id) on delete set null,
  activity_id uuid references public.ppm_activities(id) on delete set null,
  title text not null,
  description text,
  type text not null default 'product' check(type in ('report','product','infrastructure','training','service','other')),
  responsible_name text,
  planned_date date,
  actual_date date,
  acceptance_status text not null default 'pending' check(acceptance_status in ('pending','submitted','accepted','rejected')),
  accepted_by_name text,
  accepted_at timestamptz,
  file_path text,
  version integer not null default 1,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Central document register (spec section 25): every file lives in the private
-- "document-vault" storage bucket (already used by contracts/signatures), `file_path` stores
-- the object path and a signed URL is minted on demand — never a public URL.
create table if not exists public.ppm_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  deliverable_id uuid references public.ppm_deliverables(id) on delete set null,
  title text not null,
  category text not null default 'other' check(category in (
    'contract','report','technical','administrative','communication','financial','other'
  )),
  description text,
  version integer not null default 1,
  file_path text,
  confidentiality text not null default 'internal' check(confidentiality in ('public','internal','confidential')),
  status text not null default 'draft' check(status in ('draft','final','archived')),
  uploaded_by_name text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ppm_deliverables_project on public.ppm_deliverables(project_id,acceptance_status);
create index if not exists ppm_documents_project on public.ppm_documents(project_id,category);

alter table public.ppm_deliverables enable row level security;
alter table public.ppm_documents enable row level security;

drop policy if exists "PPM users read deliverables" on public.ppm_deliverables;
create policy "PPM users read deliverables" on public.ppm_deliverables for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage deliverables" on public.ppm_deliverables;
create policy "PPM managers manage deliverables" on public.ppm_deliverables for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));

drop policy if exists "PPM users read documents" on public.ppm_documents;
create policy "PPM users read documents" on public.ppm_documents for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage documents" on public.ppm_documents;
create policy "PPM managers manage documents" on public.ppm_documents for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));
