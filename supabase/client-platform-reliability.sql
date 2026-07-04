-- Client platform reliability and multi-service compatibility.
-- Run after accounts-growth-admin.sql, child-growth-who-upgrade.sql,
-- platform-compliance-ops.sql, multilingual-fr-en.sql and partner-collaboration.sql.

alter table public.client_profiles add column if not exists account_type text not null default 'client';
alter table public.client_profiles drop constraint if exists client_profiles_account_type_check;
alter table public.client_profiles add constraint client_profiles_account_type_check
  check(account_type='client');

-- Teleconsultation entitlement fields required by pack activation.
alter table public.consultation_bookings add column if not exists access_starts_at timestamptz;
alter table public.consultation_bookings add column if not exists access_expires_at timestamptz;
alter table public.consultation_bookings add column if not exists assigned_dietitian_id uuid references public.dietitian_profiles(id) on delete set null;
alter table public.consultation_bookings add column if not exists renewal_price_xof numeric not null default 10000;
create index if not exists consultation_bookings_client_access
  on public.consultation_bookings(client_id,access_expires_at desc);

-- Older recruitment migrations created a candidate profile for every Auth user.
-- Restrict that trigger to actual candidate accounts so client signup remains isolated.
create or replace function public.handle_candidate_user()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if coalesce(new.raw_user_meta_data->>'account_type','')='candidate' then
    insert into public.candidate_profiles(id,email,full_name)
    values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',''))
    on conflict(id) do nothing;
  end if;
  return new;
end $$;

alter table public.children add column if not exists state_code text;
alter table public.children add column if not exists country_code text;
alter table public.children add column if not exists other_city text;

alter table public.legal_documents add column if not exists document_key text;
alter table public.legal_documents add column if not exists current_version text not null default '1.0';
alter table public.legal_documents add column if not exists status text not null default 'draft';
alter table public.legal_documents add column if not exists requires_signature boolean not null default false;
alter table public.legal_documents add column if not exists signature_type text;
alter table public.legal_documents add column if not exists updated_at timestamptz not null default now();
alter table public.legal_documents alter column content set default '';
alter table public.legal_documents drop constraint if exists legal_documents_document_type_check;
alter table public.legal_documents add constraint legal_documents_document_type_check check(document_type in (
  'cgu','cgv','privacy','refund','teleconsultation_consent','medical_disclaimer',
  'terms_of_use','terms_of_sale','privacy_policy','cookie_policy','refund_policy',
  'health_monitoring_terms','child_growth_terms','dietitian_recruitment_terms',
  'dietitian_partnership_agreement','ai_usage_terms','liability_disclaimer'
));
update public.legal_documents
set document_key=coalesce(document_key,slug),
    current_version=coalesce(nullif(current_version,''),version,'1.0'),
    status=case when active then 'published' else 'unpublished' end
where document_key is null;
alter table public.legal_documents alter column document_key set not null;
create unique index if not exists legal_documents_document_key on public.legal_documents(document_key);

create table if not exists public.legal_translations (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.legal_documents(id) on delete cascade,
  document_key text not null,
  locale text not null check(locale in ('fr','en')),
  title text not null,
  content jsonb not null default '{}'::jsonb,
  version text not null default '1.0',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(document_id,locale)
);
create table if not exists public.legal_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.legal_documents(id) on delete cascade,
  document_key text not null,
  locale text not null check(locale in ('fr','en')),
  version text not null,
  title text not null,
  content jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check(status in ('draft','published','unpublished')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.legal_translations enable row level security;
alter table public.legal_document_versions enable row level security;
drop policy if exists "Published legal translations are public" on public.legal_translations;
create policy "Published legal translations are public" on public.legal_translations for select using(active=true);
drop policy if exists "Admins manage legal translations v2" on public.legal_translations;
create policy "Admins manage legal translations v2" on public.legal_translations for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "Admins manage legal document versions" on public.legal_document_versions;
create policy "Admins manage legal document versions" on public.legal_document_versions for all to authenticated using(public.is_admin()) with check(public.is_admin());

alter table public.user_consents add column if not exists source text;
alter table public.user_consents add column if not exists version text;
alter table public.subscriptions add column if not exists upgrade_from_subscription_id uuid references public.subscriptions(id) on delete set null;
alter table public.subscriptions add column if not exists purchase_action text not null default 'activate';
alter table public.subscriptions add column if not exists started_at timestamptz;
alter table public.subscriptions add column if not exists expires_at timestamptz;
alter table public.subscriptions add column if not exists current_period_start timestamptz;
alter table public.subscriptions add column if not exists current_period_end timestamptz;
alter table public.subscriptions add column if not exists renewal_period_months integer not null default 12;
alter table public.subscriptions add column if not exists extends_subscription_id uuid references public.subscriptions(id) on delete set null;

-- A complimentary Premium monitoring entitlement follows eligible 3-month packs.
-- Existing active packs are backfilled; new purchases are handled by payment finalization.
insert into public.subscriptions(
  client_id,child_id,plan_id,provider,status,started_at,expires_at,
  current_period_start,current_period_end,renewal_period_months,purchase_action
)
select
  booking.client_id,
  case when mapping.service_type='child_growth' then child.id else null end,
  plan.id,
  'manual',
  'active',
  coalesce(booking.access_starts_at,booking.created_at,now()),
  coalesce(booking.access_expires_at,coalesce(booking.access_starts_at,booking.created_at,now())+interval '3 months'),
  coalesce(booking.access_starts_at,booking.created_at,now()),
  coalesce(booking.access_expires_at,coalesce(booking.access_starts_at,booking.created_at,now())+interval '3 months'),
  3,
  'included_pack'
from public.consultation_bookings booking
join public.teleconseils pack on pack.id=booking.teleconseil_id
cross join lateral (
  select case
    when lower(pack.name) like '%diab_te%' or lower(pack.name) like '%perte de poids%' then 'health_tracking'
    when lower(pack.name) like '%femme enceinte%' or lower(pack.name) like '%nutrition infantile%' then 'child_growth'
  end service_type
) mapping
cross join lateral (
  select candidate.id
  from public.subscription_plans candidate
  where candidate.active=true and candidate.tier='premium' and candidate.service_type=mapping.service_type
  order by abs(coalesce(candidate.duration_months,12)-3),candidate.id
  limit 1
) plan
left join lateral (
  select c.id from public.children c
  where c.parent_id=booking.client_id and c.active=true
  order by c.created_at limit 1
) child on true
where mapping.service_type is not null
  and booking.status not in ('cancelled','refunded')
  and coalesce(booking.access_expires_at,now()+interval '3 months')>now()
  and not exists(
    select 1 from public.subscriptions existing
    where existing.client_id=booking.client_id
      and existing.plan_id=plan.id
      and existing.purchase_action='included_pack'
      and existing.status in ('active','pending')
  );

-- Pregnancy packs also include Premium autonomous health monitoring for
-- the pack period plus one additional month.
insert into public.subscriptions(
  client_id,child_id,plan_id,provider,status,started_at,expires_at,
  current_period_start,current_period_end,renewal_period_months,purchase_action
)
select
  booking.client_id,null,plan.id,'manual','active',
  coalesce(booking.access_starts_at,booking.created_at,now()),
  coalesce(booking.access_expires_at,coalesce(booking.access_starts_at,booking.created_at,now())+interval '3 months')+interval '1 month',
  coalesce(booking.access_starts_at,booking.created_at,now()),
  coalesce(booking.access_expires_at,coalesce(booking.access_starts_at,booking.created_at,now())+interval '3 months')+interval '1 month',
  4,'included_pack'
from public.consultation_bookings booking
join public.teleconseils pack on pack.id=booking.teleconseil_id
cross join lateral (
  select candidate.id
  from public.subscription_plans candidate
  where candidate.active=true and candidate.tier='premium' and candidate.service_type='health_tracking'
  order by abs(coalesce(candidate.duration_months,12)-3),candidate.id
  limit 1
) plan
where lower(pack.name) like '%femme enceinte%'
  and booking.status not in ('cancelled','refunded')
  and coalesce(booking.access_expires_at,now()+interval '3 months')>now()
  and not exists(
    select 1 from public.subscriptions existing
    where existing.client_id=booking.client_id
      and existing.plan_id=plan.id
      and existing.purchase_action='included_pack'
      and existing.status in ('active','pending')
  );

drop policy if exists "Clients assign included child growth entitlement" on public.subscriptions;
create or replace function public.assign_included_growth_subscription(p_subscription_id uuid,p_child_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
begin
  if not exists(select 1 from public.children where id=p_child_id and parent_id=(select auth.uid())) then
    raise exception 'Enfant non autorise';
  end if;
  update public.subscriptions
  set child_id=p_child_id
  where id=p_subscription_id
    and client_id=(select auth.uid())
    and purchase_action='included_pack'
    and child_id is null;
  return found;
end $$;
revoke all on function public.assign_included_growth_subscription(uuid,uuid) from public;
grant execute on function public.assign_included_growth_subscription(uuid,uuid) to authenticated;

-- Structured nutrition consultation record shared by partner and client.
alter table public.partner_consultations add column if not exists pack_type text;
alter table public.partner_consultations add column if not exists profile_snapshot jsonb not null default '{}'::jsonb;
alter table public.partner_consultations add column if not exists complaints jsonb not null default '[]'::jsonb;
alter table public.partner_consultations add column if not exists complaint_notes text;
alter table public.partner_consultations add column if not exists goals jsonb not null default '[]'::jsonb;
alter table public.partner_consultations add column if not exists care_plan jsonb not null default '{}'::jsonb;
alter table public.partner_consultations add column if not exists next_appointment_at timestamptz;
alter table public.partner_consultations add column if not exists prescription_items jsonb not null default '[]'::jsonb;
alter table public.partner_consultations add column if not exists prescription_notes text;
alter table public.partner_consultations add column if not exists prescription_pdf_path text;
alter table public.partner_consultations add column if not exists consultation_pdf_path text;
alter table public.partner_consultations add column if not exists finalized_at timestamptz;
alter table public.partner_consultations add column if not exists child_id uuid references public.children(id) on delete set null;
alter table public.partner_consultations add column if not exists clinical_assessments jsonb not null default '{}'::jsonb;
create index if not exists partner_consultations_client_finalized
  on public.partner_consultations(client_id,finalized_at desc);

create table if not exists public.professional_data_consents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.client_profiles(id) on delete cascade,
  partner_id uuid not null references public.dietitian_profiles(id) on delete cascade,
  scope text not null default 'premium_health_record' check(scope in ('premium_health_record','laboratory_results','care_collaboration')),
  granted boolean not null default false,
  granted_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(client_id,partner_id,scope)
);
alter table public.professional_data_consents add column if not exists consent_duration text not null default 'until_revoked';
alter table public.professional_data_consents add column if not exists consent_version text not null default '1.0';
alter table public.professional_data_consents drop constraint if exists professional_data_consents_duration_check;
alter table public.professional_data_consents add constraint professional_data_consents_duration_check
  check(consent_duration='until_revoked');
update public.professional_data_consents
set consent_duration='until_revoked',expires_at=null
where scope='premium_health_record';
create table if not exists public.consultation_lab_results (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid references public.partner_consultations(id) on delete set null,
  client_id uuid not null references public.client_profiles(id) on delete cascade,
  prescription_item text,
  performed_at date,
  laboratory_name text,
  result_values jsonb not null default '{}'::jsonb,
  interpretation_notes text,
  file_path text,
  shared_with_partner boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.client_care_collaborators (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.client_profiles(id) on delete cascade,
  partner_id uuid not null references public.dietitian_profiles(id) on delete cascade,
  collaborator_id uuid not null references auth.users(id) on delete cascade,
  active boolean not null default true,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique(client_id,collaborator_id)
);
create index if not exists consultation_lab_results_client_date on public.consultation_lab_results(client_id,performed_at desc);
alter table public.professional_data_consents enable row level security;
alter table public.consultation_lab_results enable row level security;
alter table public.client_care_collaborators enable row level security;
drop policy if exists "Clients manage professional data consent" on public.professional_data_consents;
create policy "Clients manage professional data consent" on public.professional_data_consents
for all to authenticated using(client_id=(select auth.uid()) or public.is_admin())
with check(client_id=(select auth.uid()) or public.is_admin());
drop policy if exists "Partners read granted consents" on public.professional_data_consents;
create policy "Partners read granted consents" on public.professional_data_consents
for select to authenticated using(partner_id=public.current_partner_id() or public.is_admin());
drop policy if exists "Clients manage own laboratory results" on public.consultation_lab_results;
create policy "Clients manage own laboratory results" on public.consultation_lab_results
for all to authenticated using(client_id=(select auth.uid()) or public.is_admin())
with check(client_id=(select auth.uid()) or public.is_admin());
drop policy if exists "Partners read consented laboratory results" on public.consultation_lab_results;
create policy "Partners read consented laboratory results" on public.consultation_lab_results
for select to authenticated using(
  public.is_admin() or (
    shared_with_partner=true
    and exists(
      select 1 from public.professional_data_consents consent
      where consent.client_id=consultation_lab_results.client_id
        and consent.partner_id=public.current_partner_id()
        and consent.scope in ('laboratory_results','care_collaboration')
        and consent.granted=true
        and (consent.expires_at is null or consent.expires_at>now())
    )
  ) or (
    shared_with_partner=true
    and exists(select 1 from public.client_care_collaborators share where share.client_id=consultation_lab_results.client_id and share.collaborator_id=(select auth.uid()) and share.active=true)
  )
);
drop policy if exists "Care team reads own assignments" on public.client_care_collaborators;
create policy "Care team reads own assignments" on public.client_care_collaborators
for select to authenticated using(client_id=(select auth.uid()) or collaborator_id=(select auth.uid()) or partner_id=public.current_partner_id() or public.is_admin());
drop policy if exists "Partners manage consented care team" on public.client_care_collaborators;
create policy "Partners manage consented care team" on public.client_care_collaborators
for all to authenticated
using(partner_id=public.current_partner_id() or public.is_admin())
with check(
  (partner_id=public.current_partner_id() or public.is_admin())
  and exists(select 1 from public.professional_data_consents consent where consent.client_id=client_care_collaborators.client_id and consent.partner_id=client_care_collaborators.partner_id and consent.scope='care_collaboration' and consent.granted=true)
);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('laboratory-results','laboratory-results',false,15728640,array['application/pdf','image/jpeg','image/png'])
on conflict(id) do nothing;
drop policy if exists "Clients upload own laboratory results" on storage.objects;
create policy "Clients upload own laboratory results" on storage.objects for insert to authenticated
with check(bucket_id='laboratory-results' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "Clients read own laboratory results" on storage.objects;
create policy "Clients read own laboratory results" on storage.objects for select to authenticated
using(bucket_id='laboratory-results' and (
  (storage.foldername(name))[1]=(select auth.uid())::text
  or public.is_admin()
  or exists(
    select 1 from public.professional_data_consents consent
    where consent.client_id::text=(storage.foldername(name))[1]
      and consent.partner_id=public.current_partner_id()
      and consent.scope in ('laboratory_results','care_collaboration')
      and consent.granted=true
      and (consent.expires_at is null or consent.expires_at>now())
  )
  or exists(select 1 from public.client_care_collaborators share where share.client_id::text=(storage.foldername(name))[1] and share.collaborator_id=(select auth.uid()) and share.active=true)
));

alter table public.payments add column if not exists source_amount_xof numeric;
alter table public.payments add column if not exists exchange_rate_xof_per_usd numeric;
alter table public.payments add column if not exists price_excluding_tax numeric;
alter table public.payments add column if not exists tax_rate numeric not null default 0;
alter table public.payments add column if not exists tax_amount numeric not null default 0;
alter table public.payments add column if not exists total_including_tax numeric;
alter table public.payments add column if not exists product_name text;
alter table public.payments add column if not exists purchase_type text not null default 'subscription';
alter table public.payments add column if not exists product_id text;
alter table public.payments add column if not exists manual_method text;
alter table public.payments add column if not exists invoice_id uuid references public.invoices(id) on delete set null;

create or replace function public.can_access_collaboration_call(p_call_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.is_admin()
    or exists(select 1 from public.collaboration_calls c where c.id=p_call_id and c.created_by=(select auth.uid()))
    or exists(select 1 from public.collaboration_call_members m where m.call_id=p_call_id and m.user_id=(select auth.uid()))
$$;
create or replace function public.can_manage_collaboration_call(p_call_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.is_admin()
    or exists(select 1 from public.collaboration_calls c where c.id=p_call_id and c.created_by=(select auth.uid()))
$$;
drop policy if exists "Call participants read" on public.collaboration_calls;
create policy "Call participants read" on public.collaboration_calls for select to authenticated using(public.can_access_collaboration_call(id));
drop policy if exists "Call participants read members" on public.collaboration_call_members;
create policy "Call participants read members" on public.collaboration_call_members for select to authenticated using(public.can_access_collaboration_call(call_id));
drop policy if exists "Call creators add members" on public.collaboration_call_members;
create policy "Call creators add members" on public.collaboration_call_members for insert to authenticated with check(public.can_manage_collaboration_call(call_id));

drop policy if exists "Parents update child measurements" on public.child_growth_measurements;
create policy "Parents update child measurements" on public.child_growth_measurements
for update to authenticated using(exists(select 1 from public.children c where c.id=child_id and c.parent_id=(select auth.uid())))
with check(exists(select 1 from public.children c where c.id=child_id and c.parent_id=(select auth.uid())));
drop policy if exists "Parents delete child measurements" on public.child_growth_measurements;
create policy "Parents delete child measurements" on public.child_growth_measurements
for delete to authenticated using(exists(select 1 from public.children c where c.id=child_id and c.parent_id=(select auth.uid())));

do $$
declare table_name text;
begin
  foreach table_name in array array['anthropometric_measurements','biological_measurements','food_history','health_lifestyle_assessments'] loop
    execute format('drop policy if exists %I on public.%I', 'Clients update own ' || table_name, table_name);
    execute format('create policy %I on public.%I for update to authenticated using(client_id=(select auth.uid())) with check(client_id=(select auth.uid()))', 'Clients update own ' || table_name, table_name);
    execute format('drop policy if exists %I on public.%I', 'Clients delete own ' || table_name, table_name);
    execute format('create policy %I on public.%I for delete to authenticated using(client_id=(select auth.uid()))', 'Clients delete own ' || table_name, table_name);
    execute format('drop policy if exists %I on public.%I', 'Partners read consented ' || table_name, table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using(public.is_admin() or exists(select 1 from public.professional_data_consents consent where consent.client_id=%I.client_id and consent.partner_id=public.current_partner_id() and consent.scope=''premium_health_record'' and consent.granted=true and (consent.expires_at is null or consent.expires_at>now())) or exists(select 1 from public.client_care_collaborators share where share.client_id=%I.client_id and share.collaborator_id=(select auth.uid()) and share.active=true))',
      'Partners read consented ' || table_name, table_name, table_name, table_name
    );
  end loop;
end $$;

notify pgrst, 'reload schema';
