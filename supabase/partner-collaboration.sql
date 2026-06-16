-- Run after recruitment-advanced.sql, contracts-nutrition.sql and commerce-payments.sql.
-- Partner workspace, on-site client onboarding and staff collaboration.

alter table public.client_profiles add column if not exists username text unique;
alter table public.client_profiles add column if not exists login_email text unique;
alter table public.client_profiles add column if not exists created_by_partner_id uuid references public.dietitian_profiles(id) on delete set null;
alter table public.client_profiles add column if not exists origin text not null default 'online' check(origin in ('online','onsite','imported'));
alter table public.client_profiles add column if not exists client_number text unique;
alter table public.client_profiles add column if not exists must_change_password boolean not null default false;

create table if not exists public.staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null, email text, phone text,
  department text not null check(department in ('administration','health','recruitment','finance','content','technology','restaurant','operations')),
  job_title text not null, status text not null default 'active' check(status in ('active','inactive')),
  can_message boolean not null default true, can_video_call boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.partner_consultations (
  id uuid primary key default gen_random_uuid(), partner_id uuid not null references public.dietitian_profiles(id),
  client_id uuid not null references public.client_profiles(id), booking_id uuid references public.consultation_bookings(id),
  source text not null default 'onsite' check(source in ('online','onsite','partner_direct','home_visit')),
  status text not null default 'planned' check(status in ('planned','in_progress','completed','cancelled')),
  scheduled_at timestamptz, started_at timestamptz, completed_at timestamptz,
  reason text, summary text, objectives text, recommendations text, meal_plan text,
  amount numeric(12,2) not null default 0, currency text not null default 'XOF',
  payment_status text not null default 'unpaid' check(payment_status in ('unpaid','partial','paid','waived')),
  payment_method text, external_reference text, created_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.partner_ledger (
  id uuid primary key default gen_random_uuid(), partner_id uuid not null references public.dietitian_profiles(id),
  consultation_id uuid references public.partner_consultations(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  entry_type text not null check(entry_type in ('earning','payment','adjustment','refund')),
  description text not null, amount numeric(12,2) not null, currency text not null default 'XOF',
  status text not null default 'pending' check(status in ('pending','approved','paid','cancelled')),
  occurred_at timestamptz not null default now(), created_at timestamptz not null default now()
);

create table if not exists public.collaboration_conversations (
  id uuid primary key default gen_random_uuid(), title text,
  conversation_type text not null default 'direct' check(conversation_type in ('direct','consultation','team','department','support')),
  consultation_id uuid references public.partner_consultations(id) on delete set null,
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.collaboration_members (
  conversation_id uuid not null references public.collaboration_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role text not null default 'member', last_read_at timestamptz, joined_at timestamptz not null default now(),
  primary key(conversation_id,user_id)
);
create table if not exists public.collaboration_messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.collaboration_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id), body text, attachment_path text, attachment_name text,
  created_at timestamptz not null default now(), check(coalesce(length(trim(body)),0)>0 or attachment_path is not null)
);
create table if not exists public.collaboration_calls (
  id uuid primary key default gen_random_uuid(), conversation_id uuid references public.collaboration_conversations(id) on delete set null,
  consultation_id uuid references public.partner_consultations(id) on delete set null,
  title text not null, provider text not null default 'jitsi', room_name text not null unique,
  scheduled_at timestamptz, duration_minutes integer not null default 45,
  status text not null default 'scheduled' check(status in ('scheduled','active','completed','cancelled')),
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.collaboration_call_members (
  call_id uuid not null references public.collaboration_calls(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid references auth.users(id), joined_at timestamptz, primary key(call_id,user_id)
);

create index if not exists partner_consultations_partner_date on public.partner_consultations(partner_id,scheduled_at desc);
create index if not exists partner_consultations_client_date on public.partner_consultations(client_id,scheduled_at desc);
create index if not exists collaboration_messages_conversation_date on public.collaboration_messages(conversation_id,created_at);

alter table public.staff_profiles enable row level security;
alter table public.partner_consultations enable row level security;
alter table public.partner_ledger enable row level security;
alter table public.collaboration_conversations enable row level security;
alter table public.collaboration_members enable row level security;
alter table public.collaboration_messages enable row level security;
alter table public.collaboration_calls enable row level security;
alter table public.collaboration_call_members enable row level security;

create or replace function public.current_partner_id() returns uuid language sql stable security definer set search_path=public as $$
  select id from public.dietitian_profiles where candidate_id=(select auth.uid()) and status='active' limit 1
$$;
create or replace function public.is_conversation_member(p_conversation uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.collaboration_members where conversation_id=p_conversation and user_id=(select auth.uid())) or public.is_admin()
$$;

create policy "Partners read own consultations" on public.partner_consultations for select to authenticated using(partner_id=public.current_partner_id() or client_id=(select auth.uid()) or public.is_admin());
create policy "Partners read created clients" on public.client_profiles for select to authenticated using(id=(select auth.uid()) or created_by_partner_id=public.current_partner_id() or public.is_admin());
create policy "Partners create own consultations" on public.partner_consultations for insert to authenticated with check(partner_id=public.current_partner_id() or public.is_admin());
create policy "Partners update own consultations" on public.partner_consultations for update to authenticated using(partner_id=public.current_partner_id() or public.is_admin()) with check(partner_id=public.current_partner_id() or public.is_admin());
create policy "Partners read own ledger" on public.partner_ledger for select to authenticated using(partner_id=public.current_partner_id() or public.is_admin());
create policy "Staff directory readable" on public.staff_profiles for select to authenticated using(status='active' or public.is_admin());
create policy "Admins manage staff" on public.staff_profiles for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Members read conversations" on public.collaboration_conversations for select to authenticated using(public.is_conversation_member(id));
create policy "Authenticated create conversations" on public.collaboration_conversations for insert to authenticated with check(created_by=(select auth.uid()));
create policy "Members read memberships" on public.collaboration_members for select to authenticated using(public.is_conversation_member(conversation_id));
create policy "Creators add members" on public.collaboration_members for insert to authenticated with check(user_id=(select auth.uid()) or exists(select 1 from public.collaboration_conversations c where c.id=conversation_id and c.created_by=(select auth.uid())) or public.is_admin());
create policy "Members read messages" on public.collaboration_messages for select to authenticated using(public.is_conversation_member(conversation_id));
create policy "Members send messages" on public.collaboration_messages for insert to authenticated with check(sender_id=(select auth.uid()) and public.is_conversation_member(conversation_id));
create policy "Call participants read" on public.collaboration_calls for select to authenticated using(public.is_admin() or created_by=(select auth.uid()) or exists(select 1 from public.collaboration_call_members m where m.call_id=id and m.user_id=(select auth.uid())));
create policy "Authenticated create calls" on public.collaboration_calls for insert to authenticated with check(created_by=(select auth.uid()));
create policy "Call participants read members" on public.collaboration_call_members for select to authenticated using(user_id=(select auth.uid()) or public.is_admin() or exists(select 1 from public.collaboration_calls c where c.id=call_id and c.created_by=(select auth.uid())));
create policy "Call creators add members" on public.collaboration_call_members for insert to authenticated with check(exists(select 1 from public.collaboration_calls c where c.id=call_id and c.created_by=(select auth.uid())) or public.is_admin());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('collaboration-files','collaboration-files',false,15728640,array['application/pdf','image/jpeg','image/png','text/plain']) on conflict(id) do nothing;
create policy "Collaboration members upload" on storage.objects for insert to authenticated with check(bucket_id='collaboration-files');
create policy "Collaboration members read" on storage.objects for select to authenticated using(bucket_id='collaboration-files');
