-- Run after health-analytics.sql.

alter table public.client_profiles add column if not exists whatsapp_phone text;
alter table public.client_profiles add column if not exists country text;
alter table public.client_profiles add column if not exists country_code text;
alter table public.client_profiles add column if not exists state_region text;
alter table public.client_profiles add column if not exists city_code text;
alter table public.client_profiles add column if not exists other_city text;
alter table public.client_profiles add column if not exists accepted_terms_at timestamptz;
alter table public.client_profiles add column if not exists accepted_privacy_at timestamptz;

alter table public.candidate_profiles add column if not exists whatsapp_phone text;
alter table public.candidate_profiles add column if not exists country text;
alter table public.candidate_profiles add column if not exists country_code text;
alter table public.candidate_profiles add column if not exists state_region text;
alter table public.candidate_profiles add column if not exists city text;
alter table public.candidate_profiles add column if not exists other_city text;
alter table public.candidate_profiles add column if not exists accepted_terms_at timestamptz;
alter table public.candidate_profiles add column if not exists accepted_privacy_at timestamptz;

alter table public.admin_users add column if not exists whatsapp_phone text;
alter table public.admin_users add column if not exists country text;
alter table public.admin_users add column if not exists country_code text;
alter table public.admin_users add column if not exists state_region text;
alter table public.admin_users add column if not exists city text;
alter table public.admin_users add column if not exists other_city text;
alter table public.admin_users add column if not exists role text not null default 'editor'
  check(role in ('super_admin','administrator','editor','support','finance'));
alter table public.admin_users add column if not exists permissions jsonb not null default '[]';
alter table public.admin_users add column if not exists last_login_at timestamptz;
alter table public.admin_users add column if not exists invited_by uuid references auth.users(id);
alter table public.admin_users add column if not exists accepted_terms_at timestamptz;
alter table public.admin_users add column if not exists accepted_privacy_at timestamptz;

create or replace function public.handle_client_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if coalesce(new.raw_user_meta_data->>'account_type','')='client' then
    insert into public.client_profiles(id,full_name,email,whatsapp_phone,country,country_code,state_region,city,other_city,accepted_terms_at,accepted_privacy_at)
    values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),new.email,new.raw_user_meta_data->>'whatsapp_phone',new.raw_user_meta_data->>'country',new.raw_user_meta_data->>'country_code',new.raw_user_meta_data->>'state_region',new.raw_user_meta_data->>'city',new.raw_user_meta_data->>'other_city',(new.raw_user_meta_data->>'accepted_terms_at')::timestamptz,(new.raw_user_meta_data->>'accepted_privacy_at')::timestamptz)
    on conflict(id) do update set full_name=excluded.full_name,whatsapp_phone=excluded.whatsapp_phone,country=excluded.country,country_code=excluded.country_code,state_region=excluded.state_region,city=excluded.city,other_city=excluded.other_city,accepted_terms_at=excluded.accepted_terms_at,accepted_privacy_at=excluded.accepted_privacy_at;
  end if; return new;
end $$;

create or replace function public.handle_candidate_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if coalesce(new.raw_user_meta_data->>'account_type','')='candidate' then
    insert into public.candidate_profiles(id,email,full_name,whatsapp_phone,country,country_code,state_region,city,other_city,accepted_terms_at,accepted_privacy_at)
    values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',''),new.raw_user_meta_data->>'whatsapp_phone',new.raw_user_meta_data->>'country',new.raw_user_meta_data->>'country_code',new.raw_user_meta_data->>'state_region',new.raw_user_meta_data->>'city',new.raw_user_meta_data->>'other_city',(new.raw_user_meta_data->>'accepted_terms_at')::timestamptz,(new.raw_user_meta_data->>'accepted_privacy_at')::timestamptz)
    on conflict(id) do update set full_name=excluded.full_name,whatsapp_phone=excluded.whatsapp_phone,country=excluded.country,country_code=excluded.country_code,state_region=excluded.state_region,city=excluded.city,other_city=excluded.other_city,accepted_terms_at=excluded.accepted_terms_at,accepted_privacy_at=excluded.accepted_privacy_at;
  end if; return new;
end $$;

create or replace function public.is_super_admin() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.admin_users where id=(select auth.uid()) and active=true and role='super_admin');
$$;

create table if not exists public.tax_rates (
  id uuid primary key default gen_random_uuid(),
  name text not null, country_code text,
  rate numeric(6,3) not null check(rate >= 0 and rate <= 100),
  active boolean not null default true,
  effective_from date not null default current_date,
  effective_to date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
insert into public.tax_rates(name,country_code,rate) select 'Taxe par defaut',null,0
where not exists(select 1 from public.tax_rates);

alter table public.subscription_plans add column if not exists service_type text not null default 'health_tracking'
  check(service_type in ('health_tracking','child_growth'));
alter table public.subscription_plans add column if not exists duration_months integer not null default 12;
alter table public.subscription_plans add column if not exists price_excluding_tax numeric;
update public.subscription_plans set active=false where service_type='health_tracking';
insert into public.subscription_plans(id,name,tier,billing_period,amount,currency,features,active,service_type,duration_months,price_excluding_tax)
values
('health-autonomous-yearly','Suivi Sante Autonome','basic','yearly',10000,'XOF','["Tableau de bord","Graphiques","Analyses","Rapports PDF"]',true,'health_tracking',12,10000),
('child-growth-yearly','Suivi Promotion Croissance Enfant','premium','yearly',10000,'XOF','["Courbes de croissance","Historique des mesures","Analyses et conseils"]',true,'child_growth',12,10000)
on conflict(id) do update set name=excluded.name,amount=excluded.amount,active=true,service_type=excluded.service_type,duration_months=12,price_excluding_tax=10000,features=excluded.features;

create table if not exists public.children (
  id uuid primary key default gen_random_uuid(), parent_id uuid not null references public.client_profiles(id) on delete cascade,
  full_name text not null, sex text not null check(sex in ('female','male','other')),
  birth_date date not null, birth_weight_kg numeric, birth_length_cm numeric,
  country text, state_region text, city text, photo_path text,
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.child_growth_measurements (
  id uuid primary key default gen_random_uuid(), child_id uuid not null references public.children(id) on delete cascade,
  measured_at timestamptz not null default now(), weight_kg numeric, height_cm numeric,
  head_circumference_cm numeric, muac_cm numeric, edema boolean not null default false,
  notes text, recorded_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.child_growth_insights (
  id uuid primary key default gen_random_uuid(), child_id uuid not null references public.children(id) on delete cascade,
  summary text not null, advice text not null, flags jsonb not null default '[]',
  generated_at timestamptz not null default now(), generated_by uuid references auth.users(id)
);
alter table public.subscriptions add column if not exists child_id uuid references public.children(id) on delete cascade;
alter table public.subscriptions add column if not exists started_at timestamptz;
alter table public.subscriptions add column if not exists expires_at timestamptz;
alter table public.subscriptions add column if not exists renewal_period_months integer not null default 12;

alter table public.payments add column if not exists price_excluding_tax numeric;
alter table public.payments add column if not exists tax_rate numeric not null default 0;
alter table public.payments add column if not exists tax_amount numeric not null default 0;
alter table public.payments add column if not exists total_including_tax numeric;
alter table public.payments add column if not exists invoice_id uuid;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(), invoice_number text not null unique,
  client_id uuid not null references public.client_profiles(id) on delete cascade,
  payment_id uuid not null unique references public.payments(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  price_excluding_tax numeric not null, tax_rate numeric not null, tax_amount numeric not null,
  total_including_tax numeric not null, currency text not null default 'XOF', file_path text,
  issued_at timestamptz not null default now(), created_at timestamptz not null default now()
);
alter table public.payments drop constraint if exists payments_invoice_id_fkey;
alter table public.payments add constraint payments_invoice_id_fkey foreign key(invoice_id) references public.invoices(id) on delete set null;

create table if not exists public.system_email_templates (
  id text primary key, name text not null, subject text not null, body_text text not null,
  active boolean not null default true, updated_by uuid references auth.users(id), updated_at timestamptz not null default now()
);
insert into public.system_email_templates(id,name,subject,body_text) values
('account_welcome','Bienvenue compte','Bienvenue sur NutVitaGlobalis','Bonjour {{name}},\n\nVotre compte NutVitaGlobalis a ete cree.\n\nEquipe NutVitaGlobalis'),
('payment_confirmed','Paiement confirme','Confirmation de votre abonnement NutVitaGlobalis','Bonjour {{name}},\n\nVotre paiement de {{total}} {{currency}} est confirme. Votre abonnement est actif du {{start_date}} au {{end_date}}.\n\nVotre facture est disponible dans votre espace.\n\nEquipe NutVitaGlobalis'),
('admin_invitation','Invitation administrateur','Invitation a administrer NutVitaGlobalis','Bonjour {{name}},\n\nVous avez ete invite a rejoindre l administration NutVitaGlobalis. Utilisez le lien recu pour definir votre mot de passe.\n\nEquipe NutVitaGlobalis')
on conflict(id) do nothing;
create table if not exists public.system_email_logs (
  id uuid primary key default gen_random_uuid(), template_id text references public.system_email_templates(id),
  recipient text not null, subject text not null, status text not null check(status in ('queued','sent','failed')),
  provider_id text, error_message text, metadata jsonb not null default '{}', sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists children_parent on public.children(parent_id,active);
create index if not exists child_growth_date on public.child_growth_measurements(child_id,measured_at desc);
create index if not exists tax_rates_country_active on public.tax_rates(country_code,active,effective_from desc);
create index if not exists invoices_client_date on public.invoices(client_id,issued_at desc);

alter table public.tax_rates enable row level security;
alter table public.children enable row level security;
alter table public.child_growth_measurements enable row level security;
alter table public.child_growth_insights enable row level security;
alter table public.invoices enable row level security;
alter table public.system_email_templates enable row level security;
alter table public.system_email_logs enable row level security;

create policy "Public reads current taxes" on public.tax_rates for select using(active=true);
create policy "Admins manage taxes" on public.tax_rates for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Parents manage children" on public.children for all to authenticated using(parent_id=(select auth.uid()) or public.is_admin()) with check(parent_id=(select auth.uid()) or public.is_admin());
create policy "Parents read child measurements" on public.child_growth_measurements for select to authenticated using(exists(select 1 from public.children c where c.id=child_id and (c.parent_id=(select auth.uid()) or public.is_admin())));
create policy "Parents add child measurements" on public.child_growth_measurements for insert to authenticated with check(exists(select 1 from public.children c where c.id=child_id and c.parent_id=(select auth.uid())));
create policy "Parents read child insights" on public.child_growth_insights for select to authenticated using(exists(select 1 from public.children c where c.id=child_id and (c.parent_id=(select auth.uid()) or public.is_admin())));
create policy "Invoices owner read" on public.invoices for select to authenticated using(client_id=(select auth.uid()) or public.is_admin());
create policy "Admins manage invoices" on public.invoices for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Admins manage email templates" on public.system_email_templates for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Admins read email logs" on public.system_email_logs for select to authenticated using(public.is_admin());
create policy "Super admins manage admins" on public.admin_users for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());

do $$ begin
  if exists(select 1 from public.admin_users) and not exists(select 1 from public.admin_users where role='super_admin') then
    update public.admin_users set role='super_admin' where id=(select id from public.admin_users order by created_at limit 1);
  end if;
end $$;
