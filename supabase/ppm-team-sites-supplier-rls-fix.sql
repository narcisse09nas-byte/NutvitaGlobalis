-- Team, supplier and site hardening. Safe to run more than once.

-- Break the old self-referencing ppm_resources policy chain. SECURITY DEFINER plus
-- row_security=off keeps the lookup outside the caller's ppm_resources policies.
create or replace function public.ppm_can_read_assigned_asset(p_resource_id uuid)
returns boolean
language sql stable security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.ppm_equipment_checkouts c
    join public.ppm_resources staff_r on staff_r.id = c.assigned_resource_id
    where c.resource_id = p_resource_id
      and staff_r.user_id = (select auth.uid())
  );
$$;
revoke all on function public.ppm_can_read_assigned_asset(uuid) from public;
grant execute on function public.ppm_can_read_assigned_asset(uuid) to authenticated;
drop policy if exists "PPM staff read assigned asset resources" on public.ppm_resources;
create policy "PPM staff read assigned asset resources" on public.ppm_resources
for select to authenticated using (public.ppm_can_read_assigned_asset(id));

-- Site codes are generated server-side as AAA999 and remain unique per project.
create unique index if not exists ppm_sites_project_site_code_unique
  on public.ppm_sites(project_id, site_code) where site_code is not null;
create or replace function public.ppm_generate_site_code()
returns trigger language plpgsql security definer set search_path=public as $$
declare prefix text; seq integer;
begin
  if nullif(trim(new.site_code),'') is not null then return new; end if;
  prefix := upper(substr(regexp_replace(coalesce(new.site_name,'SITE'),'[^[:alpha:]]','','g'),1,3));
  prefix := rpad(coalesce(nullif(prefix,''),'SIT'),3,'X');
  select coalesce(max(substring(site_code from 4 for 3)::integer),0)+1 into seq
  from public.ppm_sites where project_id=new.project_id and site_code like prefix||'___';
  new.site_code := prefix || lpad(seq::text,3,'0');
  return new;
end $$;
drop trigger if exists ppm_sites_generate_code on public.ppm_sites;
create trigger ppm_sites_generate_code before insert on public.ppm_sites
for each row execute function public.ppm_generate_site_code();

-- A supplier contract updates (or creates) the project supplier register from the
-- organization supplier master record, avoiding divergent phone/email/address copies.
create or replace function public.ppm_sync_supplier_from_contract()
returns trigger language plpgsql security definer set search_path=public set row_security=off as $$
declare org_supplier public.ppm_organization_suppliers%rowtype; existing_id uuid;
begin
  if new.party_type <> 'supplier' then return new; end if;
  select * into org_supplier from public.ppm_organization_suppliers where id=new.party_id;
  select id into existing_id from public.ppm_suppliers
    where project_id=new.project_id and lower(name)=lower(new.party_name) order by created_at limit 1;
  if existing_id is null then
    insert into public.ppm_suppliers(project_id,name,category,contact_name,contact_email,contact_phone,address,notes,status)
    values(new.project_id,new.party_name,case when org_supplier.category in ('goods','services','works','consultancy','logistics','other') then org_supplier.category else 'services' end,org_supplier.contact_name,org_supplier.contact_email,org_supplier.contact_phone,org_supplier.address,'Synchronise depuis le contrat '||new.contract_number,'active');
  else
    update public.ppm_suppliers set contact_name=coalesce(org_supplier.contact_name,contact_name),contact_email=coalesce(org_supplier.contact_email,contact_email),contact_phone=coalesce(org_supplier.contact_phone,contact_phone),address=coalesce(org_supplier.address,address),updated_at=now() where id=existing_id;
  end if;
  return new;
end $$;
drop trigger if exists ppm_project_contract_sync_supplier on public.ppm_project_contracts;
create trigger ppm_project_contract_sync_supplier after insert or update of party_id,party_name,contract_number,status on public.ppm_project_contracts
for each row execute function public.ppm_sync_supplier_from_contract();
