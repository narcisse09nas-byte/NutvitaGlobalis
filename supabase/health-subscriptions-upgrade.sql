-- Run after accounts-growth-admin.sql.
-- Restores the complete Basic/Premium catalog requested for health tracking.

insert into public.subscription_plans
  (id,name,tier,billing_period,amount,currency,features,active,service_type,duration_months,price_excluding_tax)
values
  ('basic-monthly','Suivi Sante Basic - Mensuel','basic','monthly',5000,'XOF','["Tableau de bord","Graphiques","IA simplifiee"]',true,'health_tracking',1,5000),
  ('basic-quarterly','Suivi Sante Basic - Trimestriel','basic','quarterly',13500,'XOF','["Tableau de bord","Graphiques","IA simplifiee"]',true,'health_tracking',3,13500),
  ('basic-yearly','Suivi Sante Basic - Annuel','basic','yearly',48000,'XOF','["Tableau de bord","Graphiques","IA simplifiee"]',true,'health_tracking',12,48000),
  ('premium-monthly','Suivi Sante Premium - Mensuel','premium','monthly',12000,'XOF','["Tableau de bord","IA avancee","Rapports PDF","Teleconseils"]',true,'health_tracking',1,12000),
  ('premium-quarterly','Suivi Sante Premium - Trimestriel','premium','quarterly',32400,'XOF','["Tableau de bord","IA avancee","Rapports PDF","Teleconseils"]',true,'health_tracking',3,32400),
  ('premium-yearly','Suivi Sante Premium - Annuel','premium','yearly',115000,'XOF','["Tableau de bord","IA avancee","Rapports PDF","Teleconseils"]',true,'health_tracking',12,115000)
on conflict(id) do update set
  name=excluded.name, tier=excluded.tier, billing_period=excluded.billing_period,
  amount=excluded.amount, currency=excluded.currency, features=excluded.features,
  active=true, service_type='health_tracking', duration_months=excluded.duration_months,
  price_excluding_tax=excluded.price_excluding_tax;

update public.subscription_plans set active=false
where service_type='health_tracking'
  and id not in ('basic-monthly','basic-quarterly','basic-yearly','premium-monthly','premium-quarterly','premium-yearly');
