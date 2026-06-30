-- Universal electronic signature envelopes for NutVitaGlobalis and Maximus.
-- Run after contracts-nutrition.sql and maximus-recruitment.sql.

create table if not exists public.signature_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  initials text not null,
  signature_path text,
  updated_at timestamptz not null default now()
);

create table if not exists public.signature_envelopes (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  sender_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text,
  original_file_path text not null,
  original_file_name text not null,
  original_mime_type text not null default 'application/pdf',
  original_sha256 text not null,
  final_file_path text,
  certificate_file_path text,
  signing_order_enabled boolean not null default false,
  status text not null default 'draft'
    check(status in ('draft','sent','viewed','partially_signed','completed','declined','cancelled','expired')),
  related_type text,
  related_id uuid,
  expires_at timestamptz,
  sent_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.signature_recipients (
  id uuid primary key default gen_random_uuid(),
  envelope_id uuid not null references public.signature_envelopes(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  full_name text not null,
  role text not null default 'signer' check(role in ('signer','approver','copy')),
  signing_order integer not null default 1,
  access_token text,
  access_token_hash text not null unique,
  status text not null default 'pending'
    check(status in ('pending','sent','viewed','signed','approved','declined','expired')),
  signature_path text,
  initials_path text,
  signature_source text check(signature_source in ('drawn','saved','typed')),
  consent_text text,
  signature_hash text,
  decline_reason text,
  sent_at timestamptz,
  viewed_at timestamptz,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(envelope_id,email)
);
alter table public.signature_recipients add column if not exists access_token text;

create table if not exists public.signature_events (
  id bigint generated always as identity primary key,
  envelope_id uuid not null references public.signature_envelopes(id) on delete cascade,
  recipient_id uuid references public.signature_recipients(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  event_type text not null,
  ip_address inet,
  user_agent text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists signature_envelopes_sender on public.signature_envelopes(sender_id,created_at desc);
create index if not exists signature_recipients_user on public.signature_recipients(user_id,status,created_at desc);
create index if not exists signature_recipients_email on public.signature_recipients(lower(email),status);
create index if not exists signature_events_envelope on public.signature_events(envelope_id,created_at);

alter table public.signature_profiles enable row level security;
alter table public.signature_envelopes enable row level security;
alter table public.signature_recipients enable row level security;
alter table public.signature_events enable row level security;

drop policy if exists "Users manage own signature profile" on public.signature_profiles;
create policy "Users manage own signature profile" on public.signature_profiles
for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

drop policy if exists "Envelope parties read envelopes" on public.signature_envelopes;
create policy "Envelope parties read envelopes" on public.signature_envelopes
for select to authenticated using(
  sender_id=(select auth.uid()) or exists(
    select 1 from public.signature_recipients recipient
    where recipient.envelope_id=id and (
      recipient.user_id=(select auth.uid())
      or lower(recipient.email)=lower(coalesce((select auth.jwt()->>'email'),''))
    )
  )
);
drop policy if exists "Users create signature envelopes" on public.signature_envelopes;
create policy "Users create signature envelopes" on public.signature_envelopes
for insert to authenticated with check(sender_id=(select auth.uid()));
drop policy if exists "Senders update signature envelopes" on public.signature_envelopes;
create policy "Senders update signature envelopes" on public.signature_envelopes
for update to authenticated using(sender_id=(select auth.uid())) with check(sender_id=(select auth.uid()));

drop policy if exists "Envelope parties read recipients" on public.signature_recipients;
create policy "Envelope parties read recipients" on public.signature_recipients
for select to authenticated using(
  user_id=(select auth.uid())
  or lower(email)=lower(coalesce((select auth.jwt()->>'email'),''))
);
drop policy if exists "Senders create recipients" on public.signature_recipients;
create policy "Senders create recipients" on public.signature_recipients
for insert to authenticated with check(
  exists(select 1 from public.signature_envelopes envelope where envelope.id=envelope_id and envelope.sender_id=(select auth.uid()))
);

drop policy if exists "Envelope parties read events" on public.signature_events;
create policy "Envelope parties read events" on public.signature_events
for select to authenticated using(
  exists(select 1 from public.signature_envelopes envelope where envelope.id=envelope_id and envelope.sender_id=(select auth.uid()))
  or exists(select 1 from public.signature_recipients recipient where recipient.envelope_id=signature_events.envelope_id and (
    recipient.user_id=(select auth.uid()) or lower(recipient.email)=lower(coalesce((select auth.jwt()->>'email'),''))
  ))
);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'electronic-signatures','electronic-signatures',false,26214400,
  array['application/pdf','image/png','image/jpeg','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) on conflict(id) do nothing;

drop policy if exists "Users upload signature documents" on storage.objects;
create policy "Users upload signature documents" on storage.objects
for insert to authenticated with check(
  bucket_id='electronic-signatures' and (storage.foldername(name))[1]=(select auth.uid())::text
);
drop policy if exists "Users read own signature uploads" on storage.objects;
create policy "Users read own signature uploads" on storage.objects
for select to authenticated using(
  bucket_id='electronic-signatures' and (storage.foldername(name))[1]=(select auth.uid())::text
);

alter table public.maximus_employment_proposals add column if not exists signature_envelope_id uuid
  references public.signature_envelopes(id) on delete set null;
