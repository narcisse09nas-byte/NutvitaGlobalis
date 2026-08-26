-- NutVita PPM — Scope Baseline & Change Control V2
-- Idempotent extension. Run after ppm-wbs-baseline-change.sql and ppm-project-cadrage.sql.

alter table public.ppm_change_requests
  add column if not exists request_code text,
  add column if not exists baseline_id uuid references public.ppm_scope_baselines(id) on delete set null;

alter table public.ppm_scope_baselines
  add column if not exists change_request_id uuid references public.ppm_change_requests(id) on delete restrict,
  add column if not exists scope_snapshot jsonb,
  add column if not exists wbs_snapshot jsonb,
  add column if not exists dictionary_snapshot jsonb;

alter table public.ppm_scope_statements
  add column if not exists change_request_id uuid references public.ppm_change_requests(id) on delete set null;

alter table public.ppm_wbs_nodes
  add column if not exists change_request_id uuid references public.ppm_change_requests(id) on delete set null;

create unique index if not exists ppm_change_requests_request_code_unique
  on public.ppm_change_requests(request_code) where request_code is not null;
create unique index if not exists ppm_scope_baselines_change_request_unique
  on public.ppm_scope_baselines(change_request_id) where change_request_id is not null;
create index if not exists ppm_wbs_nodes_change_request on public.ppm_wbs_nodes(change_request_id);

create sequence if not exists public.ppm_change_request_code_seq;

create or replace function public.ppm_assign_change_request_code()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status = 'approved' and new.request_code is null then
    new.request_code := 'CR-' || lpad(nextval('public.ppm_change_request_code_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists ppm_change_request_code_on_approval on public.ppm_change_requests;
create trigger ppm_change_request_code_on_approval
before insert or update of status on public.ppm_change_requests
for each row execute function public.ppm_assign_change_request_code();

-- Backfill already-approved requests without changing their workflow state.
update public.ppm_change_requests
set request_code = 'CR-' || lpad(nextval('public.ppm_change_request_code_seq')::text, 6, '0')
where status in ('approved','implemented') and request_code is null;

create or replace function public.ppm_lock_scope_baseline(p_baseline_id uuid)
returns public.ppm_scope_baselines
language plpgsql security definer set search_path=public as $$
declare
  v_baseline public.ppm_scope_baselines;
  v_scope jsonb;
  v_wbs jsonb;
begin
  select * into v_baseline from public.ppm_scope_baselines where id=p_baseline_id for update;
  if v_baseline.id is null then raise exception 'Baseline introuvable'; end if;
  if not public.ppm_project_access(v_baseline.project_id) then raise exception 'Accès refusé'; end if;
  if v_baseline.status <> 'approved' then raise exception 'La baseline doit être approuvée avant verrouillage'; end if;

  select to_jsonb(s) into v_scope from public.ppm_scope_statements s where s.project_id=v_baseline.project_id;
  select coalesce(jsonb_agg(to_jsonb(w) order by w.order_index,w.created_at),'[]'::jsonb)
    into v_wbs from public.ppm_wbs_nodes w where w.project_id=v_baseline.project_id;

  update public.ppm_scope_baselines set
    status='baseline', approved_at=coalesce(approved_at,now()),
    scope_snapshot=v_scope, wbs_snapshot=v_wbs, dictionary_snapshot=v_wbs,
    updated_at=now()
  where id=p_baseline_id returning * into v_baseline;

  if v_baseline.change_request_id is not null then
    update public.ppm_change_requests set baseline_id=v_baseline.id, updated_at=now()
    where id=v_baseline.change_request_id;
  end if;
  return v_baseline;
end;
$$;

grant execute on function public.ppm_lock_scope_baseline(uuid) to authenticated;
-- Database-level guard: UI locking cannot be bypassed by direct API writes.
create or replace function public.ppm_guard_scope_baseline_content()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  v_project_id uuid;
  v_change_request_id uuid;
  v_latest public.ppm_scope_baselines;
begin
  if tg_op='DELETE' then v_project_id:=old.project_id; v_change_request_id:=old.change_request_id;
  else v_project_id:=new.project_id; v_change_request_id:=new.change_request_id; end if;
  select * into v_latest from public.ppm_scope_baselines
  where project_id=v_project_id order by version desc limit 1;
  if v_latest.id is null then if tg_op='DELETE' then return old; else return new; end if; end if;
  if v_latest.status <> 'draft' then
    raise exception 'Scope Baseline verrouillée ou en approbation: modification interdite';
  end if;
  if tg_op<>'DELETE' and v_latest.change_request_id is not null and v_change_request_id is distinct from v_latest.change_request_id then
    raise exception 'La modification doit référencer la Change Request approuvée %',v_latest.change_request_id;
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end;
$$;

drop trigger if exists ppm_guard_scope_statement_write on public.ppm_scope_statements;
create trigger ppm_guard_scope_statement_write
before insert or update or delete on public.ppm_scope_statements
for each row execute function public.ppm_guard_scope_baseline_content();

drop trigger if exists ppm_guard_wbs_write on public.ppm_wbs_nodes;
create trigger ppm_guard_wbs_write
before insert or update or delete on public.ppm_wbs_nodes
for each row execute function public.ppm_guard_scope_baseline_content();

create or replace function public.ppm_guard_change_implementation()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='implemented' and old.status is distinct from 'implemented' then
    if not exists(select 1 from public.ppm_scope_baselines b where b.change_request_id=new.id and b.status='baseline') then
      raise exception 'La Change Request ne peut être mise en œuvre avant approbation et verrouillage de sa nouvelle baseline';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists ppm_change_implementation_requires_baseline on public.ppm_change_requests;
create trigger ppm_change_implementation_requires_baseline
before update of status on public.ppm_change_requests
for each row execute function public.ppm_guard_change_implementation();