-- Execution add-on, Phases C, F, G: validation workflows layered onto entities that already
-- exist (Achievement from Phase A/B, MEAL entries from Sprint 17, Deliverables from Sprint 18)
-- rather than new tables. Run after ppm-execution-achievements.sql.

-- Phase C: notify the achievement's author on review decisions. "created_by" is a bare
-- auth.users id (no people-directory in this app — see AuditLogEntry's note in types.ts), so
-- the email is captured once at creation time, the same way ppm_notifications.recipient_email
-- already works.
alter table public.ppm_achievements add column if not exists created_by_email text;

-- Phase F: MEAL entries (Sprint 17) had no validation workflow — only validated measurements
-- may update public.ppm_indicators.current_value (spec section 25).
alter table public.ppm_meal_entries add column if not exists status text not null default 'draft' check(status in (
  'draft','submitted','data_quality_review','validated','returned','rejected'
));
alter table public.ppm_meal_entries add column if not exists reviewed_by_name text;
alter table public.ppm_meal_entries add column if not exists review_note text;
alter table public.ppm_meal_entries add column if not exists reviewed_at timestamptz;
alter table public.ppm_meal_entries add column if not exists validated_at timestamptz;

-- Phase G: widen the Deliverable acceptance workflow (Sprint 18) to match spec section 26's
-- DRAFT -> SUBMITTED -> QUALITY CHECK -> ACCEPTED (or REJECTED / RETURNED FOR REVISION); no new
-- table, the existing ppm_deliverables row already carries file_path/version/acceptance_status.
alter table public.ppm_deliverables drop constraint if exists ppm_deliverables_acceptance_status_check;
alter table public.ppm_deliverables add constraint ppm_deliverables_acceptance_status_check check(acceptance_status in (
  'pending','submitted','quality_check','accepted','rejected','returned_for_revision'
));
