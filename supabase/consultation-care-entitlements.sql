-- Unified paid consultation entitlements. Apply after commerce-payments.sql,
-- client-service-entitlements.sql and medical-specialist-platform.sql.
create table if not exists public.consultation_service_prices (
  service_key text primary key check (service_key in ('dietetic_consultation','medical_consultation')),
  name_fr text not null,
  name_en text not null,
  initial_price_xof numeric(12,2) not null check (initial_price_xof >= 0),
  renewal_price_xof numeric(12,2) not null check (renewal_price_xof >= 0),
  access_duration_months integer not null default 3 check (access_duration_months > 0),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.consultation_service_prices(service_key,name_fr,name_en,initial_price_xof,renewal_price_xof,access_duration_months)
values
  ('dietetic_consultation','Consultation diététique et nutritionnelle','Dietetic and nutrition consultation',20000,15000,3),
  ('medical_consultation','Consultation médicale spécialisée','Specialist medical consultation',25000,20000,3)
on conflict(service_key) do nothing;

alter table public.consultation_service_prices enable row level security;
drop policy if exists "Public reads consultation prices" on public.consultation_service_prices;
drop policy if exists "Admins manage consultation prices" on public.consultation_service_prices;
create policy "Public reads consultation prices" on public.consultation_service_prices for select using(active or public.is_admin());
create policy "Admins manage consultation prices" on public.consultation_service_prices for all to authenticated using(public.is_admin()) with check(public.is_admin());

alter table public.medical_consultations add column if not exists payment_id uuid references public.payments(id) on delete set null;
alter table public.medical_consultations add column if not exists access_starts_at timestamptz;
alter table public.medical_consultations add column if not exists access_expires_at timestamptz;
create unique index if not exists medical_consultations_payment_unique on public.medical_consultations(payment_id) where payment_id is not null;

-- Existing, non-cancelled consultations receive the same three-month legacy window.
update public.medical_consultations
set access_starts_at=coalesce(access_starts_at,created_at),
    access_expires_at=coalesce(access_expires_at,created_at + interval '3 months')
where status <> 'cancelled' and access_expires_at is null;
