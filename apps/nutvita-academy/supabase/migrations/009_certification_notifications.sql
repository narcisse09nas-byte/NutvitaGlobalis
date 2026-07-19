-- Persistent learner notifications for certification decisions.
create table if not exists public.academy_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_key text not null,
  type text not null default 'system',
  priority text not null default 'normal',
  title text not null,
  title_en text,
  message text not null,
  message_en text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, event_key)
);

alter table public.academy_notifications enable row level security;
drop policy if exists "academy_notifications_read_own" on public.academy_notifications;
drop policy if exists "academy_notifications_update_own" on public.academy_notifications;
create policy "academy_notifications_read_own" on public.academy_notifications
for select to authenticated using (user_id = auth.uid());
create policy "academy_notifications_update_own" on public.academy_notifications
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists academy_notifications_user_created_idx
on public.academy_notifications(user_id, created_at desc);
