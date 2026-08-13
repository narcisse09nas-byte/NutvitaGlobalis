-- Public nutritionist/promoter applications and shared medical-style administration.
alter table public.recruitment_applications add column if not exists state_region text;
alter table public.recruitment_applications add column if not exists sex text;
create index if not exists recruitment_applications_type_status_idx on public.recruitment_applications(recruitment_type,status,created_at desc);
