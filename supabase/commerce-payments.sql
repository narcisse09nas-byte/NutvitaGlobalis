-- Run after health-subscriptions-upgrade.sql.
-- Commerce layer for formations, consultations and client transactions.

update public.formations set price=50000;
update public.teleconseils set price=15000;

alter table public.payments add column if not exists purchase_type text not null default 'subscription';
alter table public.payments add column if not exists product_id uuid;
alter table public.payments add column if not exists product_name text;
alter table public.payments add column if not exists cancelled_at timestamptz;
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check
  check(status in ('pending','succeeded','failed','cancelled','refunded'));
alter table public.payments drop constraint if exists payments_purchase_type_check;
alter table public.payments add constraint payments_purchase_type_check
  check(purchase_type in ('subscription','formation','consultation'));

create table if not exists public.formation_enrollments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.client_profiles(id) on delete cascade,
  formation_id uuid not null references public.formations(id) on delete cascade,
  payment_id uuid not null unique references public.payments(id) on delete cascade,
  status text not null default 'active' check(status in ('active','completed','cancelled')),
  access_url text, enrolled_at timestamptz not null default now(),
  unique(client_id,formation_id)
);

create table if not exists public.consultation_bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.client_profiles(id) on delete cascade,
  teleconseil_id uuid not null references public.teleconseils(id) on delete cascade,
  payment_id uuid not null unique references public.payments(id) on delete cascade,
  status text not null default 'slot_required' check(status in ('slot_required','scheduled','completed','cancelled')),
  preferred_slots jsonb not null default '[]', scheduled_at timestamptz,
  meeting_url text, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.client_notifications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.client_profiles(id) on delete cascade,
  title text not null, message text not null, link_url text,
  read_at timestamptz, created_at timestamptz not null default now()
);

create index if not exists formation_enrollments_client on public.formation_enrollments(client_id,enrolled_at desc);
create index if not exists consultation_bookings_client on public.consultation_bookings(client_id,created_at desc);
create index if not exists client_notifications_client on public.client_notifications(client_id,created_at desc);
create index if not exists payments_client_date on public.payments(client_id,created_at desc);

alter table public.formation_enrollments enable row level security;
alter table public.consultation_bookings enable row level security;
alter table public.client_notifications enable row level security;

create policy "Clients read own enrollments" on public.formation_enrollments for select to authenticated using(client_id=(select auth.uid()) or public.is_admin());
create policy "Admins manage enrollments" on public.formation_enrollments for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Clients read own bookings" on public.consultation_bookings for select to authenticated using(client_id=(select auth.uid()) or public.is_admin());
create policy "Clients update own booking slots" on public.consultation_bookings for update to authenticated using(client_id=(select auth.uid())) with check(client_id=(select auth.uid()));
create policy "Admins manage bookings" on public.consultation_bookings for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Clients read own notifications" on public.client_notifications for select to authenticated using(client_id=(select auth.uid()) or public.is_admin());
create policy "Clients mark own notifications" on public.client_notifications for update to authenticated using(client_id=(select auth.uid())) with check(client_id=(select auth.uid()));
create policy "Admins manage client notifications" on public.client_notifications for all to authenticated using(public.is_admin()) with check(public.is_admin());

insert into public.system_email_templates(id,name,subject,body_text) values
('formation_purchased','Formation achetee','Votre formation NutVitaGlobalis est disponible','Bonjour {{name}},\n\nVotre paiement pour la formation {{product}} est confirme. Elle est maintenant visible dans votre espace client.\n\nEquipe NutVitaGlobalis'),
('consultation_booked','Consultation reservee','Votre consultation NutVitaGlobalis est reservee','Bonjour {{name}},\n\nVotre paiement pour {{product}} est confirme. Choisissez maintenant un creneau depuis votre espace client.\n\nEquipe NutVitaGlobalis'),
('consultation_booked_admin','Nouvelle consultation payee','Nouvelle reservation de consultation','Une nouvelle reservation payee a ete creee pour {{name}} : {{product}}. Consultez Supabase ou le tableau de bord pour organiser le creneau.\n\nEquipe NutVitaGlobalis')
on conflict(id) do nothing;
