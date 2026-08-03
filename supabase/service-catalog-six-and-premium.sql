-- Six public service cards and complete Standard/Premium autonomous health catalogue.
-- Apply after accounts-growth-admin.sql and public-content-i18n-and-legal.sql.
alter table public.subscription_plans add column if not exists name_en text;
insert into public.subscription_plans(id,name,name_en,tier,billing_period,amount,currency,features,active,service_type,duration_months,price_excluding_tax)
values
('health-autonomous-yearly','Suivi santé autonome Standard','Standard Autonomous Health Monitoring','standard','yearly',10000,'XOF','["Tableau de bord","Graphiques de tendances","Questionnaires santé","Rapports personnalisés"]',true,'health_tracking',12,10000),
('health-autonomous-premium-yearly','Suivi santé autonome Premium','Premium Autonomous Health Monitoring','premium','yearly',20000,'XOF','["Toutes les fonctions Standard","Analyses IA avancées","Rapports enrichis","Ressources Premium"]',true,'health_tracking',12,20000),
('child-growth-yearly','Suivi de la croissance de l enfant Standard','Standard Child Growth Monitoring','standard','yearly',10000,'XOF','["Dossier privé par enfant","Courbes de croissance","Historique des mesures","Conseils adaptés"]',true,'child_growth',12,10000),
('child-growth-premium-yearly','Suivi de la croissance de l enfant Premium','Premium Child Growth Monitoring','premium','yearly',20000,'XOF','["Toutes les fonctions Standard","Analyses avancées","Rapports enrichis","Ressources Premium"]',true,'child_growth',12,20000)
on conflict(id) do update set name=excluded.name,name_en=excluded.name_en,tier=excluded.tier,amount=excluded.amount,currency=excluded.currency,features=excluded.features,active=true,service_type=excluded.service_type,duration_months=excluded.duration_months,price_excluding_tax=excluded.price_excluding_tax;
update public.homepage_settings set
services='[
 {"title":"Consultations diététiques et nutritionnelles","text":"Consultations en présentiel ou en ligne, bilan personnalisé, suivi et orientation nutritionnelle professionnelle.","ctaLabel":"Accéder aux consultations","href":"/teleconseils"},
 {"title":"Suivi Santé Autonome","text":"Enregistrez vos indicateurs, visualisez vos tendances et recevez des analyses prudentes dans votre espace sécurisé.","ctaLabel":"Découvrir la solution","href":"/suivi-sante"},
 {"title":"Applications de support","text":"Applications dédiées à la malnutrition aiguë, aux enquêtes et à la gestion de projets, programmes et portefeuilles.","ctaLabel":"Explorer les applications","href":"/applications-support"},
 {"title":"Formations certifiantes","text":"Parcours pratiques, évalués et certifiants conçus par des experts.","ctaLabel":"Explorer les formations","href":"/formations"},
 {"title":"Service de restauration","text":"Consultez les menus disponibles dans votre ville et commandez des repas sains avec livraison.","ctaLabel":"Voir les menus","href":"/restauration"},
 {"title":"Recherche scientifique, innovation et conseil stratégique","text":"Recherche, données, IA et conseil stratégique pour les institutions, organisations et entreprises partout dans le monde.","ctaLabel":"Découvrir la solution","href":"/recherche-innovation"}
]'::jsonb,
services_en='[
 {"title":"Dietetic and nutrition consultations","text":"In-person or online consultations, personalized assessment, follow-up and professional nutrition guidance.","ctaLabel":"Access consultations","href":"/teleconseils"},
 {"title":"Autonomous Health Monitoring","text":"Record your indicators, visualize trends and receive careful analyses in your secure space.","ctaLabel":"Discover the solution","href":"/suivi-sante"},
 {"title":"Support applications","text":"Applications for acute malnutrition care, surveys and project, programme and portfolio management.","ctaLabel":"Explore applications","href":"/applications-support"},
 {"title":"Certified training","text":"Practical, assessed certification pathways designed by experts.","ctaLabel":"Explore courses","href":"/formations"},
 {"title":"Catering service","text":"Browse menus available in your city and order healthy meals for delivery.","ctaLabel":"Browse menus","href":"/restauration"},
 {"title":"Scientific Research, Innovation & Strategic Consulting","text":"Research, data, AI and strategic support for institutions, organizations and businesses worldwide.","ctaLabel":"Discover the solution","href":"/recherche-innovation"}
]'::jsonb where id=1;
