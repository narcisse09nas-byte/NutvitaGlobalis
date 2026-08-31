-- Quality and asset workflow upgrade. Run after ppm-wave12-asset-inventory.sql and ppm-wave6-quality-risks.sql.
alter table public.ppm_quality_requirements
  add column if not exists requirement_code text,
  add column if not exists standards jsonb not null default '[]'::jsonb,
  add column if not exists workflow_status text not null default 'draft',
  add column if not exists control_state text not null default 'open';
alter table public.ppm_quality_requirements drop constraint if exists ppm_quality_requirements_workflow_status_check;
alter table public.ppm_quality_requirements add constraint ppm_quality_requirements_workflow_status_check check(workflow_status in ('draft','submitted','verified','approved','returned','rejected'));
alter table public.ppm_quality_requirements drop constraint if exists ppm_quality_requirements_control_state_check;
alter table public.ppm_quality_requirements add constraint ppm_quality_requirements_control_state_check check(control_state in ('open','closed_compliant'));
create unique index if not exists ppm_quality_requirements_code_unique on public.ppm_quality_requirements(project_id,requirement_code) where requirement_code is not null;

alter table public.ppm_quality_control_actuals add column if not exists control_code text;
create unique index if not exists ppm_quality_actuals_code_unique on public.ppm_quality_control_actuals(project_id,control_code) where control_code is not null;

alter table public.ppm_quality_evidence add column if not exists quality_control_actual_id uuid references public.ppm_quality_control_actuals(id) on delete cascade;
alter table public.ppm_quality_evidence alter column quality_requirement_id drop not null;
create index if not exists ppm_quality_evidence_actual on public.ppm_quality_evidence(quality_control_actual_id);

alter table public.ppm_resources add column if not exists asset_workflow_status text not null default 'draft';
alter table public.ppm_resources drop constraint if exists ppm_resources_asset_workflow_status_check;
alter table public.ppm_resources add constraint ppm_resources_asset_workflow_status_check check(asset_workflow_status in ('draft','submitted','verified','approved','returned','rejected'));

alter table public.ppm_equipment_checkouts
  add column if not exists assignment_code text,
  add column if not exists workflow_status text not null default 'draft';
alter table public.ppm_equipment_checkouts drop constraint if exists ppm_equipment_checkouts_workflow_status_check;
alter table public.ppm_equipment_checkouts add constraint ppm_equipment_checkouts_workflow_status_check check(workflow_status in ('draft','submitted','verified','approved','returned','rejected'));
create unique index if not exists ppm_equipment_checkouts_assignment_code_unique on public.ppm_equipment_checkouts(project_id,assignment_code) where assignment_code is not null;

create or replace function public.ppm_short_registry_code(p_prefix text) returns text language sql volatile as $$
  select p_prefix || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,5));
$$;
update public.ppm_quality_requirements set requirement_code=public.ppm_short_registry_code('QR') where requirement_code is null;
update public.ppm_quality_control_actuals set control_code=public.ppm_short_registry_code('QC') where control_code is null;
update public.ppm_equipment_checkouts set assignment_code=public.ppm_short_registry_code('ASG') where assignment_code is null;

create or replace function public.ppm_assign_quality_asset_codes() returns trigger language plpgsql set search_path=public as $$
begin
  if tg_table_name='ppm_quality_requirements' and new.requirement_code is null then new.requirement_code:=public.ppm_short_registry_code('QR'); end if;
  if tg_table_name='ppm_quality_control_actuals' and new.control_code is null then new.control_code:=public.ppm_short_registry_code('QC'); end if;
  if tg_table_name='ppm_equipment_checkouts' and new.assignment_code is null then new.assignment_code:=public.ppm_short_registry_code('ASG'); end if;
  return new;
end $$;
drop trigger if exists ppm_quality_requirement_code on public.ppm_quality_requirements;
create trigger ppm_quality_requirement_code before insert on public.ppm_quality_requirements for each row execute function public.ppm_assign_quality_asset_codes();
drop trigger if exists ppm_quality_actual_code on public.ppm_quality_control_actuals;
create trigger ppm_quality_actual_code before insert on public.ppm_quality_control_actuals for each row execute function public.ppm_assign_quality_asset_codes();
drop trigger if exists ppm_assignment_code on public.ppm_equipment_checkouts;
create trigger ppm_assignment_code before insert on public.ppm_equipment_checkouts for each row execute function public.ppm_assign_quality_asset_codes();

create or replace function public.ppm_guard_quality_control() returns trigger language plpgsql security definer set search_path=public set row_security=off as $$
declare v_state text; v_workflow text;
begin
  select control_state,workflow_status into v_state,v_workflow from public.ppm_quality_requirements where id=new.quality_requirement_id for update;
  if v_workflow<>'approved' then raise exception 'L exigence qualite doit etre approuvee avant son controle'; end if;
  if v_state='closed_compliant' then raise exception 'Cette exigence est deja conforme. Un validateur doit la rouvrir avant un nouveau controle'; end if;
  return new;
end $$;
drop trigger if exists ppm_guard_quality_control on public.ppm_quality_control_actuals;
create trigger ppm_guard_quality_control before insert on public.ppm_quality_control_actuals for each row execute function public.ppm_guard_quality_control();

create or replace function public.ppm_close_compliant_requirement() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.result='conforme' then update public.ppm_quality_requirements set control_state='closed_compliant',result='conforme',updated_at=now() where id=new.quality_requirement_id; end if;
  return new;
end $$;
drop trigger if exists ppm_close_compliant_requirement on public.ppm_quality_control_actuals;
create trigger ppm_close_compliant_requirement after insert or update of result on public.ppm_quality_control_actuals for each row execute function public.ppm_close_compliant_requirement();

alter table public.ppm_history drop constraint if exists ppm_history_entity_type_check;
alter table public.ppm_history add constraint ppm_history_entity_type_check check(entity_type in (
 'organization','portfolio','program','project','distribution_operation','distribution_site','ingredient_price','distribution_plan',
 'distribution_need','purchase_order','delivery_note','activity_report','invoice','partner_profile','asset','asset_assignment',
 'asset_inventory_session','quality_requirement','quality_control','ncr'
));