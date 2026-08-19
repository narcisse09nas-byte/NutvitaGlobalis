-- Synchronisation automatique des partenaires recrutés avec le registre Finance Maximus.
-- À exécuter après maximus-online-services-finance-and-admin-workflows.sql.

create or replace function public.sync_partner_vendor_registry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_type text;
  v_name text;
  v_email text;
  v_phone text;
  v_country text;
  v_region text;
  v_city text;
  v_status text;
  v_source text := tg_table_name;
begin
  if tg_table_name = 'dietitian_profiles' then
    v_user_id := new.candidate_id;
    v_type := 'nutritionist';
    v_name := new.full_name;
    select email into v_email from auth.users where id = new.candidate_id;
    v_status := case when new.status = 'active' then 'active' else 'inactive' end;
  elsif tg_table_name = 'medical_specialists' then
    v_user_id := new.user_id;
    v_type := 'medical_specialist';
    v_name := new.full_name;
    v_email := new.email;
    v_country := new.country;
    v_region := new.state_region;
    v_city := new.city;
    v_status := case when new.active then 'active' else 'inactive' end;
  elsif tg_table_name = 'promoter_profiles' then
    v_user_id := new.candidate_id;
    v_type := 'promoter';
    v_name := new.full_name;
    v_email := new.email;
    v_phone := new.phone;
    v_status := case when new.status = 'active' then 'active' else 'inactive' end;
  else
    return new;
  end if;

  insert into public.partner_vendor_registry(
    user_id, vendor_number, partner_type, source_table, source_id,
    full_name, email, phone, country, state_region, city, status, recruited_at
  ) values (
    v_user_id, public.next_partner_vendor_number(v_type), v_type, v_source, new.id,
    coalesce(v_name, v_email, 'Partenaire NutVitaGlobalis'), v_email, v_phone,
    v_country, v_region, v_city, v_status, now()
  )
  on conflict(source_table, source_id) do update set
    user_id = excluded.user_id,
    full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone,
    country = coalesce(excluded.country, partner_vendor_registry.country),
    state_region = coalesce(excluded.state_region, partner_vendor_registry.state_region),
    city = coalesce(excluded.city, partner_vendor_registry.city),
    status = excluded.status,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_dietitian_vendor on public.dietitian_profiles;
create trigger sync_dietitian_vendor
after insert or update of status, full_name, candidate_id on public.dietitian_profiles
for each row execute function public.sync_partner_vendor_registry();

drop trigger if exists sync_medical_specialist_vendor on public.medical_specialists;
create trigger sync_medical_specialist_vendor
after insert or update of active, full_name, email, country, state_region, city, user_id on public.medical_specialists
for each row execute function public.sync_partner_vendor_registry();

drop trigger if exists sync_promoter_vendor on public.promoter_profiles;
create trigger sync_promoter_vendor
after insert or update of status, full_name, email, phone, candidate_id on public.promoter_profiles
for each row execute function public.sync_partner_vendor_registry();
