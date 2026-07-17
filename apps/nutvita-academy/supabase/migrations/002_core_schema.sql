do $$ begin create type public.app_role as enum (
  'student',
  'instructor',
  'reviewer',
  'admin',
  'super_admin'
); exception when duplicate_object then null; end $$;

do $$ begin create type public.organization_role as enum (
  'owner',
  'admin',
  'manager',
  'instructor',
  'reviewer',
  'member',
  'viewer'
); exception when duplicate_object then null; end $$;

do $$ begin create type public.course_status as enum (
  'draft',
  'review',
  'published',
  'archived'
); exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email citext not null unique,
  avatar_url text,
  role public.app_role not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug citext not null unique,
  owner_user_id uuid not null references public.profiles(id),
  plan text not null default 'free',
  branding jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.organization_role not null default 'member',
  active boolean not null default true,
  joined_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  slug citext not null,
  code citext not null,
  title text not null,
  description text not null default '',
  status public.course_status not null default 'draft',
  price_usd numeric(10,2) not null default 0,
  instructor_user_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  slug citext not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (course_id, slug)
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  title text not null,
  slug citext not null,
  lesson_type text not null default 'reading',
  content jsonb not null default '{}'::jsonb,
  position integer not null default 0,
  duration_minutes integer not null default 0,
  created_at timestamptz not null default now(),
  unique (module_id, slug)
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (course_id, user_id)
);

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'not_started',
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  time_spent_seconds integer not null default 0,
  last_visited_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (lesson_id, user_id)
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_number citext not null unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text not null default 'valid',
  final_score numeric(5,2) not null,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete cascade,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs add column if not exists actor_user_id uuid references public.profiles(id) on delete set null;
alter table public.audit_logs add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.audit_logs add column if not exists entity_type text;
alter table public.audit_logs add column if not exists entity_id uuid;

create index if not exists organization_members_user_idx
  on public.organization_members(user_id);

create index if not exists courses_organization_idx
  on public.courses(organization_id);

create index if not exists enrollments_user_idx
  on public.enrollments(user_id);

create index if not exists lesson_progress_user_idx
  on public.lesson_progress(user_id);

create index if not exists certificates_user_idx
  on public.certificates(user_id);
