-- Page bilingue et administrable des applications de support.
-- Exécuter après supabase/site-pages.sql et supabase/multilingual-fr-en.sql.
alter table public.site_pages add column if not exists hero_image_url text;
alter table public.site_pages add column if not exists secondary_cta_label text;
alter table public.site_pages add column if not exists secondary_cta_label_en text;
alter table public.site_pages add column if not exists secondary_cta_url text;

insert into public.site_pages(
 page_key,eyebrow,eyebrow_en,title,title_en,description,description_en,
 hero_image_url,cta_label,cta_label_en,cta_url,secondary_cta_label,secondary_cta_label_en,secondary_cta_url,
 sections,sections_en
) values (
 'applications-support','Solutions professionnelles','Professional solutions',
 E'Des applications de support\nconçues pour l’action',E'Support applications\nbuilt for action',
 'Découvrez uniquement les applications opérationnelles NutVitaGlobalis. Vos droits sont vérifiés à l’ouverture de la solution.',
 'Explore NutVitaGlobalis operational applications. Your permissions are verified when a solution opens.',
 '/images/support-applications-devices-v1.png','Voir toutes les applications','View all applications','#applications',
 'Demander une démo','Request a demo','/contact',
 '[
  {"title":"Accès sécurisé","text":"Authentification et droits vérifiés"},
  {"title":"Données fiables","text":"Collecte rigoureuse et analyses validées"},
  {"title":"Décisions éclairées","text":"Informations pertinentes au bon moment"},
  {"title":"Impact mesurable","text":"Suivi continu et résultats tangibles"},
  {"title":"Prise en charge de la malnutrition aiguë (NutriTrack)","text":"Dépistage, admission, suivi clinique, gestion des stocks et reporting pour les structures autorisées.","items":["Suivi des cas MAM & MAS","Gestion des admissions et sorties","Monitoring des stocks et consommables","Rapports standards et personnalisés"]},
  {"title":"Support aux enquêtes de sécurité alimentaire et nutrition","text":"Concevez les questionnaires, collectez les données et produisez des analyses fiables pour la décision.","items":["Conception de questionnaires (ODK/Kobo)","Collecte mobile et hors ligne","Nettoyage et validation des données","Analyses statistiques et tableaux de bord"]},
  {"title":"Gestion des projets, programmes et portefeuilles","text":"Planifiez les activités, ressources, résultats, risques et performances dans un espace structuré.","items":["Planification et suivi des activités","Gestion budgétaire et ressources","Suivi des indicateurs et résultats","Tableaux de bord et rapports"]},
  {"title":"Sécurité et conformité","text":"Données protégées, normes internationales respectées."},
  {"title":"Interopérabilité","text":"Intégration fluide avec vos outils et systèmes existants."},
  {"title":"Disponible partout","text":"Accédez à vos données en ligne ou hors ligne, sur tous vos appareils."},
  {"title":"Support réactif","text":"Assistance technique et accompagnement personnalisé."}
 ]'::jsonb,
 '[
  {"title":"Secure access","text":"Verified authentication and permissions"},
  {"title":"Reliable data","text":"Rigorous collection and validated analysis"},
  {"title":"Informed decisions","text":"Relevant information at the right time"},
  {"title":"Measurable impact","text":"Continuous monitoring and tangible results"},
  {"title":"Acute malnutrition care (NutriTrack)","text":"Screening, admission, clinical monitoring, stock management and reporting for authorized facilities.","items":["MAM & SAM case monitoring","Admission and discharge management","Stock and supply monitoring","Standard and custom reports"]},
  {"title":"Food security and nutrition survey support","text":"Design questionnaires, collect data and produce reliable decision-ready analyses.","items":["Questionnaire design (ODK/Kobo)","Mobile and offline collection","Data cleaning and validation","Statistical analysis and dashboards"]},
  {"title":"Project, programme and portfolio management","text":"Plan activities, resources, results, risks and performance in one structured workspace.","items":["Activity planning and monitoring","Budget and resource management","Indicator and results monitoring","Dashboards and reports"]},
  {"title":"Security and compliance","text":"Protected data and respected international standards."},
  {"title":"Interoperability","text":"Seamless integration with your existing tools and systems."},
  {"title":"Available everywhere","text":"Access your data online or offline, on every device."},
  {"title":"Responsive support","text":"Technical assistance and personalized support."}
 ]'::jsonb
)
on conflict(page_key) do update set
 eyebrow=excluded.eyebrow,eyebrow_en=excluded.eyebrow_en,title=excluded.title,title_en=excluded.title_en,
 description=excluded.description,description_en=excluded.description_en,hero_image_url=excluded.hero_image_url,
 cta_label=excluded.cta_label,cta_label_en=excluded.cta_label_en,cta_url=excluded.cta_url,
 secondary_cta_label=excluded.secondary_cta_label,secondary_cta_label_en=excluded.secondary_cta_label_en,
 secondary_cta_url=excluded.secondary_cta_url,sections=excluded.sections,sections_en=excluded.sections_en,updated_at=now();
