-- Consultations medicales specialisees: contenu public, recrutement, annuaire et finance.
-- Peut etre rejoue sans supprimer les donnees existantes.
create extension if not exists pgcrypto;

create or replace function public.medical_public_code(prefix text, suffix_length integer)
returns text language sql volatile as $$
  select upper(prefix || substr(encode(gen_random_bytes(12), 'hex'), 1, suffix_length));
$$;

create table if not exists public.medical_specialist_page_settings (
  id integer primary key default 1 check (id = 1),
  content_fr jsonb not null default '{}'::jsonb,
  content_en jsonb not null default '{}'::jsonb,
  recruitment_fr jsonb not null default '{}'::jsonb,
  recruitment_en jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.medical_specialist_page_settings(id) values(1) on conflict(id) do nothing;

create table if not exists public.medical_specialist_settings (
  id integer primary key default 1 check (id = 1),
  practitioner_share_percent numeric(5,2) not null default 48 check (practitioner_share_percent between 0 and 100),
  contact_phone text,
  updated_at timestamptz not null default now()
);
insert into public.medical_specialist_settings(id) values(1) on conflict(id) do nothing;

-- Rendre le nouveau service disponible dans le sélecteur unifié sans second login.
alter table public.platform_service_access drop constraint if exists platform_service_access_service_key_check;
alter table public.platform_service_access add constraint platform_service_access_service_key_check check(service_key in ('client','academy','health','child_growth','teleconsultation','medical_consultation','survey','project_management','recruitment','nutritrack','maximus','administration','catering'));

create table if not exists public.medical_specialist_applications (
  id uuid primary key default gen_random_uuid(),
  application_code text not null unique default public.medical_public_code('NVGM', 4),
  candidate_id uuid not null references auth.users(id) on delete cascade,
  applied_at timestamptz not null default now(),
  full_name text not null,
  email text not null,
  phone text,
  sex text check (sex in ('female','male','other')),
  specialty text not null,
  practice_mode text not null default 'hybrid',
  country text not null,
  state_region text not null,
  city text not null,
  medical_license_number text not null,
  years_experience integer not null default 0 check (years_experience >= 0),
  availability text,
  motivation text,
  documents jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending','additional_documents','interview_invited','interview_scheduled','interview_completed','recruited','rejected','inconclusive','disabled')),
  admin_note text,
  updated_at timestamptz not null default now()
);
create index if not exists medical_specialist_applications_candidate_idx on public.medical_specialist_applications(candidate_id, applied_at desc);

create table if not exists public.medical_specialist_interviews (
  id uuid primary key default gen_random_uuid(),
  interview_code text not null unique default public.medical_public_code('NVG', 5),
  application_id uuid not null references public.medical_specialist_applications(id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 45 check (duration_minutes between 10 and 240),
  meeting_room text not null,
  meeting_url text not null,
  external_guest_emails text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','cancelled','completed')),
  decision text check (decision is null or decision in ('recruit','reject','inconclusive')),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.medical_specialists (
  id uuid primary key default gen_random_uuid(),
  specialist_code text not null unique default public.medical_public_code('NVGMS', 3),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  application_id uuid unique references public.medical_specialist_applications(id),
  interview_id uuid references public.medical_specialist_interviews(id),
  full_name text not null,
  email text not null,
  sex text,
  specialty text not null,
  bio_fr text,
  bio_en text,
  languages text[] not null default '{}',
  consultation_modes text[] not null default '{video}',
  country text not null,
  state_region text not null,
  city text not null,
  medical_license_number text not null,
  years_experience integer not null default 0,
  photo_url text,
  next_availability timestamptz,
  recruited_at timestamptz not null default now(),
  active boolean not null default true,
  disabled_reason text,
  disabled_document_url text,
  updated_at timestamptz not null default now()
);

create table if not exists public.medical_specialist_payout_accounts (
  id uuid primary key default gen_random_uuid(),
  specialist_id uuid not null references public.medical_specialists(id) on delete cascade,
  account_type text not null check (account_type in ('bank','mobile_money')),
  account_holder text not null,
  holder_type text not null check (holder_type in ('individual','company')),
  currency text not null,
  bank_name text, bank_country text, bank_address text, bank_account_number text,
  iban text, swift_bic text, routing_number text,
  mobile_operator text, mobile_number text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check ((account_type='bank' and bank_name is not null) or (account_type='mobile_money' and mobile_operator is not null and mobile_number is not null))
);

create table if not exists public.medical_specialist_payment_orders (
  id uuid primary key default gen_random_uuid(),
  payment_code text not null unique default public.medical_public_code('NVGP', 6),
  specialist_id uuid not null references public.medical_specialists(id) on delete restrict,
  payout_account_id uuid references public.medical_specialist_payout_accounts(id),
  amount numeric(14,2) not null check (amount > 0),
  currency text not null,
  description text,
  status text not null default 'pending_approval' check (status in ('pending_approval','approved','pending_payment','paid','rejected')),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  payment_proof_url text,
  paid_amount numeric(14,2),
  paid_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.medical_consultations (
  id uuid primary key default gen_random_uuid(),
  consultation_code text not null unique default public.medical_public_code('NVGMC', 5),
  specialist_id uuid not null references public.medical_specialists(id),
  client_id uuid not null references auth.users(id),
  scheduled_at timestamptz,
  completed_at timestamptz,
  consultation_mode text not null default 'video',
  chief_complaint text,
  history text,
  examination text,
  assessment text,
  care_plan text,
  prescriptions jsonb not null default '[]'::jsonb,
  documents jsonb not null default '[]'::jsonb,
  amount_paid numeric(14,2) not null default 0,
  currency text not null default 'XAF',
  status text not null default 'scheduled' check (status in ('requested','scheduled','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.medical_specialist_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title_fr text not null, title_en text not null,
  message_fr text not null, message_en text not null,
  link text, read_at timestamptz,
  created_at timestamptz not null default now()
);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('medical-recruitment','medical-recruitment',false,5242880,array['application/pdf','image/jpeg','image/png'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

alter table public.medical_specialist_page_settings enable row level security;
alter table public.medical_specialist_settings enable row level security;
alter table public.medical_specialist_applications enable row level security;
alter table public.medical_specialist_interviews enable row level security;
alter table public.medical_specialists enable row level security;
alter table public.medical_specialist_payout_accounts enable row level security;
alter table public.medical_specialist_payment_orders enable row level security;
alter table public.medical_consultations enable row level security;
alter table public.medical_specialist_notifications enable row level security;

drop policy if exists "Public reads medical page" on public.medical_specialist_page_settings;
create policy "Public reads medical page" on public.medical_specialist_page_settings for select using (true);
drop policy if exists "Public reads active specialists" on public.medical_specialists;
create policy "Public reads active specialists" on public.medical_specialists for select using (active or user_id=auth.uid() or public.is_admin());
drop policy if exists "Candidates read own medical applications" on public.medical_specialist_applications;
create policy "Candidates read own medical applications" on public.medical_specialist_applications for select to authenticated using (candidate_id=auth.uid() or public.is_admin());
drop policy if exists "Admins manage medical applications" on public.medical_specialist_applications;
create policy "Admins manage medical applications" on public.medical_specialist_applications for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Related users read medical interviews" on public.medical_specialist_interviews;
create policy "Related users read medical interviews" on public.medical_specialist_interviews for select to authenticated using (public.is_admin() or exists(select 1 from public.medical_specialist_applications a where a.id=application_id and a.candidate_id=auth.uid()));
drop policy if exists "Admins manage medical interviews" on public.medical_specialist_interviews;
create policy "Admins manage medical interviews" on public.medical_specialist_interviews for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Specialists read own payout accounts" on public.medical_specialist_payout_accounts;
create policy "Specialists read own payout accounts" on public.medical_specialist_payout_accounts for select to authenticated using (public.is_admin() or exists(select 1 from public.medical_specialists s where s.id=specialist_id and s.user_id=auth.uid()));
drop policy if exists "Admins manage payout accounts" on public.medical_specialist_payout_accounts;
create policy "Admins manage payout accounts" on public.medical_specialist_payout_accounts for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Specialists read own payment orders" on public.medical_specialist_payment_orders;
create policy "Specialists read own payment orders" on public.medical_specialist_payment_orders for select to authenticated using (public.is_admin() or exists(select 1 from public.medical_specialists s where s.id=specialist_id and s.user_id=auth.uid()));
drop policy if exists "Admins manage payment orders" on public.medical_specialist_payment_orders;
create policy "Admins manage payment orders" on public.medical_specialist_payment_orders for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Consultation participants read" on public.medical_consultations;
create policy "Consultation participants read" on public.medical_consultations for select to authenticated using (client_id=auth.uid() or public.is_admin() or exists(select 1 from public.medical_specialists s where s.id=specialist_id and s.user_id=auth.uid()));
drop policy if exists "Specialists manage consultations" on public.medical_consultations;
create policy "Specialists manage consultations" on public.medical_consultations for all to authenticated using (public.is_admin() or exists(select 1 from public.medical_specialists s where s.id=specialist_id and s.user_id=auth.uid())) with check (public.is_admin() or exists(select 1 from public.medical_specialists s where s.id=specialist_id and s.user_id=auth.uid()));
drop policy if exists "Users read medical notifications" on public.medical_specialist_notifications;
create policy "Users read medical notifications" on public.medical_specialist_notifications for select to authenticated using (user_id=auth.uid() or public.is_admin());

-- L'application effectue la promotion application -> medecin dans une transaction serveur.
-- Les admins gerent aussi le contenu et le taux de partage via la cle service.
