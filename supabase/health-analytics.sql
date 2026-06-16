-- Run after contracts-nutrition.sql.
-- Existing canonical tables map to the requested model as follows:
-- clients -> client_profiles, client_measurements -> anthropometric_measurements,
-- client_biomarkers -> biological_measurements, client_food_records -> food_history,
-- client_consultations -> nutrition_consultations.

create table if not exists public.subscription_plans (
  id text primary key,
  name text not null,
  tier text not null check (tier in ('basic','premium')),
  billing_period text not null check (billing_period in ('monthly','quarterly','yearly')),
  amount numeric not null check (amount >= 0),
  currency text not null default 'XOF',
  stripe_price_id text,
  flutterwave_plan_id text,
  features jsonb not null default '[]',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.subscription_plans(id,name,tier,billing_period,amount,features) values
  ('basic-monthly','Suivi Sante Basic - Mensuel','basic','monthly',5000,'["Tableau de bord","Graphiques","Analyse simplifiee"]'),
  ('basic-quarterly','Suivi Sante Basic - Trimestriel','basic','quarterly',13500,'["Tableau de bord","Graphiques","Analyse simplifiee"]'),
  ('basic-yearly','Suivi Sante Basic - Annuel','basic','yearly',48000,'["Tableau de bord","Graphiques","Analyse simplifiee"]'),
  ('premium-monthly','Suivi Sante Premium - Mensuel','premium','monthly',12000,'["Tableau de bord","Analyse avancee","Rapports PDF","Teleconseils"]'),
  ('premium-quarterly','Suivi Sante Premium - Trimestriel','premium','quarterly',32400,'["Tableau de bord","Analyse avancee","Rapports PDF","Teleconseils"]'),
  ('premium-yearly','Suivi Sante Premium - Annuel','premium','yearly',115000,'["Tableau de bord","Analyse avancee","Rapports PDF","Teleconseils"]')
on conflict(id) do nothing;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.client_profiles(id) on delete cascade,
  plan_id text not null references public.subscription_plans(id),
  provider text not null check (provider in ('stripe','flutterwave','manual')),
  provider_subscription_id text,
  status text not null default 'pending' check (status in ('pending','active','past_due','cancelled','expired')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.client_profiles(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  provider text not null check (provider in ('stripe','flutterwave','manual')),
  provider_payment_id text,
  checkout_reference text not null unique,
  amount numeric not null, currency text not null,
  status text not null default 'pending' check (status in ('pending','succeeded','failed','refunded')),
  raw_event jsonb not null default '{}', paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.client_profiles(id) on delete cascade,
  period_start date not null, period_end date not null,
  professional_summary text not null, public_summary text not null,
  trends jsonb not null default '[]', improvements jsonb not null default '[]',
  risks jsonb not null default '[]', recommendations jsonb not null default '[]',
  model text not null default 'nvg-rules-v1', generated_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.client_profiles(id) on delete cascade,
  insight_id uuid references public.ai_insights(id) on delete set null,
  alert_type text not null check (alert_type in ('high_glucose','rapid_weight_gain','excessive_weight_loss','nutrition_risk','missing_data')),
  severity text not null check (severity in ('info','warning','critical')),
  title text not null, message text not null, metric_value numeric,
  acknowledged_at timestamptz, reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.health_reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.client_profiles(id) on delete cascade,
  insight_id uuid references public.ai_insights(id) on delete set null,
  period_start date not null, period_end date not null,
  title text not null, file_path text not null, status text not null default 'ready',
  generated_by uuid references auth.users(id), created_at timestamptz not null default now()
);

create table if not exists public.health_audit_logs (
  id bigint generated always as identity primary key,
  client_id uuid references public.client_profiles(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null, resource_type text not null, resource_id text,
  details jsonb not null default '{}', created_at timestamptz not null default now()
);

create index if not exists subscriptions_client_status on public.subscriptions(client_id,status);
create index if not exists payments_reference on public.payments(checkout_reference);
create index if not exists ai_insights_client_date on public.ai_insights(client_id,created_at desc);
create index if not exists alerts_client_open on public.alerts(client_id,acknowledged_at,created_at desc);
create index if not exists health_reports_client_date on public.health_reports(client_id,created_at desc);

alter table public.subscription_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.ai_insights enable row level security;
alter table public.alerts enable row level security;
alter table public.health_reports enable row level security;
alter table public.health_audit_logs enable row level security;

create policy "Public reads active plans" on public.subscription_plans for select using(active=true or public.is_admin());
create policy "Admins manage plans" on public.subscription_plans for all to authenticated using(public.is_admin()) with check(public.is_admin());

do $$ declare t text; begin
  foreach t in array array['subscriptions','payments','ai_insights','alerts','health_reports'] loop
    execute format('create policy "Health owner read %1$s" on public.%1$I for select to authenticated using(public.can_access_client(client_id))',t);
    execute format('create policy "Admins manage health %1$s" on public.%1$I for all to authenticated using(public.is_admin()) with check(public.is_admin())',t);
  end loop;
end $$;

create policy "Health audit authorized read" on public.health_audit_logs for select to authenticated
using(public.is_admin() or (client_id is not null and public.can_access_client(client_id)));
create policy "Health audit own insert" on public.health_audit_logs for insert to authenticated
with check(actor_id=(select auth.uid()) and client_id=(select auth.uid()));

-- Reports use the existing private document-vault bucket.
