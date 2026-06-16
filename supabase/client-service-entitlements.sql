alter table public.consultation_bookings add column if not exists access_starts_at timestamptz;
alter table public.consultation_bookings add column if not exists access_expires_at timestamptz;
alter table public.consultation_bookings add column if not exists assigned_dietitian_id uuid references public.dietitian_profiles(id);
alter table public.consultation_bookings add column if not exists renewal_price_xof numeric not null default 10000;
create index if not exists consultation_bookings_client_access on public.consultation_bookings(client_id,access_expires_at desc);
alter table public.payments add column if not exists source_amount_xof numeric;
alter table public.payments add column if not exists exchange_rate_xof_per_usd numeric;
alter table public.invoices add column if not exists source_amount_xof numeric;
alter table public.invoices add column if not exists exchange_rate_xof_per_usd numeric;
