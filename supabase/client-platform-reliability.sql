-- Client platform reliability and multi-service compatibility.
-- Run after accounts-growth-admin.sql, child-growth-who-upgrade.sql,
-- platform-compliance-ops.sql, multilingual-fr-en.sql and partner-collaboration.sql.

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
  end loop;
end $$;

notify pgrst, 'reload schema';
