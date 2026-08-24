-- Restores the "Suivi Santé Autonome Premium" (health_tracking / premium) plan as active.
--
-- Root cause: a prior catalog migration (service-catalog-six-and-premium.sql) inserted
-- 'health-autonomous-premium-yearly' as active, but a later one (health-subscriptions-upgrade.sql)
-- deactivated every health_tracking plan not in its own monthly/quarterly/yearly id list — which
-- didn't include 'health-autonomous-premium-yearly'. Result: /suivi-sante and the client service
-- catalog only had one active health_tracking plan (Standard), so no Premium card ever rendered.
--
-- Safe to run any time: idempotent (on conflict do update), and only touches health_tracking rows.

insert into public.subscription_plans
  (id,name,name_en,tier,billing_period,amount,currency,features,active,service_type,duration_months,price_excluding_tax)
values
  ('health-autonomous-premium-yearly','Suivi santé autonome Premium','Premium Autonomous Health Monitoring','premium','yearly',20000,'XOF',
   '["Toutes les fonctions Standard","Analyses IA avancées","Rapports enrichis","Ressources Premium"]',true,'health_tracking',12,20000)
on conflict(id) do update set
  name=excluded.name, name_en=excluded.name_en, tier=excluded.tier, billing_period=excluded.billing_period,
  amount=excluded.amount, currency=excluded.currency, features=excluded.features,
  active=true, service_type='health_tracking', duration_months=excluded.duration_months,
  price_excluding_tax=excluded.price_excluding_tax;

-- Guard against duplicate active premium rows for health_tracking (keep only the canonical one,
-- so the catalog pages show exactly one Premium card instead of one per stray duplicate).
-- Standard is intentionally left untouched here — it already displays correctly, and this script
-- doesn't know which existing id your currently-active Standard plan uses, so it only adds the
-- missing Premium row rather than risk deactivating a Standard plan real subscribers reference.
update public.subscription_plans set active=false
where service_type='health_tracking' and tier='premium' and id<>'health-autonomous-premium-yearly';
