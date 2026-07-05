-- Homepage editorial and community content.
-- Run after schema.sql and advanced-admin-security.sql.

alter table public.homepage_settings add column if not exists welcome_message_fr text;
alter table public.homepage_settings add column if not exists welcome_message_en text;

create table if not exists public.homepage_announcements (
  id uuid primary key default gen_random_uuid(),
  title_fr text not null,
  title_en text not null,
  summary_fr text not null,
  summary_en text not null,
  link_url text,
  published_at timestamptz not null default now(),
  status text not null default 'draft' check(status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.homepage_gallery_items (
  id uuid primary key default gen_random_uuid(),
  title_fr text not null,
  title_en text not null,
  caption_fr text,
  caption_en text,
  image_url text not null,
  sort_order integer not null default 0,
  status text not null default 'draft' check(status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.homepage_discussion_topics (
  id uuid primary key default gen_random_uuid(),
  title_fr text not null,
  title_en text not null,
  description_fr text not null,
  description_en text not null,
  status text not null default 'draft' check(status in ('draft','open','closed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.homepage_discussion_messages (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.homepage_discussion_topics(id) on delete cascade,
  author_name text not null,
  author_email text not null,
  message text not null check(char_length(message) between 10 and 2000),
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  moderated_at timestamptz,
  moderated_by uuid references auth.users(id) on delete set null
);

create index if not exists homepage_announcements_published
  on public.homepage_announcements(status,published_at desc);
create index if not exists homepage_gallery_published
  on public.homepage_gallery_items(status,sort_order,created_at desc);
create index if not exists homepage_topics_status
  on public.homepage_discussion_topics(status,created_at desc);
create index if not exists homepage_messages_topic
  on public.homepage_discussion_messages(topic_id,status,created_at desc);

alter table public.homepage_announcements enable row level security;
alter table public.homepage_gallery_items enable row level security;
alter table public.homepage_discussion_topics enable row level security;
alter table public.homepage_discussion_messages enable row level security;

drop policy if exists "Published homepage announcements are public" on public.homepage_announcements;
create policy "Published homepage announcements are public" on public.homepage_announcements
for select to anon,authenticated using(status='published' or public.is_admin());
drop policy if exists "Published homepage gallery is public" on public.homepage_gallery_items;
create policy "Published homepage gallery is public" on public.homepage_gallery_items
for select to anon,authenticated using(status='published' or public.is_admin());
drop policy if exists "Open homepage topics are public" on public.homepage_discussion_topics;
create policy "Open homepage topics are public" on public.homepage_discussion_topics
for select to anon,authenticated using(status in ('open','closed') or public.is_admin());
drop policy if exists "Approved homepage messages are public" on public.homepage_discussion_messages;
create policy "Approved homepage messages are public" on public.homepage_discussion_messages
for select to anon,authenticated using(status='approved' or public.is_admin());
drop policy if exists "Public submits homepage messages" on public.homepage_discussion_messages;
create policy "Public submits homepage messages" on public.homepage_discussion_messages
for insert to anon,authenticated with check(
  status='pending' and exists(
    select 1 from public.homepage_discussion_topics topic
    where topic.id=topic_id and topic.status='open'
  )
);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'homepage_announcements',
    'homepage_gallery_items',
    'homepage_discussion_topics',
    'homepage_discussion_messages'
  ] loop
    execute format('drop policy if exists %I on public.%I','Admins manage '||table_name,table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using(public.is_admin()) with check(public.is_admin())',
      'Admins manage '||table_name,table_name
    );
  end loop;
end $$;

drop trigger if exists set_updated_at on public.homepage_announcements;
create trigger set_updated_at before update on public.homepage_announcements
for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.homepage_gallery_items;
create trigger set_updated_at before update on public.homepage_gallery_items
for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.homepage_discussion_topics;
create trigger set_updated_at before update on public.homepage_discussion_topics
for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
