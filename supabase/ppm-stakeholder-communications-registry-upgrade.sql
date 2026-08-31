-- Stakeholder and communication registries upgrade.
-- Run after ppm-communication-stakeholder-actuals.sql.
alter table public.ppm_stakeholders add column if not exists stakeholder_code text;
alter table public.ppm_communication_items add column if not exists communication_code text;
alter table public.ppm_communication_items add column if not exists stakeholder_ids uuid[] not null default '{}';
alter table public.ppm_communication_actuals add column if not exists actual_code text;
alter table public.ppm_communication_actuals drop constraint if exists ppm_communication_actuals_status_check;
update public.ppm_communication_actuals set status=case when status='completed' then 'submitted' when status='validated' then 'approved' else status end;
alter table public.ppm_communication_actuals add constraint ppm_communication_actuals_status_check check(status in ('draft','submitted','verified','approved','returned','rejected'));
alter table public.ppm_stakeholder_interactions add column if not exists interaction_code text;
alter table public.ppm_stakeholder_interactions add column if not exists stakeholder_ids uuid[] not null default '{}';
alter table public.ppm_stakeholder_interactions add column if not exists interaction_type_other text;
create unique index if not exists ppm_stakeholders_code_unique on public.ppm_stakeholders(project_id,stakeholder_code) where stakeholder_code is not null;
create unique index if not exists ppm_communication_items_code_unique on public.ppm_communication_items(project_id,communication_code) where communication_code is not null;
create unique index if not exists ppm_communication_actuals_code_unique on public.ppm_communication_actuals(project_id,actual_code) where actual_code is not null;
create unique index if not exists ppm_stakeholder_interactions_code_unique on public.ppm_stakeholder_interactions(project_id,interaction_code) where interaction_code is not null;

create or replace function public.ppm_comm_code(p_prefix text) returns text language sql volatile as $$select p_prefix||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,3))$$;
create or replace function public.ppm_assign_comm_codes() returns trigger language plpgsql set search_path=public as $$
begin
 if tg_table_name='ppm_stakeholders' and new.stakeholder_code is null then new.stakeholder_code:=public.ppm_comm_code('STKH'); end if;
 if tg_table_name='ppm_communication_items' and new.communication_code is null then new.communication_code:=public.ppm_comm_code('ComPl'); end if;
 if tg_table_name='ppm_communication_actuals' and new.actual_code is null then new.actual_code:=public.ppm_comm_code('ComRl'); end if;
 if tg_table_name='ppm_stakeholder_interactions' and new.interaction_code is null then new.interaction_code:=public.ppm_comm_code('ComIn'); end if;
 return new;
end $$;
drop trigger if exists ppm_stakeholder_code on public.ppm_stakeholders; create trigger ppm_stakeholder_code before insert on public.ppm_stakeholders for each row execute function public.ppm_assign_comm_codes();
drop trigger if exists ppm_communication_plan_code on public.ppm_communication_items; create trigger ppm_communication_plan_code before insert on public.ppm_communication_items for each row execute function public.ppm_assign_comm_codes();
drop trigger if exists ppm_communication_actual_code on public.ppm_communication_actuals; create trigger ppm_communication_actual_code before insert on public.ppm_communication_actuals for each row execute function public.ppm_assign_comm_codes();
drop trigger if exists ppm_interaction_code on public.ppm_stakeholder_interactions; create trigger ppm_interaction_code before insert on public.ppm_stakeholder_interactions for each row execute function public.ppm_assign_comm_codes();
update public.ppm_stakeholders set stakeholder_code=public.ppm_comm_code('STKH') where stakeholder_code is null;
update public.ppm_communication_items set communication_code=public.ppm_comm_code('ComPl'),stakeholder_ids=case when stakeholder_id is null then '{}'::uuid[] else array[stakeholder_id] end where communication_code is null;
update public.ppm_communication_actuals set actual_code=public.ppm_comm_code('ComRl') where actual_code is null;
update public.ppm_stakeholder_interactions set interaction_code=public.ppm_comm_code('ComIn'),stakeholder_ids=array[stakeholder_id] where interaction_code is null;

create table if not exists public.ppm_stakeholder_reviews(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.ppm_projects(id) on delete cascade,stakeholder_id uuid not null references public.ppm_stakeholders(id) on delete cascade,review_date date not null default current_date,reviewer_name text,influence_level text not null check(influence_level in ('low','medium','high')),interest_level text not null check(interest_level in ('low','medium','high')),position text not null check(position in ('champion','supporter','neutral','critic','blocker')),status text not null,engagement_strategies text[] not null default '{}',notes text,created_by uuid references auth.users(id),created_at timestamptz not null default now());
create table if not exists public.ppm_communication_plan_reviews(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.ppm_projects(id) on delete cascade,communication_item_id uuid not null references public.ppm_communication_items(id) on delete cascade,review_date date not null default current_date,reviewer_name text,responsible_name text,status text not null,next_date date,last_sent_date date,notes text,created_by uuid references auth.users(id),created_at timestamptz not null default now());
create table if not exists public.ppm_stakeholder_interaction_reviews(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.ppm_projects(id) on delete cascade,interaction_id uuid not null references public.ppm_stakeholder_interactions(id) on delete cascade,review_date date not null default current_date,reviewer_name text,proposed_position text,proposed_influence_level text,proposed_interest_level text,position_change_status text,approval_date date,notes text,created_by uuid references auth.users(id),created_at timestamptz not null default now());

create table if not exists public.ppm_communication_actions(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.ppm_projects(id) on delete cascade,action_code text,source_type text not null check(source_type in ('direct','communication_actual','stakeholder_interaction')),source_id uuid,title text not null,responsible_name text,due_date date,status text not null default 'open' check(status in ('open','in_progress','completed','cancelled')),created_by uuid references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create unique index if not exists ppm_communication_actions_code_unique on public.ppm_communication_actions(project_id,action_code) where action_code is not null;
create table if not exists public.ppm_communication_action_reviews(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.ppm_projects(id) on delete cascade,action_id uuid not null references public.ppm_communication_actions(id) on delete cascade,review_date date not null default current_date,reviewer_name text,responsible_name text,due_date date,status text not null,notes text,created_by uuid references auth.users(id),created_at timestamptz not null default now());
create or replace function public.ppm_assign_comm_action_code() returns trigger language plpgsql set search_path=public as $$begin if new.action_code is null then new.action_code:=public.ppm_comm_code('ComAc');end if;return new;end$$;
drop trigger if exists ppm_comm_action_code on public.ppm_communication_actions; create trigger ppm_comm_action_code before insert on public.ppm_communication_actions for each row execute function public.ppm_assign_comm_action_code();

alter table public.ppm_stakeholder_reviews enable row level security; alter table public.ppm_communication_plan_reviews enable row level security; alter table public.ppm_stakeholder_interaction_reviews enable row level security; alter table public.ppm_communication_actions enable row level security; alter table public.ppm_communication_action_reviews enable row level security;
drop policy if exists "PPM manage stakeholder reviews" on public.ppm_stakeholder_reviews; create policy "PPM manage stakeholder reviews" on public.ppm_stakeholder_reviews for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));
drop policy if exists "PPM manage communication plan reviews" on public.ppm_communication_plan_reviews; create policy "PPM manage communication plan reviews" on public.ppm_communication_plan_reviews for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));
drop policy if exists "PPM manage interaction reviews" on public.ppm_stakeholder_interaction_reviews; create policy "PPM manage interaction reviews" on public.ppm_stakeholder_interaction_reviews for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));
drop policy if exists "PPM manage communication actions" on public.ppm_communication_actions; create policy "PPM manage communication actions" on public.ppm_communication_actions for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));
drop policy if exists "PPM manage communication action reviews" on public.ppm_communication_action_reviews; create policy "PPM manage communication action reviews" on public.ppm_communication_action_reviews for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));