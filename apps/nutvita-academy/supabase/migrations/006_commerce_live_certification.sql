-- Production source of truth for commerce, enrollments, live classes and
-- public certificate verification. Apply after 001-005.

create type public.order_status as enum (
  'pending', 'paid', 'failed', 'cancelled', 'refunded'
);

create type public.live_session_status as enum (
  'scheduled', 'live', 'completed', 'cancelled'
);

alter table public.courses
  add column if not exists studio_payload jsonb not null default '{}'::jsonb;

create or replace function public.has_app_role(allowed_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = any(allowed_roles)
  );
$$;

-- Replace the broad Studio policies from 003. Instructors may prepare their
-- own courses, but only application administrators may publish them.
drop policy if exists "courses_insert_instructor" on public.courses;
create policy "courses_insert_instructor"
on public.courses
for insert
to authenticated
with check (
  (
    instructor_user_id = auth.uid()
    or exists (
      select 1
      from public.organization_members member
      where member.organization_id = courses.organization_id
        and member.user_id = auth.uid()
        and member.active = true
        and member.role in ('owner', 'admin', 'manager', 'instructor')
    )
    or public.has_app_role(array['admin', 'super_admin']::public.app_role[])
  )
  and (
    status <> 'published'
    or public.has_app_role(array['admin', 'super_admin']::public.app_role[])
  )
);

drop policy if exists "courses_update_instructor" on public.courses;
create policy "courses_update_instructor"
on public.courses
for update
to authenticated
using (
  instructor_user_id = auth.uid()
  or exists (
    select 1
    from public.organization_members member
    where member.organization_id = courses.organization_id
      and member.user_id = auth.uid()
      and member.active = true
      and member.role in ('owner', 'admin', 'manager')
  )
  or public.has_app_role(array['admin', 'super_admin']::public.app_role[])
)
with check (
  (
    instructor_user_id = auth.uid()
    or exists (
      select 1
      from public.organization_members member
      where member.organization_id = courses.organization_id
        and member.user_id = auth.uid()
        and member.active = true
        and member.role in ('owner', 'admin', 'manager')
    )
    or public.has_app_role(array['admin', 'super_admin']::public.app_role[])
  )
  and (
    status <> 'published'
    or public.has_app_role(array['admin', 'super_admin']::public.app_role[])
  )
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  status public.order_status not null default 'pending',
  currency text not null default 'USD',
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  total numeric(12,2) not null check (total >= 0),
  payment_provider text not null default 'flutterwave',
  transaction_reference text not null unique,
  provider_transaction_id text unique,
  checkout_url text,
  paid_at timestamptz,
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  course_title text not null,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  final_price numeric(12,2) not null check (final_price >= 0),
  unique (order_id, course_id)
);

alter table public.enrollments
  add column if not exists order_id uuid references public.orders(id) on delete set null;

create index orders_user_idx on public.orders(user_id, created_at desc);
create index order_items_order_idx on public.order_items(order_id);
create index enrollments_order_idx on public.enrollments(order_id);

create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  title text not null,
  description text not null default '',
  provider text not null default 'jitsi',
  room_name text not null unique,
  external_url text,
  instructor_user_id uuid not null references public.profiles(id) on delete restrict,
  instructor_name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'Africa/Lagos',
  capacity integer not null check (capacity between 1 and 500),
  status public.live_session_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.live_registrations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  email citext not null,
  registered_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create table public.live_attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique (session_id, user_id, joined_at)
);

create table public.live_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index live_sessions_start_idx on public.live_sessions(starts_at);
create index live_registrations_session_idx on public.live_registrations(session_id);
create index live_messages_session_idx on public.live_messages(session_id, created_at);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.live_sessions enable row level security;
alter table public.live_registrations enable row level security;
alter table public.live_attendance enable row level security;
alter table public.live_messages enable row level security;

create policy "orders_select_own_or_admin" on public.orders
for select to authenticated
using (user_id = auth.uid() or public.has_app_role(array['admin','super_admin']::public.app_role[]));

create policy "modules_manage_staff" on public.course_modules
for all to authenticated
using (exists (
  select 1 from public.courses c where c.id = course_modules.course_id
  and (c.instructor_user_id = auth.uid() or public.has_app_role(array['admin','super_admin']::public.app_role[]))
))
with check (exists (
  select 1 from public.courses c where c.id = course_modules.course_id
  and (c.instructor_user_id = auth.uid() or public.has_app_role(array['admin','super_admin']::public.app_role[]))
));

create policy "lessons_manage_staff" on public.lessons
for all to authenticated
using (exists (
  select 1 from public.course_modules m join public.courses c on c.id = m.course_id
  where m.id = lessons.module_id
  and (c.instructor_user_id = auth.uid() or public.has_app_role(array['admin','super_admin']::public.app_role[]))
))
with check (exists (
  select 1 from public.course_modules m join public.courses c on c.id = m.course_id
  where m.id = lessons.module_id
  and (c.instructor_user_id = auth.uid() or public.has_app_role(array['admin','super_admin']::public.app_role[]))
));

create policy "order_items_select_via_order" on public.order_items
for select to authenticated
using (exists (
  select 1 from public.orders o where o.id = order_items.order_id
  and (o.user_id = auth.uid() or public.has_app_role(array['admin','super_admin']::public.app_role[]))
));

-- Enrollment is a server-side consequence of a verified payment or an admin
-- action. A learner must never grant access to themself.
drop policy if exists "enrollments_insert_own" on public.enrollments;

create policy "enrollments_manage_admin" on public.enrollments
for all to authenticated
using (public.has_app_role(array['admin','super_admin']::public.app_role[]))
with check (public.has_app_role(array['admin','super_admin']::public.app_role[]));

create policy "live_sessions_select_authenticated" on public.live_sessions
for select to authenticated using (true);

create policy "live_sessions_create_staff" on public.live_sessions
for insert to authenticated
with check (
  instructor_user_id = auth.uid()
  and public.has_app_role(array['instructor','admin','super_admin']::public.app_role[])
);

create policy "live_sessions_update_staff" on public.live_sessions
for update to authenticated
using (
  instructor_user_id = auth.uid()
  or public.has_app_role(array['admin','super_admin']::public.app_role[])
)
with check (
  instructor_user_id = auth.uid()
  or public.has_app_role(array['admin','super_admin']::public.app_role[])
);

create policy "live_registrations_select_related" on public.live_registrations
for select to authenticated
using (
  user_id = auth.uid()
  or exists (select 1 from public.live_sessions s where s.id = session_id and s.instructor_user_id = auth.uid())
  or public.has_app_role(array['admin','super_admin']::public.app_role[])
);

create policy "live_registrations_delete_own" on public.live_registrations
for delete to authenticated using (user_id = auth.uid());

create policy "live_attendance_select_related" on public.live_attendance
for select to authenticated
using (
  user_id = auth.uid()
  or exists (select 1 from public.live_sessions s where s.id = session_id and s.instructor_user_id = auth.uid())
  or public.has_app_role(array['admin','super_admin']::public.app_role[])
);

create policy "live_attendance_own" on public.live_attendance
for insert to authenticated with check (user_id = auth.uid());

create policy "live_attendance_update_own" on public.live_attendance
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "live_messages_select_registered" on public.live_messages
for select to authenticated
using (exists (
  select 1 from public.live_registrations r
  where r.session_id = live_messages.session_id and r.user_id = auth.uid()
) or exists (
  select 1 from public.live_sessions s
  where s.id = live_messages.session_id and s.instructor_user_id = auth.uid()
));

create policy "live_messages_insert_registered" on public.live_messages
for insert to authenticated
with check (
  user_id = auth.uid()
  and (
    exists (select 1 from public.live_registrations r where r.session_id = live_messages.session_id and r.user_id = auth.uid())
    or exists (select 1 from public.live_sessions s where s.id = live_messages.session_id and s.instructor_user_id = auth.uid())
  )
);

create or replace function public.register_for_live_session(target_session_id uuid)
returns public.live_registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.live_sessions;
  result public.live_registrations;
  registration_count integer;
  candidate public.profiles;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  select * into target from public.live_sessions
  where id = target_session_id for update;

  if target.id is null then raise exception 'session_not_found'; end if;
  if target.status in ('completed','cancelled') then raise exception 'session_closed'; end if;
  select * into candidate from public.profiles where id = auth.uid();

  select count(*) into registration_count
  from public.live_registrations where session_id = target_session_id;

  if registration_count >= target.capacity then raise exception 'session_full'; end if;

  insert into public.live_registrations(session_id, user_id, full_name, email)
  values (target_session_id, auth.uid(), candidate.full_name, candidate.email)
  on conflict (session_id, user_id) do update set registered_at = live_registrations.registered_at
  returning * into result;

  return result;
end;
$$;

revoke all on function public.register_for_live_session(uuid) from public;
grant execute on function public.register_for_live_session(uuid) to authenticated;

create or replace function public.finalize_verified_order(
  target_reference text,
  target_provider_transaction_id text,
  verified_amount numeric,
  verified_currency text,
  raw_provider_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.orders;
begin
  select * into target from public.orders
  where transaction_reference = target_reference for update;

  if target.id is null then raise exception 'order_not_found'; end if;
  if target.status = 'paid' then return target.id; end if;
  if target.status <> 'pending' then raise exception 'order_not_pending'; end if;
  if upper(target.currency) <> upper(verified_currency) then raise exception 'currency_mismatch'; end if;
  if verified_amount < target.total then raise exception 'amount_mismatch'; end if;

  update public.orders set
    status = 'paid',
    provider_transaction_id = target_provider_transaction_id,
    provider_payload = raw_provider_payload,
    paid_at = now(),
    updated_at = now()
  where id = target.id;

  insert into public.enrollments(course_id, user_id, order_id)
  select item.course_id, target.user_id, target.id
  from public.order_items item
  where item.order_id = target.id
  on conflict (course_id, user_id) do update
    set order_id = excluded.order_id;

  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  values (target.user_id, 'payment.verified_and_enrolled', 'order', target.id,
    jsonb_build_object('provider_transaction_id', target_provider_transaction_id));

  return target.id;
end;
$$;

revoke all on function public.finalize_verified_order(text,text,numeric,text,jsonb) from public, anon, authenticated;
grant execute on function public.finalize_verified_order(text,text,numeric,text,jsonb) to service_role;

create or replace function public.verify_certificate(public_certificate_number text)
returns table (
  certificate_number text,
  status text,
  recipient_name text,
  course_title text,
  course_code text,
  final_score numeric,
  issued_at timestamptz,
  revoked_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cert.certificate_number::text,
    cert.status,
    profile.full_name,
    course.title,
    course.code::text,
    cert.final_score,
    cert.issued_at,
    cert.revoked_at
  from public.certificates cert
  join public.profiles profile on profile.id = cert.user_id
  join public.courses course on course.id = cert.course_id
  where lower(cert.certificate_number::text) = lower(public_certificate_number)
  limit 1;
$$;

revoke all on function public.verify_certificate(text) from public;
grant execute on function public.verify_certificate(text) to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'live_sessions'
  ) then alter publication supabase_realtime add table public.live_sessions; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'live_registrations'
  ) then alter publication supabase_realtime add table public.live_registrations; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'live_messages'
  ) then alter publication supabase_realtime add table public.live_messages; end if;
end $$;

create trigger orders_updated_at before update on public.orders
for each row execute procedure public.set_updated_at();

create trigger live_sessions_updated_at before update on public.live_sessions
for each row execute procedure public.set_updated_at();
