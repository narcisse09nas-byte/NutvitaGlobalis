-- Sprint 21: Notifications + Approval workflows (spec section 27 + change control follow-up).
-- Run after ppm-reports.sql (reuses public.ppm_project_access).

-- Recipients are addressed by user_id when known, otherwise by email (mirrors the
-- reviewer_email / auth.jwt()->>'email' pattern already used in maximus-recruitment.sql and
-- electronic-signatures.sql) — there is no general people-directory in this app, so free-text
-- email is how every "who should see this" field works throughout PPM (manager_name/email,
-- approver_email, etc.).
create table if not exists public.ppm_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  recipient_email text,
  project_id uuid references public.ppm_projects(id) on delete cascade,
  category text not null default 'info' check(category in ('info','approval','alert','reminder')),
  title text not null,
  message text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint ppm_notifications_recipient check(user_id is not null or recipient_email is not null)
);

-- Generic approval requests: any project entity (charter, scope baseline, change request,
-- deliverable, NCR, report...) can have an approval routed through here without a dedicated
-- table per entity type.
create table if not exists public.ppm_approval_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  entity_type text not null default 'other' check(entity_type in (
    'charter','scope_baseline','change_request','deliverable','ncr','report','other'
  )),
  entity_id uuid,
  entity_label text,
  title text not null,
  description text,
  requested_by_name text,
  requested_by_email text,
  approver_name text,
  approver_email text,
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  decision_note text,
  decided_by_name text,
  decided_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ppm_notifications_user on public.ppm_notifications(user_id,read_at);
create index if not exists ppm_notifications_email on public.ppm_notifications(recipient_email,read_at);
create index if not exists ppm_approval_requests_project on public.ppm_approval_requests(project_id,status);

alter table public.ppm_notifications enable row level security;
alter table public.ppm_approval_requests enable row level security;

drop policy if exists "PPM users read own notifications" on public.ppm_notifications;
create policy "PPM users read own notifications" on public.ppm_notifications for select to authenticated
  using(user_id=(select auth.uid()) or lower(recipient_email)=lower(coalesce((select auth.jwt()->>'email'),'')) or public.is_admin());
drop policy if exists "PPM project members create notifications" on public.ppm_notifications;
create policy "PPM project members create notifications" on public.ppm_notifications for insert to authenticated
  with check(project_id is null or public.ppm_project_access(project_id));
drop policy if exists "PPM recipients update own notifications" on public.ppm_notifications;
create policy "PPM recipients update own notifications" on public.ppm_notifications for update to authenticated
  using(user_id=(select auth.uid()) or lower(recipient_email)=lower(coalesce((select auth.jwt()->>'email'),'')))
  with check(user_id=(select auth.uid()) or lower(recipient_email)=lower(coalesce((select auth.jwt()->>'email'),'')));

drop policy if exists "PPM users read approval requests" on public.ppm_approval_requests;
create policy "PPM users read approval requests" on public.ppm_approval_requests for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM managers manage approval requests" on public.ppm_approval_requests;
create policy "PPM managers manage approval requests" on public.ppm_approval_requests for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));
