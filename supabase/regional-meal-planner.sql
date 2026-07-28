-- Cache des menus régionaux générés pour éviter de solliciter inutilement
-- le fournisseur IA avec une prescription strictement identique.
create table if not exists public.regional_menu_plan_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique,
  region_key text not null,
  kcal integer not null check (kcal between 800 and 5000),
  payload jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists regional_menu_plan_cache_expiry_idx
  on public.regional_menu_plan_cache(expires_at);

alter table public.regional_menu_plan_cache enable row level security;
revoke all on table public.regional_menu_plan_cache from anon, authenticated;

comment on table public.regional_menu_plan_cache is
  'Cache serveur des plans par equivalents; ne constitue pas une prescription et ne stocke aucune identite patient.';
