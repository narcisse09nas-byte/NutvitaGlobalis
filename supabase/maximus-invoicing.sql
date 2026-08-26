-- Maximus centralized invoicing (Wave 1: schema foundation) — service/consultation purchases,
-- proforma quotes, partner point-of-sale meal invoices, plus the two on-site-creation permission
-- toggles and the medical waiting-room nullability fix they depend on.
-- Run after maximus-access-control.sql, maximus-treasury-ledger.sql,
-- maximus-online-services-finance-and-admin-workflows.sql, medical-specialist-platform.sql,
-- partner-advanced-workflows.sql, consultation-request-workflow.sql, accounts-growth-admin.sql.

create table if not exists public.maximus_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  invoice_type text not null check(invoice_type in ('service','proforma','pos_meals')),
  status text not null default 'draft' check(status in ('draft','submitted','endorsed','rejected','cancelled','issued')),
  purchase_type text check(purchase_type is null or purchase_type in ('subscription','medical_consultation','dietetic_consultation','other','meals')),
  client_id uuid references public.client_profiles(id) on delete set null,
  client_name text,
  client_email text,
  client_phone text,
  client_address text,
  partner_vendor_id uuid references public.partner_vendor_registry(id) on delete set null,
  consultation_id uuid references public.medical_consultations(id) on delete set null,
  dietetic_waiting_room_id uuid references public.consultation_waiting_room(id) on delete set null,
  assigned_specialist_type text check(assigned_specialist_type is null or assigned_specialist_type in ('medical_specialist','dietitian')),
  assigned_specialist_id uuid,
  sent_to_waiting_room boolean not null default false,
  currency text not null default 'XOF',
  price_excluding_tax numeric(14,2) not null default 0,
  tax_rate numeric(5,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total_including_tax numeric(14,2) not null default 0,
  payment_method text check(payment_method is null or payment_method in ('Especes','Virement bancaire','Mobile Money','Cheque','Carte bancaire')),
  payment_reference text,
  period_months int,
  starts_at timestamptz,
  expires_at timestamptz,
  notes text,
  submitted_at timestamptz,
  submitted_by uuid references auth.users(id) on delete set null,
  endorsed_at timestamptz,
  endorsed_by uuid references auth.users(id) on delete set null,
  endorsement_account_id uuid references public.maximus_financial_accounts(id) on delete set null,
  endorsement_reference text,
  rejected_at timestamptz,
  rejected_by uuid references auth.users(id) on delete set null,
  rejection_reason text,
  new_client_temp_password_sent boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.maximus_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.maximus_invoices(id) on delete cascade,
  position int not null default 1,
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(14,2) not null default 0,
  line_total numeric(14,2) not null default 0
);

-- Invoice numbering — mirrors partner_vendor_registry's next_partner_vendor_number()/
-- set_partner_vendor_number() trigger pattern, prefixed per document type.
create sequence if not exists public.maximus_invoice_number_seq start 1;

create or replace function public.next_maximus_invoice_number(p_type text)
returns text language plpgsql security definer set search_path=public as $$
declare prefix text; serial_value bigint;
begin
  prefix:=case p_type when 'service' then 'NVG-FA' when 'proforma' then 'NVG-PF' else 'NVG-PV' end;
  serial_value:=nextval('public.maximus_invoice_number_seq');
  return prefix||'-'||to_char(now(),'YYYY')||'-'||lpad(serial_value::text,6,'0');
end $$;

create or replace function public.set_maximus_invoice_number()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.invoice_number is null or btrim(new.invoice_number)='' then
    new.invoice_number:=public.next_maximus_invoice_number(new.invoice_type);
  end if;
  return new;
end $$;
drop trigger if exists maximus_invoice_number_before_insert on public.maximus_invoices;
create trigger maximus_invoice_number_before_insert before insert on public.maximus_invoices
for each row execute function public.set_maximus_invoice_number();

drop trigger if exists set_updated_at on public.maximus_invoices;
create trigger set_updated_at before update on public.maximus_invoices
for each row execute function public.set_updated_at();

create index if not exists maximus_invoices_status_idx on public.maximus_invoices(invoice_type,status,created_at desc);
create index if not exists maximus_invoices_client_idx on public.maximus_invoices(client_id);
create index if not exists maximus_invoices_partner_idx on public.maximus_invoices(partner_vendor_id);
create index if not exists maximus_invoice_lines_invoice_idx on public.maximus_invoice_lines(invoice_id,position);

alter table public.maximus_invoices enable row level security;
alter table public.maximus_invoice_lines enable row level security;

drop policy if exists "Maximus invoicing viewers read invoices" on public.maximus_invoices;
create policy "Maximus invoicing viewers read invoices" on public.maximus_invoices for select to authenticated
using(public.maximus_has_access('finance/invoicing','viewer') or client_id=(select auth.uid()));

drop policy if exists "Maximus invoicing creators insert invoices" on public.maximus_invoices;
create policy "Maximus invoicing creators insert invoices" on public.maximus_invoices for insert to authenticated
with check(public.maximus_has_access('finance/invoicing','creator') and created_by=(select auth.uid()));

drop policy if exists "Maximus invoicing editors update invoices" on public.maximus_invoices;
create policy "Maximus invoicing editors update invoices" on public.maximus_invoices for update to authenticated
using(public.maximus_has_access('finance/invoicing','editor') or public.maximus_has_access('finance/invoicing','validator'))
with check(public.maximus_has_access('finance/invoicing','editor') or public.maximus_has_access('finance/invoicing','validator'));

drop policy if exists "Maximus invoicing viewers read lines" on public.maximus_invoice_lines;
create policy "Maximus invoicing viewers read lines" on public.maximus_invoice_lines for select to authenticated
using(exists(select 1 from public.maximus_invoices i where i.id=invoice_id and (public.maximus_has_access('finance/invoicing','viewer') or i.client_id=(select auth.uid()))));

drop policy if exists "Maximus invoicing creators write lines" on public.maximus_invoice_lines;
create policy "Maximus invoicing creators write lines" on public.maximus_invoice_lines for all to authenticated
using(exists(select 1 from public.maximus_invoices i where i.id=invoice_id and public.maximus_has_access('finance/invoicing','creator')))
with check(exists(select 1 from public.maximus_invoices i where i.id=invoice_id and public.maximus_has_access('finance/invoicing','creator')));

-- Endorsement — mirrors confirm_maximus_settlement() 1:1: row-locked, service_role-only, flips
-- status and records one revenue transaction in the shared treasury ledger.
create or replace function public.endorse_maximus_invoice(
  p_invoice_id uuid, p_account_id uuid, p_reference text, p_actor uuid
) returns public.maximus_invoices
language plpgsql security definer set search_path=public as $$
declare invoice public.maximus_invoices; account public.maximus_financial_accounts;
begin
  select * into invoice from public.maximus_invoices where id=p_invoice_id and status='submitted' and invoice_type='service' for update;
  if invoice.id is null then raise exception 'invoice_unavailable'; end if;
  select * into account from public.maximus_financial_accounts where id=p_account_id and active for share;
  if account.id is null then raise exception 'financial_account_unavailable'; end if;
  update public.maximus_invoices set status='endorsed', endorsed_at=now(), endorsed_by=p_actor,
    endorsement_account_id=account.id, endorsement_reference=p_reference
  where id=invoice.id returning * into invoice;
  insert into public.maximus_treasury_transactions(direction,financial_account_id,amount,currency,category,description,source_type,source_id,reference,recorded_by)
  values('revenue',account.id,invoice.total_including_tax,invoice.currency,'Facturation',
    'Facture '||invoice.invoice_number,'maximus_invoices',invoice.id,coalesce(nullif(p_reference,''),invoice.invoice_number),p_actor)
  on conflict(source_type,source_id,direction) do nothing;
  return invoice;
end $$;
revoke all on function public.endorse_maximus_invoice(uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.endorse_maximus_invoice(uuid,uuid,text,uuid) to service_role;

-- Partner registry: point-of-sale (restaurant/meal-service) partners, reusing the existing
-- admin-managed vendor registry rather than a parallel table (staff-only, no partner login).
alter table public.partner_vendor_registry drop constraint if exists partner_vendor_registry_partner_type_check;
alter table public.partner_vendor_registry add constraint partner_vendor_registry_partner_type_check
  check(partner_type in ('nutritionist','medical_specialist','promoter','supplier','point_de_vente','other'));

create or replace function public.next_partner_vendor_number(p_type text)
returns text language plpgsql security definer set search_path=public as $$
declare prefix text; serial_value bigint;
begin
  prefix:=case p_type
    when 'medical_specialist' then 'NVGM' when 'nutritionist' then 'NVGN' when 'promoter' then 'NVGP'
    when 'supplier' then 'NVGF' when 'point_de_vente' then 'NVGD' else 'NVGX' end;
  serial_value:=nextval('public.partner_vendor_number_seq');
  return prefix||upper(lpad(to_hex(serial_value),4,'0'));
end $$;

-- Two symmetric on-site-creation permission toggles, admin-grantable/revocable per staff member.
alter table public.medical_specialists add column if not exists free_onsite_creation boolean not null default false;
alter table public.medical_specialists add column if not exists free_onsite_creation_granted_by uuid references auth.users(id) on delete set null;
alter table public.medical_specialists add column if not exists free_onsite_creation_granted_at timestamptz;

alter table public.dietitian_profiles add column if not exists free_onsite_creation boolean not null default false;
alter table public.dietitian_profiles add column if not exists free_onsite_creation_granted_by uuid references auth.users(id) on delete set null;
alter table public.dietitian_profiles add column if not exists free_onsite_creation_granted_at timestamptz;

-- Medical "waiting room" support: specialist_id was left not-null by every prior migration
-- (confirmed), which made a true unassigned state impossible, unlike the dietetic side
-- (consultation_waiting_room.selected_partner_id is already nullable). Relaxing it here lets a
-- purchase send a client to any available doctor rather than forcing an immediate assignment.
alter table public.medical_consultations alter column specialist_id drop not null;
alter table public.medical_consultations drop constraint if exists medical_consultations_status_check;
alter table public.medical_consultations add constraint medical_consultations_status_check
  check(status in ('pending_assignment','requested','accepted_pending_payment','scheduled','completed','cancelled'));
alter table public.medical_consultations drop constraint if exists medical_consultations_specialist_assignment_check;
alter table public.medical_consultations add constraint medical_consultations_specialist_assignment_check
  check((status='pending_assignment' and specialist_id is null) or (status<>'pending_assignment' and specialist_id is not null));

drop policy if exists "Active specialists claim unassigned consultations" on public.medical_consultations;
create policy "Active specialists claim unassigned consultations" on public.medical_consultations
for update to authenticated
using(status='pending_assignment' and specialist_id is null and exists(select 1 from public.medical_specialists s where s.user_id=(select auth.uid()) and s.active))
with check(status='scheduled' and exists(select 1 from public.medical_specialists s where s.id=specialist_id and s.user_id=(select auth.uid())));

insert into public.system_email_templates(id,name,subject,body_text) values
('maximus_invoice_client_credentials','Identifiants client (facturation Maximus)','Votre compte NutVitaGlobalis',
 'Bonjour {{name}},\n\nUn compte a ete cree pour vous suite a votre achat aupres de NutVitaGlobalis.\n\nIdentifiant : {{username}}\nMot de passe temporaire : {{password}}\n\nVous devrez changer ce mot de passe des votre premiere connexion.\n\nEquipe NutVitaGlobalis')
on conflict(id) do nothing;
