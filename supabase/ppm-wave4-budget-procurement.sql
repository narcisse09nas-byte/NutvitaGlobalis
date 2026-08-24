-- Refinement program, Wave 4: Budget category hierarchy, Purchase Order uniqueness, and a
-- reusable "finalized records are immutable except for super-admins" trigger (item 33 — the
-- template every later wave's registers reuse rather than a bespoke lock per entity).
-- Run after ppm-project-cadrage.sql, ppm-budget.sql (or equivalent) and ppm-procurement-quality.sql.

create table if not exists public.ppm_budget_categories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  parent_id uuid references public.ppm_budget_categories(id) on delete cascade,
  title text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists ppm_budget_categories_project on public.ppm_budget_categories(project_id, parent_id);

alter table public.ppm_budget_lines add column if not exists budget_category_id uuid references public.ppm_budget_categories(id) on delete set null;

alter table public.ppm_budget_categories enable row level security;
drop policy if exists "PPM users read budget categories" on public.ppm_budget_categories;
create policy "PPM users read budget categories" on public.ppm_budget_categories for select to authenticated using(public.ppm_project_access(project_id));
drop policy if exists "PPM managers manage budget categories" on public.ppm_budget_categories;
create policy "PPM managers manage budget categories" on public.ppm_budget_categories for all to authenticated using(public.ppm_project_access(project_id)) with check(public.ppm_project_access(project_id));

alter table public.ppm_procurement_items add column if not exists requested_by_email text;

-- One PO reference is unique within a project once issued (null allowed pre-award).
create unique index if not exists ppm_procurement_items_po_unique on public.ppm_procurement_items(project_id, po_reference) where po_reference is not null;

-- Immutability: once a record reaches a final status, only a sitewide super-admin may modify it
-- (e.g. to return it for correction). Reusable across tables — pass the final status as the
-- trigger argument.
create or replace function public.ppm_prevent_finalized_update() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if OLD.status = TG_ARGV[0] and not public.is_super_admin() then
    raise exception 'Cet enregistrement est finalise (statut %) et ne peut etre modifie que par un super-administrateur.', OLD.status;
  end if;
  return NEW;
end;
$$;

drop trigger if exists ppm_expenses_lock_posted on public.ppm_expenses;
create trigger ppm_expenses_lock_posted before update on public.ppm_expenses
  for each row execute function public.ppm_prevent_finalized_update('posted');

-- ppm_procurement_items uses "stage", not "status" — a dedicated variant reads TG_ARGV[0] against stage.
create or replace function public.ppm_prevent_finalized_stage_update() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if OLD.stage = TG_ARGV[0] and not public.is_super_admin() then
    raise exception 'Cet enregistrement est finalise (etape %) et ne peut etre modifie que par un super-administrateur.', OLD.stage;
  end if;
  return NEW;
end;
$$;

drop trigger if exists ppm_procurement_items_lock_completed on public.ppm_procurement_items;
create trigger ppm_procurement_items_lock_completed before update on public.ppm_procurement_items
  for each row execute function public.ppm_prevent_finalized_stage_update('completed');
