-- Risk and issue register upgrade. Run after ppm-wave6-quality-risks.sql.
alter table public.ppm_risks add column if not exists currency text not null default 'XAF';
alter table public.ppm_risk_reviews
  add column if not exists response_strategy text,
  add column if not exists owner_name text,
  add column if not exists action text;
alter table public.ppm_risk_reviews drop constraint if exists ppm_risk_reviews_response_strategy_check;
alter table public.ppm_risk_reviews add constraint ppm_risk_reviews_response_strategy_check check(response_strategy is null or response_strategy in ('avoid','mitigate','transfer','accept'));

alter table public.ppm_issues
  add column if not exists issue_code text,
  add column if not exists cost numeric(14,2),
  add column if not exists currency text not null default 'XAF';
create unique index if not exists ppm_issues_code_unique on public.ppm_issues(project_id,issue_code) where issue_code is not null;
create unique index if not exists ppm_risks_code_unique on public.ppm_risks(project_id,code) where code is not null;

create or replace function public.ppm_generate_ri_code(p_table text,p_project uuid) returns text language plpgsql security definer set search_path=public as $$
declare v_code text;
begin
 loop
  v_code:='RI-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,3));
  if p_table='risk' and not exists(select 1 from public.ppm_risks where project_id=p_project and code=v_code) then return v_code; end if;
  if p_table='issue' and not exists(select 1 from public.ppm_issues where project_id=p_project and issue_code=v_code) then return v_code; end if;
 end loop;
end $$;

create or replace function public.ppm_assign_risk_issue_code() returns trigger language plpgsql set search_path=public as $$
begin
 if tg_table_name='ppm_risks' and new.code is null then new.code:=public.ppm_generate_ri_code('risk',new.project_id); end if;
 if tg_table_name='ppm_issues' and new.issue_code is null then new.issue_code:=public.ppm_generate_ri_code('issue',new.project_id); end if;
 return new;
end $$;
drop trigger if exists ppm_assign_risk_code on public.ppm_risks;
create trigger ppm_assign_risk_code before insert on public.ppm_risks for each row execute function public.ppm_assign_risk_issue_code();
drop trigger if exists ppm_assign_issue_code on public.ppm_issues;
create trigger ppm_assign_issue_code before insert on public.ppm_issues for each row execute function public.ppm_assign_risk_issue_code();
update public.ppm_risks set code=public.ppm_generate_ri_code('risk',project_id) where code is null;
update public.ppm_issues set issue_code=public.ppm_generate_ri_code('issue',project_id) where issue_code is null;

create table if not exists public.ppm_issue_reviews(
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.ppm_projects(id) on delete cascade,
 issue_id uuid not null references public.ppm_issues(id) on delete cascade,
 review_date date not null default current_date,
 reviewer_name text,
 priority text not null check(priority in ('low','medium','high','critical')),
 owner_name text,
 due_date date,
 status_after text not null check(status_after in ('open','in_progress','resolved','closed')),
 action text,
 notes text,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create index if not exists ppm_issue_reviews_issue on public.ppm_issue_reviews(issue_id,created_at desc);
alter table public.ppm_issue_reviews enable row level security;
drop policy if exists "PPM users read issue reviews" on public.ppm_issue_reviews;
create policy "PPM users read issue reviews" on public.ppm_issue_reviews for select to authenticated using(public.ppm_project_access(project_id));
drop policy if exists "PPM managers manage issue reviews" on public.ppm_issue_reviews;
create policy "PPM managers manage issue reviews" on public.ppm_issue_reviews for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));

create or replace function public.ppm_guard_closed_review() returns trigger language plpgsql security definer set search_path=public set row_security=off as $$
begin
 if tg_table_name='ppm_risk_reviews' and exists(select 1 from public.ppm_risks where id=new.risk_id and status='closed') then raise exception 'Un risque cloture doit etre rouvert avant une nouvelle revue'; end if;
 if tg_table_name='ppm_issue_reviews' and exists(select 1 from public.ppm_issues where id=new.issue_id and status='closed') then raise exception 'Une issue cloturee doit etre rouverte avant une nouvelle revue'; end if;
 return new;
end $$;
drop trigger if exists ppm_guard_closed_risk_review on public.ppm_risk_reviews;
create trigger ppm_guard_closed_risk_review before insert on public.ppm_risk_reviews for each row execute function public.ppm_guard_closed_review();
drop trigger if exists ppm_guard_closed_issue_review on public.ppm_issue_reviews;
create trigger ppm_guard_closed_issue_review before insert on public.ppm_issue_reviews for each row execute function public.ppm_guard_closed_review();