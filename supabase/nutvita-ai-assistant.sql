-- Run after schema.sql. Conversation history for the NutVita AI chat assistant.

create table if not exists public.nutvita_ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check(role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists nutvita_ai_messages_user on public.nutvita_ai_messages(user_id, created_at);

alter table public.nutvita_ai_messages enable row level security;
drop policy if exists "Users manage own assistant messages" on public.nutvita_ai_messages;
create policy "Users manage own assistant messages" on public.nutvita_ai_messages for all to authenticated
using(user_id = (select auth.uid()) or public.is_admin())
with check(user_id = (select auth.uid()) or public.is_admin());
