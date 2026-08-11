-- Durable identifiers and registers for nutritionist consultations.
alter table public.client_profiles add column if not exists client_number text;
alter table public.client_profiles add column if not exists birth_date date;
alter table public.client_profiles add column if not exists sex text;
alter table public.client_profiles add column if not exists state_region text;
alter table public.client_profiles add column if not exists complaints text;
alter table public.client_profiles add column if not exists objectives text;

create or replace function public.nvg_compact_code(prefix text, suffix_length integer)
returns text language sql volatile set search_path=public as $$
 select upper(prefix || substr(md5(gen_random_uuid()::text || clock_timestamp()::text),1,suffix_length));
$$;
update public.client_profiles set client_number=public.nvg_compact_code('NVGC',6)
where client_number is null or client_number !~ '^NVGC[A-Z0-9]{6}$';
create unique index if not exists client_profiles_client_number_uidx on public.client_profiles(client_number);
create or replace function public.set_client_number() returns trigger language plpgsql set search_path=public as $$
begin
 if new.client_number is null or new.client_number !~ '^NVGC[A-Z0-9]{6}$' then new.client_number:=public.nvg_compact_code('NVGC',6); end if;
 return new;
end $$;
drop trigger if exists set_client_number on public.client_profiles;
create trigger set_client_number before insert on public.client_profiles for each row execute function public.set_client_number();

alter table public.consultation_waiting_room add column if not exists request_code text;
alter table public.consultation_waiting_room add column if not exists assigned_at timestamptz;
update public.consultation_waiting_room set request_code=public.nvg_compact_code('NVGR',6)
where request_code is null or request_code !~ '^NVGR[A-Z0-9]{6}$';
create unique index if not exists consultation_waiting_room_request_code_uidx on public.consultation_waiting_room(request_code);
create or replace function public.set_waiting_request_code() returns trigger language plpgsql set search_path=public as $$
begin
 if new.request_code is null then new.request_code:=public.nvg_compact_code('NVGR',6); end if;
 if tg_op='UPDATE' and new.selected_partner_id is distinct from old.selected_partner_id and new.selected_partner_id is not null then new.assigned_at:=now(); end if;
 return new;
end $$;
drop trigger if exists set_waiting_request_code on public.consultation_waiting_room;
create trigger set_waiting_request_code before insert or update on public.consultation_waiting_room for each row execute function public.set_waiting_request_code();

create table if not exists public.consultation_assignment_history(
 id uuid primary key default gen_random_uuid(), request_id uuid not null references public.consultation_waiting_room(id) on delete cascade,
 client_id uuid references public.client_profiles(id) on delete cascade,
 from_partner_id uuid references public.dietitian_profiles(id) on delete set null,
 to_partner_id uuid references public.dietitian_profiles(id) on delete set null,
 assigned_by uuid references auth.users(id) on delete set null,
 action text not null check(action in ('assigned','reassigned','taken','released')),
 notes text, created_at timestamptz not null default now()
);
create index if not exists consultation_assignment_history_request_idx on public.consultation_assignment_history(request_id,created_at desc);
alter table public.consultation_assignment_history enable row level security;
drop policy if exists "Relevant users read assignment history" on public.consultation_assignment_history;
create policy "Relevant users read assignment history" on public.consultation_assignment_history for select to authenticated using(
 public.is_admin() or exists(select 1 from public.dietitian_profiles d where d.candidate_id=auth.uid() and d.id in (from_partner_id,to_partner_id))
);

create or replace function public.audit_consultation_assignment() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.selected_partner_id is distinct from old.selected_partner_id then
  insert into public.consultation_assignment_history(request_id,client_id,from_partner_id,to_partner_id,assigned_by,action)
  values(new.id,new.client_id,old.selected_partner_id,new.selected_partner_id,auth.uid(),
   case when old.selected_partner_id is null then 'assigned' else 'reassigned' end);
 end if;
 return new;
end $$;
drop trigger if exists audit_consultation_assignment on public.consultation_waiting_room;
create trigger audit_consultation_assignment after update of selected_partner_id on public.consultation_waiting_room
for each row execute function public.audit_consultation_assignment();

alter table public.partner_consultations add column if not exists consultation_code text;
update public.partner_consultations set consultation_code=public.nvg_compact_code('NVGCO',5)
where consultation_code is null or consultation_code !~ '^NVGCO[A-Z0-9]{5}$';
create unique index if not exists partner_consultations_code_uidx on public.partner_consultations(consultation_code);
create or replace function public.set_consultation_code() returns trigger language plpgsql set search_path=public as $$
begin if new.consultation_code is null then new.consultation_code:=public.nvg_compact_code('NVGCO',5); end if; return new; end $$;
drop trigger if exists set_consultation_code on public.partner_consultations;
create trigger set_consultation_code before insert on public.partner_consultations for each row execute function public.set_consultation_code();

alter table public.collaboration_calls add column if not exists call_code text;
alter table public.collaboration_calls add column if not exists call_type text not null default 'consultation';
alter table public.collaboration_calls add column if not exists location_or_external_url text;
update public.collaboration_calls set call_code=public.nvg_compact_code('NVGM',6) where call_code is null;
create unique index if not exists collaboration_calls_code_uidx on public.collaboration_calls(call_code);

create table if not exists public.client_menu_plans(
 id uuid primary key default gen_random_uuid(), menu_code text not null unique default public.nvg_compact_code('NVGMN',5),
 partner_id uuid not null references public.dietitian_profiles(id) on delete cascade,
 client_id uuid not null references public.client_profiles(id) on delete cascade,
 period_start date not null, period_end date not null, title text not null default 'Plan alimentaire',
 status text not null default 'draft' check(status in ('draft','validated','archived')),
 planner_input jsonb not null default '{}'::jsonb, menu_payload jsonb not null default '{}'::jsonb,
 ai_analysis jsonb not null default '{}'::jsonb, generated_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), check(period_end>=period_start)
);
create index if not exists client_menu_plans_client_idx on public.client_menu_plans(client_id,generated_at desc);
alter table public.client_menu_plans enable row level security;
drop policy if exists "Partners manage client menu plans" on public.client_menu_plans;
create policy "Partners manage client menu plans" on public.client_menu_plans for all to authenticated using(
 public.is_admin() or exists(select 1 from public.dietitian_profiles d where d.id=partner_id and d.candidate_id=auth.uid())
) with check(public.is_admin() or exists(select 1 from public.dietitian_profiles d where d.id=partner_id and d.candidate_id=auth.uid()));
drop policy if exists "Clients read own validated menu plans" on public.client_menu_plans;
create policy "Clients read own validated menu plans" on public.client_menu_plans for select to authenticated using(client_id=auth.uid() and status='validated');

create table if not exists public.nutrition_24h_assessments(
 id uuid primary key default gen_random_uuid(), partner_id uuid references public.dietitian_profiles(id) on delete set null,
 client_id uuid not null references public.client_profiles(id) on delete cascade,
 consultation_id uuid references public.partner_consultations(id) on delete set null,
 assessment_date date not null default current_date, meals jsonb not null default '[]'::jsonb,
 nutrition_totals jsonb not null default '{}'::jsonb, ai_comments text, ai_recommendations text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.nutrition_24h_assessments enable row level security;
drop policy if exists "Care team manages 24h assessments" on public.nutrition_24h_assessments;
create policy "Care team manages 24h assessments" on public.nutrition_24h_assessments for all to authenticated using(
 client_id=auth.uid() or public.is_admin() or exists(select 1 from public.dietitian_profiles d where d.id=partner_id and d.candidate_id=auth.uid())
) with check(client_id=auth.uid() or public.is_admin() or exists(select 1 from public.dietitian_profiles d where d.id=partner_id and d.candidate_id=auth.uid()));
