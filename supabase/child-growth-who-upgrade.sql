-- Run after accounts-growth-admin.sql.
-- The reference table intentionally contains no clinical values. Import the
-- official WHO Child Growth Standards dataset before using z-scores clinically.

alter table public.children add column if not exists country_code text;
alter table public.children add column if not exists other_city text;
alter table public.children add column if not exists guardian_name text;
alter table public.children add column if not exists guardian_relationship text;
alter table public.children add column if not exists medical_history text;
alter table public.children add column if not exists allergies text;
alter table public.children add column if not exists feeding_mode text;
alter table public.children add column if not exists currently_breastfed boolean;
alter table public.children add column if not exists premature_birth boolean not null default false;

update public.subscription_plans
set name='Suivi Sante Autonome', tier='basic', billing_period='yearly', amount=10000,
    price_excluding_tax=10000, duration_months=12, active=true,
    features='["Tableau de bord","Graphiques et tendances","Analyses simplifiees","Suivi pendant 12 mois"]'::jsonb
where id='health-autonomous-yearly';
update public.subscription_plans
set name='Suivi Promotion Croissance Enfant', billing_period='yearly', amount=10000,
    price_excluding_tax=10000, duration_months=12, active=true
where id='child-growth-yearly';

alter table public.child_growth_measurements add column if not exists age_months numeric(7,2);
alter table public.child_growth_measurements add column if not exists appetite text;
alter table public.child_growth_measurements add column if not exists breastfeeding_status text;
alter table public.child_growth_measurements add column if not exists complementary_feeding text;
alter table public.child_growth_measurements add column if not exists recent_illnesses text;
alter table public.child_growth_measurements add column if not exists vaccinations_up_to_date boolean;
alter table public.child_growth_measurements add column if not exists bmi numeric(7,2);
alter table public.child_growth_measurements add column if not exists weight_for_age_z numeric(7,3);
alter table public.child_growth_measurements add column if not exists height_for_age_z numeric(7,3);
alter table public.child_growth_measurements add column if not exists weight_for_height_z numeric(7,3);
alter table public.child_growth_measurements add column if not exists bmi_for_age_z numeric(7,3);
alter table public.child_growth_measurements add column if not exists head_circumference_for_age_z numeric(7,3);
alter table public.child_growth_measurements add column if not exists interpretation text;
alter table public.child_growth_measurements add column if not exists risk_category text;

create table if not exists public.who_growth_standards (
  id bigint generated always as identity primary key,
  indicator text not null check(indicator in ('weight_for_age','height_for_age','weight_for_height','bmi_for_age','head_circumference_for_age')),
  sex text not null check(sex in ('female','male')),
  age_months numeric(7,2),
  length_height_cm numeric(7,2),
  l numeric not null,
  m numeric not null check(m > 0),
  s numeric not null check(s > 0),
  source_version text not null default 'WHO Child Growth Standards',
  imported_at timestamptz not null default now(),
  check(age_months is not null or length_height_cm is not null)
);
create unique index if not exists who_growth_age_reference
  on public.who_growth_standards(indicator,sex,age_months) where age_months is not null;
create unique index if not exists who_growth_height_reference
  on public.who_growth_standards(indicator,sex,length_height_cm) where length_height_cm is not null;
alter table public.who_growth_standards enable row level security;
create policy "Authenticated read WHO growth standards" on public.who_growth_standards
  for select to authenticated using(true);
create policy "Admins manage WHO growth standards" on public.who_growth_standards
  for all to authenticated using(public.is_admin()) with check(public.is_admin());

create policy "Admins manage child growth measurements" on public.child_growth_measurements
  for all to authenticated using(public.is_admin()) with check(public.is_admin());

create or replace function public.lms_z_score(value numeric,l numeric,m numeric,s numeric)
returns numeric language sql immutable as $$
  select case when value is null or value <= 0 then null
    when l = 0 then ln(value / m) / s
    else (power(value / m,l) - 1) / (l * s) end;
$$;

create or replace function public.prepare_child_growth_measurement()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  child_record public.children%rowtype;
  reference_record public.who_growth_standards%rowtype;
  lowest_z numeric;
begin
  select * into child_record from public.children where id=new.child_id;
  new.age_months := round((extract(epoch from (new.measured_at - child_record.birth_date::timestamptz))/2629800)::numeric,2);
  if new.weight_kg > 0 and new.height_cm > 0 then
    new.bmi := round((new.weight_kg / power(new.height_cm / 100,2))::numeric,2);
  end if;

  if child_record.sex in ('female','male') then
    select * into reference_record from public.who_growth_standards where indicator='weight_for_age' and sex=child_record.sex and age_months is not null order by abs(age_months-new.age_months) limit 1;
    if found then new.weight_for_age_z := round(public.lms_z_score(new.weight_kg,reference_record.l,reference_record.m,reference_record.s),3); end if;
    select * into reference_record from public.who_growth_standards where indicator='height_for_age' and sex=child_record.sex and age_months is not null order by abs(age_months-new.age_months) limit 1;
    if found then new.height_for_age_z := round(public.lms_z_score(new.height_cm,reference_record.l,reference_record.m,reference_record.s),3); end if;
    select * into reference_record from public.who_growth_standards where indicator='bmi_for_age' and sex=child_record.sex and age_months is not null order by abs(age_months-new.age_months) limit 1;
    if found then new.bmi_for_age_z := round(public.lms_z_score(new.bmi,reference_record.l,reference_record.m,reference_record.s),3); end if;
    select * into reference_record from public.who_growth_standards where indicator='head_circumference_for_age' and sex=child_record.sex and age_months is not null order by abs(age_months-new.age_months) limit 1;
    if found then new.head_circumference_for_age_z := round(public.lms_z_score(new.head_circumference_cm,reference_record.l,reference_record.m,reference_record.s),3); end if;
    select * into reference_record from public.who_growth_standards where indicator='weight_for_height' and sex=child_record.sex and length_height_cm is not null order by abs(length_height_cm-new.height_cm) limit 1;
    if found then new.weight_for_height_z := round(public.lms_z_score(new.weight_kg,reference_record.l,reference_record.m,reference_record.s),3); end if;
  end if;

  select min(value) into lowest_z from unnest(array[new.weight_for_age_z,new.height_for_age_z,new.weight_for_height_z,new.bmi_for_age_z]) value;
  if new.edema or (new.age_months between 6 and 59 and new.muac_cm < 11.5) or lowest_z < -3 then
    new.risk_category := 'high'; new.interpretation := 'Risque eleve - evaluation professionnelle rapide recommandee';
  elsif (new.age_months between 6 and 59 and new.muac_cm < 12.5) or lowest_z < -2 then
    new.risk_category := 'moderate'; new.interpretation := 'Vigilance nutritionnelle - avis professionnel recommande';
  elsif lowest_z is null then
    new.risk_category := 'unclassified'; new.interpretation := 'Reference OMS non importee ou donnees insuffisantes';
  else
    new.risk_category := 'usual'; new.interpretation := 'Mesure dans la zone de suivi habituelle';
  end if;
  return new;
end $$;

drop trigger if exists prepare_child_growth_measurement on public.child_growth_measurements;
create trigger prepare_child_growth_measurement before insert or update on public.child_growth_measurements
for each row execute function public.prepare_child_growth_measurement();
