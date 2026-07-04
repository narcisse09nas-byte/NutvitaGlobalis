-- Client child feeding, dietary diversity and vaccination assessments.
-- Run after client-platform-reliability.sql.

create table if not exists public.child_feeding_assessments (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  assessed_at date not null default current_date,
  age_months integer not null,
  module text not null check(module in ('iycf_6_23','dietary_diversity_24_plus')),
  breastfed boolean,
  solid_meals integer,
  formula_feeds integer,
  animal_milk_feeds integer,
  yogurt_drink_feeds integer,
  food_items jsonb not null default '{}'::jsonb,
  group_scores jsonb not null default '{}'::jsonb,
  diversity_score integer,
  mdd_met boolean,
  mmf_met boolean,
  mmff_met boolean,
  mad_met boolean,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.child_vaccination_assessments (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  assessed_at date not null default current_date,
  age_months integer not null,
  vaccines jsonb not null default '{}'::jsonb,
  due_count integer not null default 0,
  received_count integer not null default 0,
  up_to_date boolean not null default false,
  source text not null default 'health_card',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.health_dietary_diversity_assessments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.client_profiles(id) on delete cascade,
  assessed_at date not null default current_date,
  recall_period text not null default 'previous_day',
  food_items jsonb not null default '{}'::jsonb,
  group_scores jsonb not null default '{}'::jsonb,
  diversity_score integer not null,
  mddw_met boolean not null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists child_feeding_child_date on public.child_feeding_assessments(child_id,assessed_at desc);
create index if not exists child_vaccination_child_date on public.child_vaccination_assessments(child_id,assessed_at desc);
create index if not exists health_dietary_client_date on public.health_dietary_diversity_assessments(client_id,assessed_at desc);

alter table public.child_feeding_assessments enable row level security;
alter table public.child_vaccination_assessments enable row level security;
alter table public.health_dietary_diversity_assessments enable row level security;

drop policy if exists "Partners read consented dietary diversity" on public.health_dietary_diversity_assessments;
create policy "Partners read consented dietary diversity" on public.health_dietary_diversity_assessments
for select to authenticated using(
  public.is_admin() or exists(
    select 1 from public.professional_data_consents consent
    where consent.client_id=health_dietary_diversity_assessments.client_id
      and consent.partner_id=public.current_partner_id()
      and consent.scope='premium_health_record'
      and consent.granted=true
      and (consent.expires_at is null or consent.expires_at>now())
  )
  or exists(
    select 1 from public.client_care_collaborators share
    where share.client_id=health_dietary_diversity_assessments.client_id
      and share.collaborator_id=(select auth.uid())
      and share.active=true
  )
);

do $$
declare table_name text;
begin
  foreach table_name in array array['child_feeding_assessments','child_vaccination_assessments'] loop
    execute format('drop policy if exists %I on public.%I', 'Parents manage own ' || table_name, table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using(exists(select 1 from public.children c where c.id=child_id and c.parent_id=(select auth.uid()))) with check(exists(select 1 from public.children c where c.id=child_id and c.parent_id=(select auth.uid())))',
      'Parents manage own ' || table_name, table_name
    );
  end loop;
end $$;

drop policy if exists "Clients manage own dietary diversity" on public.health_dietary_diversity_assessments;
create policy "Clients manage own dietary diversity" on public.health_dietary_diversity_assessments
for all to authenticated using(client_id=(select auth.uid()) or public.is_admin())
with check(client_id=(select auth.uid()) or public.is_admin());

notify pgrst, 'reload schema';
