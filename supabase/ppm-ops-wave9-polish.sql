-- Operations Management (Wave 9 — Polish): provisional-password partner accounts (replacing
-- magic-link invite, mirroring ppm-wave9-staff-accounts.sql's ppm_resources pattern) + the
-- Time Table / action tracker checklist module.
-- Run after ppm-ops-reconciliation.sql.

alter table public.ppm_ops_partner_profiles add column if not exists must_change_password boolean not null default false;
-- Stored so the internal ops managers can notify a site's/cooperative's partner(s) directly via a
-- plain client-side query (join through ppm_ops_partner_site_links/cooperative_id) without needing
-- the service-role auth.admin API just to resolve an email at notification time.
alter table public.ppm_ops_partner_profiles add column if not exists email text;

insert into public.system_email_templates(id, name, subject, body_text, subject_en, body_text_en) values
(
  'ppm_ops_partner_account_created',
  'PPM - compte partenaire distribution cree',
  'Votre acces au portail distribution NutVitaGlobalis',
  'Bonjour {{name}},\n\nUn compte d''acces a ete cree pour vous sur le portail distribution NutVitaGlobalis.\n\nEmail : {{email}}\nMot de passe temporaire : {{temp_password}}\n\nMerci de vous connecter et de changer ce mot de passe des votre premiere connexion.\n\nEquipe NutVitaGlobalis',
  'Your NutVitaGlobalis distribution portal access',
  'Hello {{name}},\n\nAn access account has been created for you on the NutVitaGlobalis distribution portal.\n\nEmail: {{email}}\nTemporary password: {{temp_password}}\n\nPlease sign in and change this password on your first login.\n\nNutVitaGlobalis Team'
)
on conflict(id) do update set
  subject = excluded.subject, body_text = excluded.body_text,
  subject_en = excluded.subject_en, body_text_en = excluded.body_text_en,
  updated_at = now();

insert into public.system_email_templates(id, name, subject, body_text, subject_en, body_text_en) values
(
  'ppm_task_assigned',
  'PPM - tache assignee',
  'Une tache vous a ete assignee : {{task_title}}',
  'Bonjour {{name}},\n\nUne tache vous a ete assignee dans NutVitaGlobalis :\n\n{{task_title}}\n{{context_line}}\nEcheance : {{deadline}}\n\nConsultez le tableau de taches pour plus de details.\n\nEquipe NutVitaGlobalis',
  'A task has been assigned to you: {{task_title}}',
  'Hello {{name}},\n\nA task has been assigned to you in NutVitaGlobalis:\n\n{{task_title}}\n{{context_line}}\nDeadline: {{deadline}}\n\nSee the task board for details.\n\nNutVitaGlobalis Team'
)
on conflict(id) do update set
  subject = excluded.subject, body_text = excluded.body_text,
  subject_en = excluded.subject_en, body_text_en = excluded.body_text_en,
  updated_at = now();

insert into public.system_email_templates(id, name, subject, body_text, subject_en, body_text_en) values
(
  'ppm_task_deadline_reminder',
  'PPM - echeance proche',
  'Echeance proche : {{task_title}}',
  'Bonjour {{name}},\n\nLa tache suivante approche de son echeance :\n\n{{task_title}}\n{{context_line}}\nEcheance : {{deadline}}\n\nConsultez le tableau de taches pour la mettre a jour.\n\nEquipe NutVitaGlobalis',
  'Upcoming deadline: {{task_title}}',
  'Hello {{name}},\n\nThe following task is approaching its deadline:\n\n{{task_title}}\n{{context_line}}\nDeadline: {{deadline}}\n\nSee the task board to update it.\n\nNutVitaGlobalis Team'
)
on conflict(id) do update set
  subject = excluded.subject, body_text = excluded.body_text,
  subject_en = excluded.subject_en, body_text_en = excluded.body_text_en,
  updated_at = now();

-- Time Table / action tracker — a Planner-like checklist module, listed directly under
-- Operations in the nav ("en dessous de operations"). A list is a period-bound bucket (week or
-- month, dates specified), optionally attached to a project OR an operation ("si applicable"),
-- holding one or more checklist items each with its own responsible person and deadline.
create table if not exists public.ppm_task_lists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.ppm_organizations(id) on delete cascade,
  project_id uuid references public.ppm_projects(id) on delete set null,
  operation_id uuid references public.ppm_ops_operations(id) on delete set null,
  title text not null,
  period_type text not null check(period_type in ('week','month')),
  period_start date not null,
  period_end date not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint ppm_task_lists_one_link check(not (project_id is not null and operation_id is not null))
);

create table if not exists public.ppm_tasks (
  id uuid primary key default gen_random_uuid(),
  task_list_id uuid not null references public.ppm_task_lists(id) on delete cascade,
  title text not null,
  description text,
  responsible_user_id uuid references auth.users(id) on delete set null,
  responsible_name text,
  responsible_email text,
  deadline date,
  status text not null default 'not_started' check(status in ('not_started','in_progress','done','blocked')),
  reminder_sent_at timestamptz,
  sort_order int not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ppm_task_lists_organization on public.ppm_task_lists(organization_id);
create index if not exists ppm_task_lists_project on public.ppm_task_lists(project_id);
create index if not exists ppm_task_lists_operation on public.ppm_task_lists(operation_id);
create index if not exists ppm_tasks_list on public.ppm_tasks(task_list_id);
create index if not exists ppm_tasks_deadline on public.ppm_tasks(deadline) where status <> 'done';
create index if not exists ppm_tasks_responsible on public.ppm_tasks(responsible_user_id);

alter table public.ppm_task_lists enable row level security;
alter table public.ppm_tasks enable row level security;

-- Broad PPM-wide read/write, matching the rest of the module (platform_has_access gate) — task
-- lists are a lightweight cross-cutting tool, not scoped per-project/operation the way the
-- heavier registers are, so no ppm_ops_access/ppm_project_access branch is needed here.
drop policy if exists "PPM users read task lists" on public.ppm_task_lists;
create policy "PPM users read task lists" on public.ppm_task_lists
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM users manage task lists" on public.ppm_task_lists;
create policy "PPM users manage task lists" on public.ppm_task_lists for all to authenticated
  using(public.platform_has_access('project_management')) with check(public.platform_has_access('project_management'));

drop policy if exists "PPM users read tasks" on public.ppm_tasks;
create policy "PPM users read tasks" on public.ppm_tasks
  for select to authenticated using(public.platform_has_access('project_management'));
drop policy if exists "PPM users manage tasks" on public.ppm_tasks;
create policy "PPM users manage tasks" on public.ppm_tasks for all to authenticated
  using(public.platform_has_access('project_management')) with check(public.platform_has_access('project_management'));
