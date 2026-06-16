-- Run after partner-advanced-workflows.sql.
-- Compliance, privacy, appointments, support, feedback, business analytics, audit and mobile-readiness.

create table if not exists public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  version text not null default '1.0',
  document_type text not null check(document_type in ('cgu','cgv','privacy','refund','teleconsultation_consent','medical_disclaimer')),
  content text not null,
  active boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  legal_document_id uuid references public.legal_documents(id) on delete set null,
  consent_type text not null check(consent_type in ('terms','privacy','teleconsultation','marketing','health_data','data_sharing')),
  accepted boolean not null default true,
  signature_text text,
  signed_at timestamptz,
  ip_address text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id, consent_type)
);

create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check(request_type in ('export','delete','rectification','consent_update','restriction')),
  status text not null default 'open' check(status in ('open','in_progress','completed','rejected','cancelled')),
  details text,
  response text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  handled_by uuid references auth.users(id) on delete set null
);

create table if not exists public.dietitian_availability (
  id uuid primary key default gen_random_uuid(),
  dietitian_id uuid not null references public.dietitian_profiles(id) on delete cascade,
  weekday integer check(weekday between 0 and 6),
  starts_at time,
  ends_at time,
  timezone text not null default 'Africa/Douala',
  slot_minutes integer not null default 45,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.client_profiles(id) on delete cascade,
  dietitian_id uuid references public.dietitian_profiles(id) on delete set null,
  consultation_booking_id uuid references public.consultation_bookings(id) on delete set null,
  appointment_type text not null default 'teleconsultation' check(appointment_type in ('teleconsultation','onsite','follow_up','child_growth','health_review')),
  status text not null default 'pending' check(status in ('pending','confirmed','completed','rescheduled','cancelled')),
  scheduled_at timestamptz,
  timezone text not null default 'Africa/Douala',
  duration_minutes integer not null default 45,
  reason text,
  meeting_url text,
  created_by uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.appointment_reminders (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  reminder_type text not null check(reminder_type in ('consultation_24h','consultation_1h','subscription_expiry','course_incomplete','health_data_stale')),
  channel text not null default 'email' check(channel in ('email','notification','whatsapp')),
  scheduled_for timestamptz not null,
  status text not null default 'pending' check(status in ('pending','sent','failed','cancelled')),
  sent_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references auth.users(id) on delete set null,
  requester_email text,
  requester_name text,
  category text not null default 'general',
  subject text not null,
  status text not null default 'open' check(status in ('open','in_progress','resolved','closed')),
  priority text not null default 'normal' check(priority in ('low','normal','high','urgent')),
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  sender_email text,
  body text not null,
  attachment_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_feedback (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.client_profiles(id) on delete set null,
  dietitian_id uuid references public.dietitian_profiles(id) on delete set null,
  service_type text not null check(service_type in ('formation','teleconsultation','health_tracking','child_growth','support')),
  service_id uuid,
  rating integer not null check(rating between 1 and 5),
  comment text,
  suggestions text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  action text not null,
  resource_type text not null,
  resource_id text,
  ip_address text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.business_metrics (
  id uuid primary key default gen_random_uuid(),
  metric_date date not null,
  metric_key text not null,
  metric_value numeric(14,2) not null default 0,
  dimensions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(metric_date, metric_key, dimensions)
);

create table if not exists public.dietitian_consultation_notes (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments(id) on delete set null,
  consultation_id uuid references public.partner_consultations(id) on delete set null,
  dietitian_id uuid not null references public.dietitian_profiles(id) on delete cascade,
  client_id uuid not null references public.client_profiles(id) on delete cascade,
  summary text,
  recommendations text,
  meal_plan text,
  professional_notes text,
  attachment_paths text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_consents_user_type on public.user_consents(user_id, consent_type);
create index if not exists privacy_requests_user_status on public.privacy_requests(user_id, status);
create index if not exists appointments_client_date on public.appointments(client_id, scheduled_at desc);
create index if not exists appointments_dietitian_date on public.appointments(dietitian_id, scheduled_at desc);
create index if not exists reminders_schedule on public.appointment_reminders(status, scheduled_for);
create index if not exists support_tickets_status_date on public.support_tickets(status, created_at desc);
create index if not exists feedback_service on public.customer_feedback(service_type, service_id);
create index if not exists audit_logs_date on public.audit_logs(created_at desc);

alter table public.legal_documents enable row level security;
alter table public.user_consents enable row level security;
alter table public.privacy_requests enable row level security;
alter table public.dietitian_availability enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_reminders enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.customer_feedback enable row level security;
alter table public.audit_logs enable row level security;
alter table public.business_metrics enable row level security;
alter table public.dietitian_consultation_notes enable row level security;

create policy "Published legal docs are public" on public.legal_documents for select using(active=true);
create policy "Admins manage legal docs" on public.legal_documents for all to authenticated using(public.is_admin()) with check(public.is_admin());

create policy "Users manage own consents" on public.user_consents for all to authenticated using(user_id=(select auth.uid()) or public.is_admin()) with check(user_id=(select auth.uid()) or public.is_admin());
create policy "Users manage own privacy requests" on public.privacy_requests for all to authenticated using(user_id=(select auth.uid()) or public.is_admin()) with check(user_id=(select auth.uid()) or public.is_admin());

create policy "Availability readable" on public.dietitian_availability for select to authenticated using(active=true or public.is_admin());
create policy "Admins manage availability" on public.dietitian_availability for all to authenticated using(public.is_admin()) with check(public.is_admin());

create policy "Appointment participants read" on public.appointments for select to authenticated
using(client_id=(select auth.uid()) or public.is_admin() or exists(select 1 from public.dietitian_profiles d where d.id=dietitian_id and d.candidate_id=(select auth.uid())));
create policy "Clients create appointments" on public.appointments for insert to authenticated with check(client_id=(select auth.uid()) or public.is_admin());
create policy "Participants update appointments" on public.appointments for update to authenticated
using(public.is_admin() or client_id=(select auth.uid()) or exists(select 1 from public.dietitian_profiles d where d.id=dietitian_id and d.candidate_id=(select auth.uid())))
with check(public.is_admin() or client_id=(select auth.uid()) or exists(select 1 from public.dietitian_profiles d where d.id=dietitian_id and d.candidate_id=(select auth.uid())));

create policy "Users read own reminders" on public.appointment_reminders for select to authenticated using(user_id=(select auth.uid()) or public.is_admin());
create policy "Admins manage reminders" on public.appointment_reminders for all to authenticated using(public.is_admin()) with check(public.is_admin());

create policy "Ticket participants read" on public.support_tickets for select to authenticated using(requester_id=(select auth.uid()) or public.is_admin());
create policy "Users create tickets" on public.support_tickets for insert to authenticated with check(requester_id=(select auth.uid()) or requester_id is null or public.is_admin());
create policy "Admins update tickets" on public.support_tickets for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Ticket messages read" on public.support_messages for select to authenticated using(public.is_admin() or exists(select 1 from public.support_tickets t where t.id=ticket_id and t.requester_id=(select auth.uid())));
create policy "Ticket messages insert" on public.support_messages for insert to authenticated with check(public.is_admin() or sender_id=(select auth.uid()) or sender_id is null);

create policy "Users create feedback" on public.customer_feedback for insert to authenticated with check(client_id=(select auth.uid()) or public.is_admin());
create policy "Admins read feedback" on public.customer_feedback for select to authenticated using(public.is_admin() or client_id=(select auth.uid()));

create policy "Super admins read audit logs" on public.audit_logs for select to authenticated using(public.is_super_admin());
create policy "Authenticated insert audit logs" on public.audit_logs for insert to authenticated with check(actor_id=(select auth.uid()) or public.is_admin());
create policy "Admins manage business metrics" on public.business_metrics for all to authenticated using(public.is_admin()) with check(public.is_admin());

create policy "Consultation note participants read" on public.dietitian_consultation_notes for select to authenticated
using(client_id=(select auth.uid()) or public.is_admin() or exists(select 1 from public.dietitian_profiles d where d.id=dietitian_id and d.candidate_id=(select auth.uid())));
create policy "Dietitians manage own notes" on public.dietitian_consultation_notes for all to authenticated
using(public.is_admin() or exists(select 1 from public.dietitian_profiles d where d.id=dietitian_id and d.candidate_id=(select auth.uid())))
with check(public.is_admin() or exists(select 1 from public.dietitian_profiles d where d.id=dietitian_id and d.candidate_id=(select auth.uid())));

insert into public.legal_documents(slug,title,document_type,content) values
('cgu','Conditions Generales d Utilisation','cgu','Conditions d acces, responsabilites utilisateur, limitation de responsabilite et regles d utilisation des services NutVitaGlobalis.'),
('cgv','Conditions Generales de Vente','cgv','Vente des formations, teleconseils, abonnements, modalites de paiement, facturation, annulation et remboursement.'),
('confidentialite','Politique de confidentialite','privacy','Donnees collectees, utilisation, conservation, securite et droits des utilisateurs.'),
('remboursement','Politique de remboursement','refund','Regles de remboursement des formations, teleconseils et abonnements.'),
('teleconsultation-consent','Consentement eclaire de teleconsultation','teleconsultation_consent','Le client reconnait les limites de la teleconsultation nutritionnelle et accepte la signature electronique.')
on conflict(slug) do nothing;
