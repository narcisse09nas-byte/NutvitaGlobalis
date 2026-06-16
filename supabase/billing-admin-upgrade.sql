-- Run after commerce-payments.sql.
-- Billing administration, scoped taxes, webhook audit and compatibility views.

alter table public.tax_rates add column if not exists applies_to_formations boolean not null default true;
alter table public.tax_rates add column if not exists applies_to_consultations boolean not null default true;
alter table public.tax_rates add column if not exists applies_to_subscriptions boolean not null default true;

insert into public.tax_rates(name,country_code,rate,active,effective_from,applies_to_formations,applies_to_consultations,applies_to_subscriptions)
select 'TVA Cameroun', 'CM', 19.250, true, current_date, true, true, true
where not exists(select 1 from public.tax_rates where country_code='CM');

alter table public.invoices add column if not exists product_name text;
alter table public.invoices add column if not exists purchase_type text;
alter table public.invoices add column if not exists payment_provider text;
alter table public.invoices add column if not exists payment_status text not null default 'paid';
alter table public.invoices add column if not exists client_name text;
alter table public.invoices add column if not exists client_email text;

create table if not exists public.payment_webhook_logs (
  id uuid primary key default gen_random_uuid(), provider text not null,
  event_type text not null, external_id text, checkout_reference text,
  payment_id uuid references public.payments(id) on delete set null,
  processing_status text not null default 'received' check(processing_status in ('received','processed','ignored','failed')),
  payload jsonb not null default '{}', error_message text,
  created_at timestamptz not null default now(), processed_at timestamptz
);
create index if not exists webhook_logs_provider_date on public.payment_webhook_logs(provider,created_at desc);
alter table public.payment_webhook_logs enable row level security;
create policy "Admins read payment webhook logs" on public.payment_webhook_logs for select to authenticated using(public.is_admin());
create policy "Admins manage payment webhook logs" on public.payment_webhook_logs for all to authenticated using(public.is_admin()) with check(public.is_admin());

-- Reserved structures for later promotions, installments and wallet features.
create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(), code text not null unique,
  discount_type text not null check(discount_type in ('percent','fixed')),
  discount_value numeric not null check(discount_value>=0), active boolean not null default true,
  starts_at timestamptz, ends_at timestamptz, max_uses integer, use_count integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.promo_codes enable row level security;
create policy "Admins manage promo codes" on public.promo_codes for all to authenticated using(public.is_admin()) with check(public.is_admin());

-- Compatibility names requested by the product specification.
create or replace view public.users with (security_invoker=true) as select id,email,full_name,created_at from public.client_profiles;
create or replace view public.products with (security_invoker=true) as
  select id,'formation'::text as product_type,title as name,price,'XOF'::text as currency,status from public.formations
  union all select id,'consultation',name,price,'XOF',status from public.teleconseils;
create or replace view public.orders with (security_invoker=true) as select * from public.payments;
create or replace view public.taxes with (security_invoker=true) as select * from public.tax_rates;
create or replace view public.purchased_courses with (security_invoker=true) as select * from public.formation_enrollments;
create or replace view public.email_logs with (security_invoker=true) as select * from public.system_email_logs;

insert into public.system_email_templates(id,name,subject,body_text) values
('payment_failed','Paiement echoue','Votre paiement NutVitaGlobalis a echoue','Bonjour {{name}},\n\nLe paiement pour {{product}} n a pas abouti. Vous pouvez reprendre votre commande depuis votre espace client.\n\n{{action_url}}\n\nEquipe NutVitaGlobalis'),
('invoice_available','Facture disponible','Votre facture NutVitaGlobalis est disponible','Bonjour {{name}},\n\nLa facture {{invoice_number}} est disponible dans votre espace client.\n\n{{action_url}}\n\nEquipe NutVitaGlobalis'),
('subscription_confirmed','Abonnement active','Votre abonnement Suivi Sante est actif','Bonjour {{name}},\n\nVotre abonnement {{product}} est actif jusqu au {{end_date}}.\n\n{{action_url}}\n\nEquipe NutVitaGlobalis'),
('consultation_reminder','Rappel consultation','Rappel de votre consultation NutVitaGlobalis','Bonjour {{name}},\n\nVotre consultation est prevue le {{date}}.\n\n{{action_url}}\n\nEquipe NutVitaGlobalis'),
('consultation_changed','Consultation modifiee','Modification de votre consultation','Bonjour {{name}},\n\nVotre consultation a ete {{change}}. Consultez votre espace pour les details.\n\n{{action_url}}\n\nEquipe NutVitaGlobalis'),
('course_access_activated','Acces formation active','Votre acces a la formation est actif','Bonjour {{name}},\n\nVotre acces a {{product}} est maintenant actif.\n\n{{action_url}}\n\nEquipe NutVitaGlobalis'),
('subscription_expiring','Abonnement bientot expire','Votre abonnement expire bientot','Bonjour {{name}},\n\nVotre abonnement {{product}} expire le {{end_date}}.\n\n{{action_url}}\n\nEquipe NutVitaGlobalis'),
('subscription_renewed','Abonnement renouvele','Votre abonnement a ete renouvele','Bonjour {{name}},\n\nVotre abonnement {{product}} est renouvele jusqu au {{end_date}}.\n\n{{action_url}}\n\nEquipe NutVitaGlobalis'),
('admin_purchase_notification','Achat client','Nouvel achat NutVitaGlobalis','Un paiement de {{total}} {{currency}} a ete confirme pour {{name}} : {{product}}.\n\n{{action_url}}\n\nEquipe NutVitaGlobalis')
on conflict(id) do nothing;

update public.system_email_templates set
  subject='Paiement NutVitaGlobalis confirme',
  body_text='Bonjour {{name}},\n\nVotre paiement pour {{product}} d un montant de {{total}} {{currency}} est confirme. Votre facture est disponible dans votre espace client.\n\n{{action_url}}\n\nEquipe NutVitaGlobalis'
where id='payment_confirmed';
