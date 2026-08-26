-- Project Asset Management, Wave D: closure-time disposal — extends the existing generic
-- handover register (ppm_handover_items) with an optional link to a specific asset and a
-- disposal-method enum, rather than a parallel register.
-- Run after ppm-wave10-asset-registration.sql and ppm-closure.sql.

alter table public.ppm_handover_items add column if not exists resource_id uuid references public.ppm_resources(id) on delete set null;
alter table public.ppm_handover_items add column if not exists disposal_method text check(disposal_method is null or disposal_method in (
  'transferred_to_project','donated','sold','scrapped','returned_to_donor','kept_by_organization','other'
));
alter table public.ppm_handover_items add column if not exists disposal_method_other text;
alter table public.ppm_handover_items add column if not exists disposal_amount numeric(14,2);
alter table public.ppm_handover_items add column if not exists disposal_currency text;

create index if not exists ppm_handover_items_resource on public.ppm_handover_items(resource_id);
