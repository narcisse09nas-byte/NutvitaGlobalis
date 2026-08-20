-- Parcours unifie de demande, acceptation et paiement des consultations.
-- A executer apres partner-advanced-workflows.sql,
-- medical-specialist-platform.sql et consultation-care-entitlements.sql.

alter table public.consultation_waiting_room
  add column if not exists care_need text,
  add column if not exists other_care_need text,
  add column if not exists allow_alternative boolean not null default true,
  add column if not exists requested_start timestamptz,
  add column if not exists requested_end timestamptz,
  add column if not exists proposed_start timestamptz,
  add column if not exists proposed_end timestamptz,
  add column if not exists consultation_mode text not null default 'video',
  add column if not exists accepted_at timestamptz,
  add column if not exists payment_ready_at timestamptz;

alter table public.consultation_waiting_room
  drop constraint if exists consultation_waiting_room_status_check;
alter table public.consultation_waiting_room
  add constraint consultation_waiting_room_status_check check(status in (
    'waiting','partner_interested','assigned_pending_partner',
    'accepted_pending_payment','active','rejected','cancelled','completed'
  ));

alter table public.medical_consultations
  add column if not exists care_need text,
  add column if not exists other_care_need text,
  add column if not exists allow_alternative boolean not null default true,
  add column if not exists requested_start timestamptz,
  add column if not exists requested_end timestamptz,
  add column if not exists proposed_start timestamptz,
  add column if not exists proposed_end timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists payment_ready_at timestamptz;

alter table public.medical_consultations
  drop constraint if exists medical_consultations_status_check;
alter table public.medical_consultations
  add constraint medical_consultations_status_check check(status in (
    'requested','accepted_pending_payment','scheduled','completed','cancelled'
  ));

alter table public.payments
  add column if not exists consultation_request_type text,
  add column if not exists consultation_request_id uuid;
alter table public.payments
  drop constraint if exists payments_consultation_request_type_check;
alter table public.payments
  add constraint payments_consultation_request_type_check
  check(consultation_request_type is null or consultation_request_type in ('dietetic','medical'));

create index if not exists waiting_room_selected_partner_status
  on public.consultation_waiting_room(selected_partner_id,status,created_at desc);
create index if not exists medical_consultations_specialist_status
  on public.medical_consultations(specialist_id,status,created_at desc);
create index if not exists payments_consultation_request
  on public.payments(consultation_request_type,consultation_request_id)
  where consultation_request_id is not null;

create table if not exists public.care_request_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check(request_type in ('dietetic','medical')),
  request_id uuid not null,
  title_fr text not null,
  title_en text not null,
  message_fr text not null,
  message_en text not null,
  link_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists care_request_notifications_user
  on public.care_request_notifications(user_id,created_at desc);
alter table public.care_request_notifications enable row level security;
drop policy if exists "Users read own care request notifications" on public.care_request_notifications;
create policy "Users read own care request notifications"
  on public.care_request_notifications for select to authenticated
  using(user_id=(select auth.uid()) or public.is_admin());
drop policy if exists "Users mark own care request notifications" on public.care_request_notifications;
create policy "Users mark own care request notifications"
  on public.care_request_notifications for update to authenticated
  using(user_id=(select auth.uid()) or public.is_admin())
  with check(user_id=(select auth.uid()) or public.is_admin());
drop policy if exists "Admins manage care request notifications" on public.care_request_notifications;
create policy "Admins manage care request notifications"
  on public.care_request_notifications for all to authenticated
  using(public.is_admin()) with check(public.is_admin());

-- Les politiques historiques restent valables. Ces politiques rendent explicites
-- les droits des deux parties au nouveau parcours.
drop policy if exists "Clients read own medical consultations" on public.medical_consultations;
create policy "Clients read own medical consultations"
  on public.medical_consultations for select to authenticated
  using(client_id=(select auth.uid()) or public.is_admin() or exists(
    select 1 from public.medical_specialists s
    where s.id=specialist_id and s.user_id=(select auth.uid())
  ));
drop policy if exists "Clients create medical consultation requests" on public.medical_consultations;
create policy "Clients create medical consultation requests"
  on public.medical_consultations for insert to authenticated
  with check(client_id=(select auth.uid()));
drop policy if exists "Specialists update assigned medical requests" on public.medical_consultations;
create policy "Specialists update assigned medical requests"
  on public.medical_consultations for update to authenticated
  using(public.is_admin() or exists(
    select 1 from public.medical_specialists s
    where s.id=specialist_id and s.user_id=(select auth.uid())
  ))
  with check(public.is_admin() or exists(
    select 1 from public.medical_specialists s
    where s.id=specialist_id and s.user_id=(select auth.uid())
  ));
