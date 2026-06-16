create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(), title text not null, slug text not null unique,
  category text not null, image_url text, excerpt text not null, content text not null,
  author text default 'Équipe NutVitaGlobalis', published_at timestamptz, status text not null default 'draft' check(status in ('draft','published')),
  access_type text not null default 'free' check(access_type in ('free','premium')), featured boolean not null default false,
  seo_title text, seo_description text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.formations (
  id uuid primary key default gen_random_uuid(), title text not null, short_description text not null, description text,
  image_url text, duration text, level text, price numeric(12,2) not null default 0, moodle_url text, category text,
  status text not null default 'draft' check(status in ('draft','published')), featured boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.teleconseils (
  id uuid primary key default gen_random_uuid(), name text not null, description text not null, price numeric(12,2) not null default 0,
  duration text, target_audience text, whatsapp_url text, status text not null default 'active' check(status in ('active','inactive')),
  featured boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.ressources_premium (
  id uuid primary key default gen_random_uuid(), title text not null, description text not null, image_url text, file_url text,
  price numeric(12,2) not null default 0, status text not null default 'draft' check(status in ('draft','published')),
  access_type text not null default 'paid' check(access_type in ('free','paid','subscribers')), featured boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.temoignages (
  id uuid primary key default gen_random_uuid(), name text not null, role text, photo_url text, testimony text not null,
  rating integer not null default 5 check(rating between 1 and 5), status text not null default 'visible' check(status in ('visible','hidden')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(), email text not null unique, source text not null default 'website', subscribed_at timestamptz not null default now(), active boolean not null default true
);
create table if not exists public.homepage_settings (
  id integer primary key default 1 check(id=1), hero_title text, slogan text, presentation text, hero_image_url text,
  primary_button_label text, primary_button_url text, secondary_button_label text, secondary_button_url text,
  services jsonb not null default '[]', newsletter_title text, newsletter_text text, updated_at timestamptz not null default now()
);
create table if not exists public.teleconseil_requests (
  id uuid primary key default gen_random_uuid(), pack_name text, name text, email text, phone text, message text,
  status text not null default 'new', created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.admin_users where id=(select auth.uid()) and active=true); $$;
create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;

do $$ declare t text; begin
  foreach t in array array['articles','formations','teleconseils','ressources_premium','temoignages','homepage_settings'] loop
    execute format('drop trigger if exists set_updated_at on public.%I',t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',t);
  end loop;
end $$;

alter table public.admin_users enable row level security;
alter table public.articles enable row level security;
alter table public.formations enable row level security;
alter table public.teleconseils enable row level security;
alter table public.ressources_premium enable row level security;
alter table public.temoignages enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.homepage_settings enable row level security;
alter table public.teleconseil_requests enable row level security;

create policy "Admins read own authorization" on public.admin_users for select to authenticated using (id=(select auth.uid()));
create policy "Published articles public" on public.articles for select to anon,authenticated using (status='published' or public.is_admin());
create policy "Published formations public" on public.formations for select to anon,authenticated using (status='published' or public.is_admin());
create policy "Active teleconseils public" on public.teleconseils for select to anon,authenticated using (status='active' or public.is_admin());
create policy "Published premium resources public" on public.ressources_premium for select to anon,authenticated using (status='published' or public.is_admin());
create policy "Visible testimonials public" on public.temoignages for select to anon,authenticated using (status='visible' or public.is_admin());
create policy "Homepage public" on public.homepage_settings for select to anon,authenticated using (true);

do $$ declare t text; begin
  foreach t in array array['articles','formations','teleconseils','ressources_premium','temoignages','homepage_settings','newsletter_subscribers','teleconseil_requests'] loop
    execute format('create policy "Admins manage %1$s" on public.%1$I for all to authenticated using (public.is_admin()) with check (public.is_admin())',t);
  end loop;
end $$;
create policy "Public newsletter signup" on public.newsletter_subscribers for insert to anon,authenticated with check (true);
create policy "Public teleconseil requests" on public.teleconseil_requests for insert to anon,authenticated with check (true);

insert into public.homepage_settings(id,hero_title,slogan,presentation,hero_image_url,primary_button_label,primary_button_url,secondary_button_label,secondary_button_url,newsletter_title,newsletter_text)
values(1,'Nutrition, santé et bien-être pour tous','La santé commence dans l’assiette','NutVitaGlobalis rapproche l’expertise nutritionnelle des familles et des professionnels.','/images/hero-nutvita.png','Découvrir nos formations','/formations','Réserver un téléconseil','/teleconseils','Des conseils fiables, directement dans votre boîte mail.','Un email utile par semaine.')
on conflict(id) do nothing;

-- Après avoir créé votre premier utilisateur dans Authentication > Users, autorisez-le :
-- insert into public.admin_users(id,email,full_name) values ('UUID_AUTH_USER','admin@example.com','Administrateur');
