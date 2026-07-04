-- Maximus meetings domain. Distinct from NutVitaGlobalis collaboration_calls.
-- Run after maximus-access-control.sql.

create table if not exists public.maximus_meetings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  title text not null,
  meeting_type text not null default 'team'
    check(meeting_type in ('team','department','management','project','external','mixed')),
  provider text not null default 'jitsi'
    check(provider in ('jitsi','external','physical')),
  room_name text,
  meeting_url text,
  location text,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 45 check(duration_minutes between 5 and 480),
  agenda text,
  minutes text,
  decisions jsonb not null default '[]'::jsonb,
  status text not null default 'scheduled'
    check(status in ('draft','scheduled','in_progress','completed','cancelled')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.maximus_meeting_participants (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.maximus_meetings(id) on delete cascade,
  participant_type text not null check(participant_type in ('staff','external')),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  full_name text not null,
  participant_role text not null default 'participant'
    check(participant_role in ('organizer','participant','observer','presenter')),
  access_token uuid not null default gen_random_uuid() unique,
  invitation_status text not null default 'pending'
    check(invitation_status in ('pending','sent','accepted','declined','revoked')),
  invited_at timestamptz,
  joined_at timestamptz,
  left_at timestamptz,
  created_at timestamptz not null default now(),
  unique(meeting_id,email)
);

create index if not exists maximus_meetings_schedule
  on public.maximus_meetings(scheduled_at desc,status);
create index if not exists maximus_meeting_participants_user
  on public.maximus_meeting_participants(user_id,meeting_id);
create index if not exists maximus_meeting_participants_token
  on public.maximus_meeting_participants(access_token);

drop trigger if exists set_updated_at on public.maximus_meetings;
create trigger set_updated_at before update on public.maximus_meetings
for each row execute function public.set_updated_at();

alter table public.maximus_meetings enable row level security;
alter table public.maximus_meeting_participants enable row level security;

create or replace function public.maximus_can_access_meeting(p_meeting_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.is_super_admin()
    or public.maximus_has_access('communications/meetings','viewer')
    or exists(
      select 1 from public.maximus_meetings meeting
      where meeting.id=p_meeting_id and meeting.created_by=(select auth.uid())
    )
    or exists(
      select 1 from public.maximus_meeting_participants participant
      where participant.meeting_id=p_meeting_id and participant.user_id=(select auth.uid())
    )
$$;
revoke all on function public.maximus_can_access_meeting(uuid) from public;
grant execute on function public.maximus_can_access_meeting(uuid) to authenticated;

drop policy if exists "Maximus meeting users read meetings" on public.maximus_meetings;
create policy "Maximus meeting users read meetings" on public.maximus_meetings
for select to authenticated using(public.maximus_can_access_meeting(id));
drop policy if exists "Maximus meeting creators create meetings" on public.maximus_meetings;
create policy "Maximus meeting creators create meetings" on public.maximus_meetings
for insert to authenticated with check(
  created_by=(select auth.uid())
  and public.maximus_has_access('communications/meetings','creator')
);
drop policy if exists "Maximus meeting editors update meetings" on public.maximus_meetings;
create policy "Maximus meeting editors update meetings" on public.maximus_meetings
for update to authenticated using(
  created_by=(select auth.uid())
  or public.maximus_has_access('communications/meetings','editor')
  or public.maximus_has_access('communications/meetings','validator')
) with check(
  created_by=(select auth.uid())
  or public.maximus_has_access('communications/meetings','editor')
  or public.maximus_has_access('communications/meetings','validator')
);

drop policy if exists "Maximus meeting users read participants" on public.maximus_meeting_participants;
create policy "Maximus meeting users read participants" on public.maximus_meeting_participants
for select to authenticated using(public.maximus_can_access_meeting(meeting_id));
drop policy if exists "Maximus meeting creators manage participants" on public.maximus_meeting_participants;
create policy "Maximus meeting creators manage participants" on public.maximus_meeting_participants
for all to authenticated using(
  exists(
    select 1 from public.maximus_meetings meeting
    where meeting.id=meeting_id
      and (meeting.created_by=(select auth.uid()) or public.maximus_has_access('communications/meetings','editor'))
  )
) with check(
  exists(
    select 1 from public.maximus_meetings meeting
    where meeting.id=meeting_id
      and (meeting.created_by=(select auth.uid()) or public.maximus_has_access('communications/meetings','creator'))
  )
);

notify pgrst, 'reload schema';
