-- Run after child-growth-advanced.sql and billing-admin-upgrade.sql.

alter table public.admin_users drop constraint if exists admin_users_role_check;
update public.admin_users set role=case role
  when 'editor' then 'content_admin'
  when 'finance' then 'finance_admin'
  when 'support' then 'health_admin'
  when 'administrator' then 'super_admin'
  else role end;
alter table public.admin_users add constraint admin_users_role_check
  check(role in ('super_admin','content_admin','recruitment_admin','health_admin','finance_admin'));

create table if not exists public.admin_roles (
  id text primary key, name text not null, description text not null,
  system_role boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.admin_permissions (
  id text primary key, name text not null, domain text not null, description text not null
);
create table if not exists public.admin_role_permissions (
  role_id text not null references public.admin_roles(id) on delete cascade,
  permission_id text not null references public.admin_permissions(id) on delete cascade,
  primary key(role_id,permission_id)
);
create table if not exists public.admin_activity_logs (
  id bigint generated always as identity primary key,
  admin_id uuid references public.admin_users(id) on delete set null,
  target_admin_id uuid references public.admin_users(id) on delete set null,
  action text not null, resource_type text not null default 'admin', resource_id text,
  ip_address inet, user_agent text, details jsonb not null default '{}', created_at timestamptz not null default now()
);
create table if not exists public.admin_login_history (
  id bigint generated always as identity primary key,
  admin_id uuid references public.admin_users(id) on delete cascade,
  signed_in_at timestamptz not null default now(), ip_address inet, user_agent text
);

insert into public.admin_roles(id,name,description) values
('super_admin','Super Admin','Acces total et gestion des administrateurs.'),
('content_admin','Admin Contenu','Articles, formations et ressources premium.'),
('recruitment_admin','Admin Recrutement','Candidatures, tests, entretiens et partenaires.'),
('health_admin','Admin Sante','Dossiers nutritionnels, alertes, consultations et rapports.'),
('finance_admin','Admin Finance','Paiements, factures, taxes et abonnements.')
on conflict(id) do update set name=excluded.name,description=excluded.description;

insert into public.admin_permissions(id,name,domain,description) values
('admins.manage','Gerer les administrateurs','system','Creer, modifier ou retirer un acces admin.'),
('content.manage','Gerer les contenus','content','Articles, formations, accueil et ressources.'),
('recruitment.manage','Gerer le recrutement','recruitment','Candidatures, tests, entretiens et dieteticiens.'),
('health.read','Consulter les dossiers sante','health','Dossiers, rapports et donnees de suivi.'),
('health.comment','Ajouter des commentaires sante','health','Commentaires professionnels et verification des alertes.'),
('consultations.manage','Gerer les consultations','health','Teleconseils et reservations.'),
('finance.read','Consulter les finances','finance','Paiements, factures et abonnements.'),
('finance.manage','Gerer la finance','finance','Taxes, exports et parametres de paiement.'),
('contracts.manage','Gerer les contrats','contracts','Contrats, consentements et signatures.'),
('system.manage','Gerer le systeme','system','Emails, parametres et configuration globale.')
on conflict(id) do update set name=excluded.name,domain=excluded.domain,description=excluded.description;

insert into public.admin_role_permissions(role_id,permission_id)
select 'super_admin',id from public.admin_permissions on conflict do nothing;
insert into public.admin_role_permissions values
('content_admin','content.manage'),
('recruitment_admin','recruitment.manage'),
('health_admin','health.read'),('health_admin','health.comment'),('health_admin','consultations.manage'),
('finance_admin','finance.read'),('finance_admin','finance.manage')
on conflict do nothing;

create or replace function public.admin_has_permission(required_permission text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.admin_users au
    left join public.admin_role_permissions arp on arp.role_id=au.role
    where au.id=(select auth.uid()) and au.active=true
      and (au.role='super_admin' or arp.permission_id=required_permission or au.permissions ? required_permission)
  );
$$;

create or replace function public.protect_last_super_admin()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if old.role='super_admin' and old.active=true and (tg_op='DELETE' or new.role<>'super_admin' or new.active=false) then
    if (select count(*) from public.admin_users where role='super_admin' and active=true and id<>old.id)<1 then
      raise exception 'Le dernier super-admin actif ne peut pas etre retire.';
    end if;
  end if;
  if tg_op='DELETE' then return old; end if; return new;
end $$;
drop trigger if exists protect_last_super_admin on public.admin_users;
create trigger protect_last_super_admin before update or delete on public.admin_users
for each row execute function public.protect_last_super_admin();

insert into public.admin_users(id,email,full_name,role,active)
select id,email,coalesce(raw_user_meta_data->>'full_name',email),'super_admin',true
from auth.users where lower(email) in ('pauln.zebaze@gmail.com','contact@nutvitaglobalis.com')
on conflict(id) do update set role='super_admin',active=true;

create or replace view public.admin_profiles with (security_invoker=true) as select * from public.admin_users;
create or replace view public.child_profiles with (security_invoker=true) as select * from public.children;
create or replace view public.child_growth_ai_insights with (security_invoker=true) as select * from public.child_growth_analyses;
create or replace view public.child_subscriptions with (security_invoker=true) as
  select * from public.subscriptions where child_id is not null;

create table if not exists public.geographic_countries(code text primary key,name text not null,active boolean not null default true);
create table if not exists public.geographic_states(id bigint generated always as identity primary key,country_code text not null references public.geographic_countries(code),code text,name text not null,unique(country_code,code));
create table if not exists public.geographic_cities(id bigint generated always as identity primary key,state_id bigint references public.geographic_states(id),country_code text not null references public.geographic_countries(code),name text not null);

alter table public.admin_roles enable row level security;
alter table public.admin_permissions enable row level security;
alter table public.admin_role_permissions enable row level security;
alter table public.admin_activity_logs enable row level security;
alter table public.admin_login_history enable row level security;
alter table public.geographic_countries enable row level security;
alter table public.geographic_states enable row level security;
alter table public.geographic_cities enable row level security;
create policy "Admins read roles" on public.admin_roles for select to authenticated using(public.is_admin());
create policy "Admins read permissions" on public.admin_permissions for select to authenticated using(public.is_admin());
create policy "Admins read role permissions" on public.admin_role_permissions for select to authenticated using(public.is_admin());
create policy "Super admins manage roles" on public.admin_roles for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
create policy "Super admins manage role permissions" on public.admin_role_permissions for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
create policy "Super admins read admin activity" on public.admin_activity_logs for select to authenticated using(public.is_super_admin());
create policy "Super admins read login history" on public.admin_login_history for select to authenticated using(public.is_super_admin());
create policy "Public reads countries" on public.geographic_countries for select using(active=true);
create policy "Public reads states" on public.geographic_states for select using(true);
create policy "Public reads cities" on public.geographic_cities for select using(true);
create policy "Super admins manage countries" on public.geographic_countries for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
create policy "Super admins manage states" on public.geographic_states for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
create policy "Super admins manage cities" on public.geographic_cities for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());

-- Replace broad legacy admin policies with domain permissions.
drop policy if exists "Admins manage articles" on public.articles;
drop policy if exists "Admins manage formations" on public.formations;
drop policy if exists "Admins manage ressources_premium" on public.ressources_premium;
drop policy if exists "Admins manage temoignages" on public.temoignages;
drop policy if exists "Admins manage homepage_settings" on public.homepage_settings;
drop policy if exists "Admins manage newsletter_subscribers" on public.newsletter_subscribers;
create policy "Content admins manage articles" on public.articles for all to authenticated using(public.admin_has_permission('content.manage')) with check(public.admin_has_permission('content.manage'));
create policy "Content admins manage formations" on public.formations for all to authenticated using(public.admin_has_permission('content.manage')) with check(public.admin_has_permission('content.manage'));
create policy "Content admins manage premium resources" on public.ressources_premium for all to authenticated using(public.admin_has_permission('content.manage')) with check(public.admin_has_permission('content.manage'));
create policy "Content admins manage testimonials" on public.temoignages for all to authenticated using(public.admin_has_permission('content.manage')) with check(public.admin_has_permission('content.manage'));
create policy "Content admins manage homepage" on public.homepage_settings for all to authenticated using(public.admin_has_permission('content.manage')) with check(public.admin_has_permission('content.manage'));
create policy "Content admins manage newsletter" on public.newsletter_subscribers for all to authenticated using(public.admin_has_permission('content.manage')) with check(public.admin_has_permission('content.manage'));

drop policy if exists "Admins manage taxes" on public.tax_rates;
drop policy if exists "Admins manage plans" on public.subscription_plans;
drop policy if exists "Admins manage invoices" on public.invoices;
drop policy if exists "Admins manage health payments" on public.payments;
drop policy if exists "Admins manage health subscriptions" on public.subscriptions;
create policy "Finance admins manage taxes" on public.tax_rates for all to authenticated using(public.admin_has_permission('finance.manage')) with check(public.admin_has_permission('finance.manage'));
create policy "Finance admins manage plans" on public.subscription_plans for all to authenticated using(public.admin_has_permission('finance.manage')) with check(public.admin_has_permission('finance.manage'));
create policy "Finance admins manage invoices" on public.invoices for all to authenticated using(public.admin_has_permission('finance.read')) with check(public.admin_has_permission('finance.manage'));
create policy "Finance admins manage payments" on public.payments for all to authenticated using(public.admin_has_permission('finance.read')) with check(public.admin_has_permission('finance.manage'));
create policy "Finance admins manage subscriptions" on public.subscriptions for all to authenticated using(public.admin_has_permission('finance.read')) with check(public.admin_has_permission('finance.manage'));

drop policy if exists "Admins manage child growth measurements" on public.child_growth_measurements;
drop policy if exists "Admins manage child alerts" on public.child_growth_alerts;
create policy "Health admins manage child measurements" on public.child_growth_measurements for all to authenticated using(public.admin_has_permission('health.read')) with check(public.admin_has_permission('health.comment'));
create policy "Health admins manage child alerts" on public.child_growth_alerts for all to authenticated using(public.admin_has_permission('health.read')) with check(public.admin_has_permission('health.comment'));
drop policy if exists "Admins manage clients" on public.client_profiles;
drop policy if exists "Admins manage health ai_insights" on public.ai_insights;
drop policy if exists "Admins manage health alerts" on public.alerts;
drop policy if exists "Admins manage health health_reports" on public.health_reports;
drop policy if exists "Admins manage bookings" on public.consultation_bookings;
drop policy if exists "Admins manage teleconseils" on public.teleconseils;
create policy "Health admins read clients" on public.client_profiles for select to authenticated using(public.admin_has_permission('health.read'));
create policy "Health admins manage insights" on public.ai_insights for all to authenticated using(public.admin_has_permission('health.read')) with check(public.admin_has_permission('health.comment'));
create policy "Health admins manage alerts" on public.alerts for all to authenticated using(public.admin_has_permission('health.read')) with check(public.admin_has_permission('health.comment'));
create policy "Health admins manage reports" on public.health_reports for all to authenticated using(public.admin_has_permission('health.read')) with check(public.admin_has_permission('health.comment'));
create policy "Health admins manage bookings" on public.consultation_bookings for all to authenticated using(public.admin_has_permission('consultations.manage')) with check(public.admin_has_permission('consultations.manage'));
create policy "Health admins manage teleconsultations" on public.teleconseils for all to authenticated using(public.admin_has_permission('consultations.manage')) with check(public.admin_has_permission('consultations.manage'));

drop policy if exists "Admins manage contracts" on public.contracts;
create policy "Contract admins manage contracts" on public.contracts for all to authenticated using(public.admin_has_permission('contracts.manage')) with check(public.admin_has_permission('contracts.manage'));

alter table public.child_growth_alerts add column if not exists professional_comment text;
alter table public.child_growth_alerts add column if not exists commented_at timestamptz;

create or replace function public.log_admin_table_change()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if (select auth.uid()) is not null and public.is_admin() then
    insert into public.admin_activity_logs(admin_id,action,resource_type,resource_id,details)
    values((select auth.uid()),lower(tg_op),tg_table_name,coalesce(new.id::text,old.id::text),jsonb_build_object('table',tg_table_name));
  end if;
  if tg_op='DELETE' then return old; end if; return new;
end $$;
do $$ declare table_name text; begin
  foreach table_name in array array['articles','formations','ressources_premium','tax_rates','subscription_plans','child_growth_alerts'] loop
    execute format('drop trigger if exists admin_audit_change on public.%I',table_name);
    execute format('create trigger admin_audit_change after insert or update or delete on public.%I for each row execute function public.log_admin_table_change()',table_name);
  end loop;
end $$;

insert into public.system_email_templates(id,name,subject,body_text) values
('admin_created_alert','Nouvel administrateur','Nouvel administrateur NutVitaGlobalis','Bonjour,\n\nLe compte administrateur {{admin_email}} vient d etre cree avec le role {{role}} par {{actor_email}}.\n\n{{action_url}}\n\nEquipe NutVitaGlobalis'),
('admin_access_removed_alert','Acces administrateur retire','Acces administrateur retire','Bonjour,\n\nL acces administrateur de {{admin_email}} a ete retire par {{actor_email}}.\n\n{{action_url}}\n\nEquipe NutVitaGlobalis'),
('admin_password_reset','Reinitialisation mot de passe admin','Reinitialisez votre mot de passe NutVitaGlobalis','Bonjour {{name}},\n\nUne reinitialisation de votre mot de passe administrateur a ete demandee. Utilisez le lien securise envoye par Supabase Auth.\n\nEquipe NutVitaGlobalis')
on conflict(id) do update set name=excluded.name,subject=excluded.subject,body_text=excluded.body_text;
