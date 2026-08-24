-- Refinement program, Wave 9: Staff accounts & permissions.
-- Run after ppm-project-resources.sql (Sprint 12) and ppm-organization-portfolio-program.sql.

-- Per-module/per-step permissions (item 50) — a small map {module: {submit,verify,approve}},
-- edited on the Staff (human/consultant) resource form. Auto-created access account (item 50):
-- user_id links the resource to a real auth.users login once provisioned; must_change_password
-- forces a password change on first login, mirroring client_profiles' existing convention.
alter table public.ppm_resources add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.ppm_resources add column if not exists permissions jsonb not null default '{}'::jsonb;
alter table public.ppm_resources add column if not exists must_change_password boolean not null default false;
alter table public.ppm_resources add column if not exists account_email text;
create index if not exists ppm_resources_user on public.ppm_resources(user_id);

insert into public.system_email_templates(id, name, subject, body_text, subject_en, body_text_en) values
(
  'ppm_staff_account_created',
  'PPM - compte staff cree',
  'Votre acces NutVitaGlobalis PPM',
  'Bonjour {{name}},\n\nUn compte d''acces a ete cree pour vous sur NutVitaGlobalis (module Project Management), pour le projet {{project_name}}.\n\nEmail : {{email}}\nMot de passe temporaire : {{temp_password}}\n\nMerci de vous connecter et de changer ce mot de passe des votre premiere connexion.\n\nEquipe NutVitaGlobalis',
  'Your NutVitaGlobalis access',
  'Hello {{name}},\n\nAn access account has been created for you on NutVitaGlobalis (Project Management module), for project {{project_name}}.\n\nEmail: {{email}}\nTemporary password: {{temp_password}}\n\nPlease sign in and change this password on your first login.\n\nNutVitaGlobalis Team'
)
on conflict(id) do update set
  subject = excluded.subject, body_text = excluded.body_text,
  subject_en = excluded.subject_en, body_text_en = excluded.body_text_en,
  updated_at = now();
