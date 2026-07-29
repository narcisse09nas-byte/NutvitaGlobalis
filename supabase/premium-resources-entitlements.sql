-- Public metadata stays discoverable, while premium files require an active premium entitlement.
create or replace function public.has_premium_resource_access()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.subscriptions subscription
      join public.subscription_plans plan on plan.id=subscription.plan_id
      where subscription.client_id=(select auth.uid())
        and subscription.status='active'
        and plan.tier='premium'
        and (subscription.expires_at is null or subscription.expires_at>now())
    );
$$;

drop policy if exists "Published premium resources public" on public.ressources_premium;
drop policy if exists "Entitled users read premium resources" on public.ressources_premium;
create policy "Entitled users read premium resources"
on public.ressources_premium for select to authenticated
using(status='published' and public.has_premium_resource_access() or public.is_admin());

create or replace function public.list_premium_resource_catalog()
returns table (
  id uuid, title text, title_en text, description text, description_en text,
  image_url text, price numeric, access_type text, featured boolean,
  publication_locale_status text, created_at timestamptz
)
language sql stable security definer set search_path=public
as $$
  select r.id,r.title,r.title_en,r.description,r.description_en,r.image_url,
    r.price,r.access_type,r.featured,r.publication_locale_status,r.created_at
  from public.ressources_premium r where r.status='published'
  order by r.created_at desc;
$$;
revoke all on function public.list_premium_resource_catalog() from public;
grant execute on function public.list_premium_resource_catalog() to anon,authenticated;
