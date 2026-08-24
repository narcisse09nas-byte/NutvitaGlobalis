-- Refinement program, Wave 8: External approver registry, registry codes for Actions and
-- External Approval requests, a category field on Deliverables, and Handover/Archiving registers.
-- Run after ppm-notifications-approvals.sql, ppm-action-tracker.sql and ppm-deliverables-documents.sql.

-- Item 43: a real directory of people outside the project who approve deliverables — feeds the
-- approver dropdown on ppm_approval_requests and the "accepted by" dropdown on deliverables.
create table if not exists public.ppm_external_approvers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  name text not null,
  email text not null,
  organization text,
  role_title text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists ppm_external_approvers_project on public.ppm_external_approvers(project_id);

alter table public.ppm_external_approvers enable row level security;
drop policy if exists "PPM users read external approvers" on public.ppm_external_approvers;
create policy "PPM users read external approvers" on public.ppm_external_approvers for select to authenticated using(public.ppm_project_access(project_id));
drop policy if exists "PPM managers manage external approvers" on public.ppm_external_approvers;
create policy "PPM managers manage external approvers" on public.ppm_external_approvers for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));

-- Item 44/45: registry codes (lib/ppm/ids.ts domains "external_approval" and "action").
alter table public.ppm_approval_requests add column if not exists code text;
create unique index if not exists ppm_approval_requests_code_unique on public.ppm_approval_requests(project_id, code) where code is not null;
alter table public.ppm_actions add column if not exists code text;
create unique index if not exists ppm_actions_code_unique on public.ppm_actions(project_id, code) where code is not null;

-- Item 46: deliverables get a category, set at creation, so the reporting dropdown can filter by
-- category before title instead of listing every deliverable.
alter table public.ppm_deliverables add column if not exists category text;

-- Item 47: a document's "livrable associe" becomes multi-select, filtered by the document's own
-- Work Package — deliverable_id (single) is superseded by deliverable_ids (array), left in place
-- for old rows since dropping a column is destructive and not requested.
alter table public.ppm_documents add column if not exists work_package_id uuid references public.ppm_wbs_nodes(id) on delete set null;
alter table public.ppm_documents add column if not exists deliverable_ids uuid[] not null default '{}';

-- Items 48-49: Handover and Archiving become registers (list + one form per entry) instead of a
-- single closure record.
create table if not exists public.ppm_handover_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  code text,
  title text not null,
  description text,
  recipient_name text,
  recipient_organization text,
  handover_date date,
  status text not null default 'pending' check(status in ('pending','handed_over','acknowledged')),
  file_path text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists ppm_handover_items_code_unique on public.ppm_handover_items(project_id, code) where code is not null;

create table if not exists public.ppm_archive_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  code text,
  title text not null,
  source_type text not null default 'other' check(source_type in ('deliverable','document','other')),
  source_id uuid,
  file_path text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists ppm_archive_items_code_unique on public.ppm_archive_items(project_id, code) where code is not null;

alter table public.ppm_handover_items enable row level security;
alter table public.ppm_archive_items enable row level security;
drop policy if exists "PPM users read handover items" on public.ppm_handover_items;
create policy "PPM users read handover items" on public.ppm_handover_items for select to authenticated using(public.ppm_project_access(project_id));
drop policy if exists "PPM managers manage handover items" on public.ppm_handover_items;
create policy "PPM managers manage handover items" on public.ppm_handover_items for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));
drop policy if exists "PPM users read archive items" on public.ppm_archive_items;
create policy "PPM users read archive items" on public.ppm_archive_items for select to authenticated using(public.ppm_project_access(project_id));
drop policy if exists "PPM managers manage archive items" on public.ppm_archive_items;
create policy "PPM managers manage archive items" on public.ppm_archive_items for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));
