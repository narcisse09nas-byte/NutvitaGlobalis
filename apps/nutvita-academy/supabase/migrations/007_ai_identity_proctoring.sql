-- Provider-neutral identity verification and AI-assisted proctoring.
-- Biometric secrets stay in server/Edge Function secrets, never in this table.

alter table public.profiles
  add column if not exists legal_name text,
  add column if not exists date_of_birth date,
  add column if not exists nationality text,
  add column if not exists country text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  submitted_name text;
begin
  submitted_name := coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1));
  insert into public.profiles (id, full_name, legal_name, email, country)
  values (new.id, submitted_name, submitted_name, new.email, nullif(new.raw_user_meta_data ->> 'country', ''));
  return new;
end;
$$;

create table public.proctoring_settings (
  id boolean primary key default true check (id),
  identity_provider text not null default 'didit' check (identity_provider in ('manual', 'didit')),
  identity_threshold numeric(5,2) not null default 85 check (identity_threshold between 85 and 100),
  auto_admit_when_verified boolean not null default true,
  adverse_decision_requires_human_review boolean not null default true check (adverse_decision_requires_human_review),
  biometric_retention_days integer not null default 30 check (biometric_retention_days between 1 and 365),
  score_weights jsonb not null default '{"document_authenticity":0.20,"document_quality":0.05,"face_match":0.35,"liveness":0.25,"profile_match":0.10,"document_validity":0.05}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

insert into public.proctoring_settings (id) values (true)
on conflict (id) do nothing;

create table public.identity_verifications (
  id uuid primary key default gen_random_uuid(),
  booking_reference text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_type text check (document_type in ('passport', 'national_id')),
  issuing_country text,
  document_number_hash text,
  document_expires_at date,
  document_storage_path text,
  selfie_storage_path text,
  provider text not null default 'manual' check (provider in ('manual', 'didit')),
  provider_reference text,
  status text not null default 'pending_provider' check (status in ('pending_provider', 'manual_review', 'verified', 'rejected', 'expired')),
  document_authenticity_score numeric(5,2) check (document_authenticity_score between 0 and 100),
  document_quality_score numeric(5,2) check (document_quality_score between 0 and 100),
  face_match_score numeric(5,2) check (face_match_score between 0 and 100),
  liveness_score numeric(5,2) check (liveness_score between 0 and 100),
  profile_data_matched boolean,
  document_valid boolean,
  identity_score numeric(5,2) check (identity_score between 0 and 100),
  decision_reasons jsonb not null default '[]'::jsonb,
  consented_at timestamptz not null,
  submitted_at timestamptz not null default now(),
  assessed_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_note text,
  unique (booking_reference, user_id)
);

create table public.proctoring_ai_events (
  id uuid primary key default gen_random_uuid(),
  booking_reference text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('tab_hidden', 'window_blur', 'fullscreen_exit', 'camera_stopped', 'screen_share_stopped', 'connection_lost', 'multiple_faces', 'no_face', 'identity_change_suspected', 'manual_note')),
  severity text not null check (severity in ('info', 'warning', 'critical')),
  confidence numeric(5,2) check (confidence between 0 and 100),
  evidence_storage_path text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  human_review_status text not null default 'pending' check (human_review_status in ('pending', 'confirmed', 'dismissed')),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null
);

create index identity_verifications_user_idx on public.identity_verifications(user_id, submitted_at desc);
create index identity_verifications_status_idx on public.identity_verifications(status, submitted_at);
create index proctoring_ai_events_booking_idx on public.proctoring_ai_events(booking_reference, occurred_at desc);

alter table public.proctoring_settings enable row level security;
alter table public.identity_verifications enable row level security;
alter table public.proctoring_ai_events enable row level security;

create policy "proctoring_settings_admin_read"
on public.proctoring_settings for select to authenticated
using (public.has_app_role(array['instructor', 'admin', 'super_admin']::public.app_role[]));

create policy "proctoring_settings_admin_update"
on public.proctoring_settings for update to authenticated
using (public.has_app_role(array['admin', 'super_admin']::public.app_role[]))
with check (public.has_app_role(array['admin', 'super_admin']::public.app_role[]));

create policy "identity_verifications_owner_read"
on public.identity_verifications for select to authenticated
using (user_id = auth.uid() or public.has_app_role(array['instructor', 'admin', 'super_admin']::public.app_role[]));

create policy "identity_verifications_owner_submit"
on public.identity_verifications for insert to authenticated
with check (user_id = auth.uid() and status = 'pending_provider' and provider_reference is null);

create policy "identity_verifications_reviewer_update"
on public.identity_verifications for update to authenticated
using (public.has_app_role(array['instructor', 'admin', 'super_admin']::public.app_role[]))
with check (public.has_app_role(array['instructor', 'admin', 'super_admin']::public.app_role[]));

create policy "proctoring_events_participant_read"
on public.proctoring_ai_events for select to authenticated
using (user_id = auth.uid() or public.has_app_role(array['instructor', 'admin', 'super_admin']::public.app_role[]));

create policy "proctoring_events_owner_insert"
on public.proctoring_ai_events for insert to authenticated
with check (user_id = auth.uid());

create policy "proctoring_events_reviewer_update"
on public.proctoring_ai_events for update to authenticated
using (public.has_app_role(array['instructor', 'admin', 'super_admin']::public.app_role[]))
with check (public.has_app_role(array['instructor', 'admin', 'super_admin']::public.app_role[]));

create trigger proctoring_settings_updated_at
before update on public.proctoring_settings
for each row execute procedure public.set_updated_at();

insert into storage.buckets (id, name, public)
values ('identity-evidence', 'identity-evidence', false)
on conflict (id) do nothing;

create policy "identity_evidence_owner_upload"
on storage.objects for insert to authenticated
with check (bucket_id = 'identity-evidence' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "identity_evidence_owner_read"
on storage.objects for select to authenticated
using (bucket_id = 'identity-evidence' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "identity_evidence_reviewer_read"
on storage.objects for select to authenticated
using (bucket_id = 'identity-evidence' and public.has_app_role(array['instructor', 'admin', 'super_admin']::public.app_role[]));

-- A daily Supabase Cron/Edge Function can call this marker function, delete
-- the referenced Storage objects, then audit the physical deletion.
create or replace function public.expire_identity_evidence()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.identity_verifications verification
  set status = 'expired',
      document_storage_path = '',
      selfie_storage_path = ''
  where verification.status <> 'expired'
    and verification.submitted_at < now() - (
      select make_interval(days => settings.biometric_retention_days)
      from public.proctoring_settings settings where settings.id = true
    );
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.expire_identity_evidence() from public, anon, authenticated;
grant execute on function public.expire_identity_evidence() to service_role;
