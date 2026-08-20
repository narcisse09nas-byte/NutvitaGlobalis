-- Detail/"Découvrir le service" pages for the 3 applications-support cards (NutriTrack, SANSurvey, ProManage),
-- plus a refresh of the listing page's card copy (5-point checklist instead of 4, matching the new mockups).
-- Exécuter après supabase/support-applications-page.sql.
-- All string literals below use dollar-quoting ($t$...$t$ / $j$...$j$) so French apostrophes never need escaping.

-- Refresh the 3 card sections (indexes 4, 5, 6) on the existing applications-support row, in place.
update public.site_pages set
  sections = jsonb_set(jsonb_set(jsonb_set(sections,
    '{4}', $j${"title":"Prise en charge de la malnutrition aiguë (NutriTrack)","text":"Digitalisez tout le parcours de prise en charge de la malnutrition aiguë, du dépistage au suivi de la guérison, avec des rapports conformes aux normes nationales et internationales.","items":["Dépistage rapide et admission simplifiée","Suivi clinique et nutritionnel personnalisé","Gestion des stocks et consommables","Alertes et rappels automatiques","Suivi des performances et indicateurs clés"],"badge":"PHARE"}$j$::jsonb),
    '{5}', $j${"title":"Support aux enquêtes de sécurité alimentaire et nutrition","text":"Concevez, collectez et analysez des données fiables pour des décisions rapides et basées sur des preuves.","items":["Conception de questionnaires (SMART, MAD, FSC, rCSI...) et modèles prédéfinis","Collecte mobile & hors ligne (ODK/Kobo)","Nettoyage, validation et gestion des données","Analyses avancées (Python) intégrées","Tableaux de bord interactifs et visualisations","Export facile (Excel, SPSS, Stata, PDF...)"]}$j$::jsonb),
    '{6}', $j${"title":"Gestion des projets, programmes et portefeuilles","text":"Planifiez, exécutez et suivez vos projets avec efficacité, collaborez en temps réel et atteignez vos objectifs plus rapidement.","items":["Planification et suivi des activités","Gestion budgétaire et allocation des ressources","Suivi des risques, problèmes et actions","Suivi des indicateurs de performance (KPI)","Tableaux de bord dynamiques et rapports","Collaboration et gestion documentaire intégrée"]}$j$::jsonb),
  sections_en = jsonb_set(jsonb_set(jsonb_set(sections_en,
    '{4}', $j${"title":"Acute malnutrition care (NutriTrack)","text":"Digitalize the entire acute malnutrition care pathway, from screening to recovery follow-up, with reports compliant with national and international standards.","items":["Fast screening and simplified admission","Personalized clinical and nutritional follow-up","Stock and supply management","Automated alerts and reminders","Performance and key indicator monitoring"],"badge":"FLAGSHIP"}$j$::jsonb),
    '{5}', $j${"title":"Food security and nutrition survey support","text":"Design, collect and analyze reliable data for fast, evidence-based decisions.","items":["Questionnaire design (SMART, MAD, FCS, rCSI...) and built-in templates","Mobile & offline data collection (ODK/Kobo)","Data cleaning, validation and management","Built-in advanced analysis (Python)","Interactive dashboards and visualizations","Easy export (Excel, SPSS, Stata, PDF...)"]}$j$::jsonb),
    '{6}', $j${"title":"Project, programme and portfolio management","text":"Plan, execute and track your projects efficiently, collaborate in real time and reach your goals faster.","items":["Activity planning and monitoring","Budget management and resource allocation","Risk, issue and action tracking","Key performance indicator (KPI) monitoring","Dynamic dashboards and reports","Integrated collaboration and document management"]}$j$::jsonb),
  updated_at = now()
where page_key = 'applications-support';

insert into public.site_pages(
  page_key, eyebrow, eyebrow_en, title, title_en, description, description_en,
  hero_image_url, cta_label, cta_label_en, cta_url, sections, sections_en
) values (
  'applications-support-nutritrack',
  $t$Service phare$t$, $t$Flagship service$t$,
  $t$Prise en charge de la malnutrition aiguë (NutriTrack)$t$, $t$Acute malnutrition care (NutriTrack)$t$,
  $t$NutriTrack est l'application complète qui digitalise le protocole national de prise en charge de la malnutrition aiguë. De l'admission au suivi de la guérison, suivez chaque enfant, gérez les rapports conformes aux normes nationales et OMS, et améliorez la qualité des soins.$t$,
  $t$NutriTrack is the complete application that digitizes the national protocol for acute malnutrition care. From admission to recovery follow-up, track every child, manage reports compliant with national and WHO standards, and improve care quality.$t$,
  '/images/Image-mere-enfant-hero.png', $t$Accéder à l'application$t$, $t$Access the application$t$, '/nutritrack',
  $j$[
    {"badge":"hero-checklist","title":"","items":["Conforme aux protocoles nationaux et OMS","Suivi clinique et nutritionnel personnalisé","Gestion des stocks et consommables","Rapports standards et tableaux de bord"]},
    {"badge":"chips","title":"Résultats mesurés sur le terrain","items":["+25% — Taux de récupération","-40% — Temps de traitement administratif","100% — Conformité aux protocoles CMAM/OMS","Données fiables — pour des décisions éclairées"]},
    {"badge":"features","title":"Fonctionnalités clés","items":["Dépistage et admission simplifiés|||Enregistrez rapidement les enfants, leur état nutritionnel (PB, PB/TA, appétit, œdèmes) et leur éligibilité au programme.","Suivi clinique et nutritionnel|||Suivez l'évolution de chaque enfant (poids, PB/TA, appétit, maladies) avec des courbes et indicateurs visuels.","Gestion des traitements|||Planifiez les rations, enregistrez les distributions et suivez l'observance et les consommations.","Gestion des stocks|||Suivi en temps réel des intrants thérapeutiques et consommables, avec alertes de réapprovisionnement.","Rappels et alertes|||Rappels de rendez-vous, suivi des absences et alertes cliniques pour une prise en charge continue.","Rapports et performances|||Générez automatiquement les rapports conformes CMAM/OMS et suivez vos indicateurs clés en temps réel."]},
    {"badge":"steps","title":"Parcours de prise en charge digitalisé","items":["Dépistage|||Identification des cas et évaluation initiale","Admission|||Enregistrement des enfants, éligibilité au programme","Traitement|||Distribution des rations, suivi et ajustements","Suivi régulier|||Contrôles, consultations et ajustements","Sortie nutritionnelle|||Guérison, transfert ou abandon documenté"]},
    {"badge":"list","title":"Pour qui ?","items":["Structures de santé (CSPS, hôpitaux, ONG)","Programmes CMAM communautaires","Superviseurs et gestionnaires de programmes","Ministères et partenaires techniques"]},
    {"badge":"list","title":"Intégrations","items":["Conforme aux protocoles CMAM/OMS","Fonctionne en ligne et hors ligne","Export Excel, SPSS, PDF","Sécurisé et confidentiel"]},
    {"badge":"closing","title":"Une meilleure prise en charge, des vies sauvées","text":"NutriTrack vous aide à fournir des soins de qualité, basés sur des données fiables et en temps réel, pour chaque enfant qui en a besoin.","image_url":"/images/Image-mere-enfant-hero.png"}
  ]$j$::jsonb,
  $j$[
    {"badge":"hero-checklist","title":"","items":["Compliant with national and WHO protocols","Personalized clinical and nutritional follow-up","Stock and supply management","Standard reports and dashboards"]},
    {"badge":"chips","title":"Results measured in the field","items":["+25% — Recovery rate","-40% — Administrative processing time","100% — Compliance with CMAM/WHO protocols","Reliable data — for informed decisions"]},
    {"badge":"features","title":"Key features","items":["Simplified screening and admission|||Quickly register children, their nutritional status (MUAC, WHZ, appetite, oedema) and programme eligibility.","Clinical and nutritional follow-up|||Track each child's progress (weight, WHZ, appetite, illnesses) with charts and visual indicators.","Treatment management|||Plan rations, log distributions and track adherence and consumption.","Stock management|||Real-time tracking of therapeutic supplies, with replenishment alerts.","Reminders and alerts|||Appointment reminders, absence tracking and clinical alerts for continuous care.","Reports and performance|||Automatically generate CMAM/WHO-compliant reports and track your key indicators in real time."]},
    {"badge":"steps","title":"A fully digitized care pathway","items":["Screening|||Case identification and initial assessment","Admission|||Child registration and programme eligibility","Treatment|||Ration distribution, follow-up and adjustments","Regular follow-up|||Check-ups, consultations and adjustments","Nutritional discharge|||Documented recovery, transfer or default"]},
    {"badge":"list","title":"Who is it for?","items":["Health facilities (clinics, hospitals, NGOs)","Community-based CMAM programmes","Programme supervisors and managers","Ministries and technical partners"]},
    {"badge":"list","title":"Integrations","items":["Compliant with CMAM/WHO protocols","Works online and offline","Excel, SPSS, PDF export","Secure and confidential"]},
    {"badge":"closing","title":"Better care, lives saved","text":"NutriTrack helps you deliver quality care, based on reliable, real-time data, for every child who needs it.","image_url":"/images/Image-mere-enfant-hero.png"}
  ]$j$::jsonb
)
on conflict(page_key) do update set
  eyebrow=excluded.eyebrow, eyebrow_en=excluded.eyebrow_en, title=excluded.title, title_en=excluded.title_en,
  description=excluded.description, description_en=excluded.description_en, hero_image_url=excluded.hero_image_url,
  cta_label=excluded.cta_label, cta_label_en=excluded.cta_label_en, cta_url=excluded.cta_url,
  sections=excluded.sections, sections_en=excluded.sections_en, updated_at=now();

insert into public.site_pages(
  page_key, eyebrow, eyebrow_en, title, title_en, description, description_en,
  hero_image_url, cta_label, cta_label_en, cta_url, sections, sections_en
) values (
  'applications-support-sansurvey',
  $t$Solution d'enquête$t$, $t$Survey solution$t$,
  $t$Enquêtes de sécurité alimentaire & nutrition$t$, $t$Food security and nutrition surveys$t$,
  $t$Une solution complète pour planifier et réaliser des enquêtes nutritionnelles et de sécurité alimentaire de bout en bout, avec des outils de collecte (ODK), de gestion et d'analyse des données avec Python.$t$,
  $t$A complete solution to plan and run nutrition and food security surveys end to end, with data collection (ODK), management and Python-powered analysis tools.$t$,
  '/images/research-innovation/hero-field-impact.png', $t$Accéder à l'application$t$, $t$Access the application$t$, '/surveys',
  $j$[
    {"badge":"hero-checklist","title":"","items":["Conception de questionnaires intelligente","Collecte de données mobile via ODK/Kobo","Analyses avancées avec Python","Cartographie et visualisation interactive"]},
    {"badge":"chips","title":"Des modèles standards intégrés pour gagner du temps","items":["MAD/MDD — Malnutrition aiguë","FCS — Food Consumption Score","rCSI — Reduced Coping Strategies Index","SMART — Standardized Monitoring & Assessment","HEA — Household Economy Approach","+ Autres modules — WASH, IYCF, nutrition infantile, etc."]},
    {"badge":"steps","title":"Notre approche en 5 étapes","items":["Planifier|||Définissez les objectifs, la méthodologie, l'échantillonnage et le calendrier.","Concevoir|||Créez ou personnalisez le questionnaire avec nos modèles intégrés.","Collecter|||Déployez sur ODK Collect, en ligne ou hors ligne, avec géolocalisation et contrôle qualité.","Analyser|||Nettoyez les données, générez des tableaux de bord et des analyses avec Python.","Rapporter|||Produisez des rapports clairs et interactifs, prêts à partager et à décider."]},
    {"badge":"features","title":"Fonctionnalités clés","items":["Conception de questionnaires|||Éditeur intuitif, logique conditionnelle, validations et bibliothèque de questions.","Échantillonnage et planification|||Calcul de la taille d'échantillon, stratification, sélection des grappes.","Collecte de données|||Intégration ODK/Kobo, collecte hors ligne, géolocalisation, médias et suivi en temps réel.","Supervision et qualité|||Contrôles en temps réel, suivi des enquêteurs et de la performance de la collecte.","Gestion des données|||Nettoyage, validation, fusion et gestion centralisée des données.","Analyses avancées (Python)|||Scripts intégrés (MAD, FCS, rCSI...), modélisations statistiques et exports.","Cartographie interactive|||Cartes thématiques, heatmaps, couches multiples et analyses spatiales.","Rapports et visualisations|||Rapports automatiques, graphiques interactifs, export PDF/Excel/Word et partage sécurisé."]},
    {"badge":"chips","title":"Les bénéfices pour votre organisation","items":["Gain de temps — jusqu'à 40% de temps économisé","Données fiables — qualité et cohérence assurées","Décisions éclairées — indicateurs précis pour des actions efficaces","Réduction des coûts — moins de déplacements et d'erreurs","Conformité et standards — aligné sur les normes internationales"]},
    {"badge":"list","title":"Intégrations et compatibilité","items":["ODK Collect (Kobo)","Python intégré","Export Excel, SPSS, R, Stata","API ouverte et webhooks","Fonctionne hors ligne avec synchronisation","Sécurisé et confidentiel"]},
    {"badge":"closing","title":"Transformez vos données en impact","text":"Collectez des données de qualité, analysez-les en profondeur et prenez des décisions qui améliorent réellement la sécurité alimentaire et la nutrition.","image_url":"/images/research-innovation/hero-field-impact.png"}
  ]$j$::jsonb,
  $j$[
    {"badge":"hero-checklist","title":"","items":["Smart questionnaire design","Mobile data collection via ODK/Kobo","Advanced analysis with Python","Interactive mapping and visualization"]},
    {"badge":"chips","title":"Built-in standard modules to save time","items":["MAD/MDD — Acute malnutrition","FCS — Food Consumption Score","rCSI — Reduced Coping Strategies Index","SMART — Standardized Monitoring & Assessment","HEA — Household Economy Approach","+ Other modules — WASH, IYCF, child nutrition, etc."]},
    {"badge":"steps","title":"Our 5-step approach","items":["Plan|||Define objectives, methodology, sampling and timeline.","Design|||Create or customize the questionnaire with our built-in templates.","Collect|||Deploy on ODK Collect, online or offline, with geolocation and quality control.","Analyze|||Clean the data and generate dashboards and analyses with Python.","Report|||Produce clear, interactive reports ready to share and decide on."]},
    {"badge":"features","title":"Key features","items":["Questionnaire design|||Intuitive editor, conditional logic, validations and question library.","Sampling and planning|||Sample size calculation, stratification, cluster selection.","Data collection|||ODK/Kobo integration, offline collection, geolocation, media and real-time monitoring.","Supervision and quality|||Real-time checks, enumerator tracking and collection performance.","Data management|||Cleaning, validation, merging and centralized data management.","Advanced analysis (Python)|||Built-in scripts (MAD, FCS, rCSI...), statistical modelling and exports.","Interactive mapping|||Thematic maps, heatmaps, multiple layers and spatial analysis.","Reports and visualizations|||Automated reports, interactive charts, PDF/Excel/Word export and secure sharing."]},
    {"badge":"chips","title":"Benefits for your organization","items":["Time savings — up to 40% time saved","Reliable data — quality and consistency guaranteed","Informed decisions — precise indicators for effective action","Cost reduction — fewer trips and errors","Compliance and standards — aligned with international norms"]},
    {"badge":"list","title":"Integrations and compatibility","items":["ODK Collect (Kobo)","Built-in Python","Excel, SPSS, R, Stata export","Open API and webhooks","Works offline with synchronization","Secure and confidential"]},
    {"badge":"closing","title":"Turn your data into impact","text":"Collect quality data, analyze it in depth and make decisions that truly improve food security and nutrition.","image_url":"/images/research-innovation/hero-field-impact.png"}
  ]$j$::jsonb
)
on conflict(page_key) do update set
  eyebrow=excluded.eyebrow, eyebrow_en=excluded.eyebrow_en, title=excluded.title, title_en=excluded.title_en,
  description=excluded.description, description_en=excluded.description_en, hero_image_url=excluded.hero_image_url,
  cta_label=excluded.cta_label, cta_label_en=excluded.cta_label_en, cta_url=excluded.cta_url,
  sections=excluded.sections, sections_en=excluded.sections_en, updated_at=now();

insert into public.site_pages(
  page_key, eyebrow, eyebrow_en, title, title_en, description, description_en,
  hero_image_url, cta_label, cta_label_en, cta_url, sections, sections_en
) values (
  'applications-support-promanage',
  $t$Gestion de projets$t$, $t$Project management$t$,
  $t$Gestion des projets, programmes et portefeuilles$t$, $t$Project, programme and portfolio management$t$,
  $t$Notre application traduit les meilleures pratiques du guide PMBOK® en un outil simple et puissant pour piloter vos projets et programmes de nutrition et de santé avec efficacité, transparence et impact.$t$,
  $t$Our application translates PMBOK® guide best practices into a simple, powerful tool to run your nutrition and health projects and programmes with efficiency, transparency and impact.$t$,
  '/images/research-innovation/project-capacity-building.png', $t$Accéder à l'application$t$, $t$Access the application$t$, '/op-management',
  $j$[
    {"badge":"hero-checklist","title":"","items":["Approche PMBOK® complète|||De l'initiation à la clôture","Rapports intelligents avec IA|||Analyses et recommandations","Tableaux de bord interactifs|||Indicateurs en temps réel","Collaboration et traçabilité|||Toutes les données au même endroit"]},
    {"badge":"steps","title":"Un cycle de gestion complet, aligné sur le PMBOK®","items":["Initier|||Définissez la vision, la charte de projet et identifiez les parties prenantes.","Planifier|||Élaborez le plan de travail, le budget, les ressources et le calendrier.","Exécuter|||Mettez en œuvre les activités, gérez les ressources et collaborez en temps réel.","Suivre et contrôler|||Suivez les progrès, gérez les écarts et prenez des décisions éclairées.","Clôturer|||Évaluez les résultats et capitalisez les apprentissages.","Portefeuilles|||Priorisez, alignez et suivez l'ensemble de vos projets pour maximiser l'impact."]},
    {"badge":"features","title":"Fonctionnalités clés","items":["Conception et cadrage|||Charte de projet, objectifs SMART, WBS, jalons et livrables.","Planification avancée|||Diagramme de Gantt, chemin critique, dépendances, allocation des ressources.","Gestion budgétaire|||Budgets détaillés, suivi des dépenses, engagements et prévisions.","Gestion des risques|||Identification, évaluation, plans d'atténuation et suivi.","Suivi des indicateurs (KPI)|||Indicateurs personnalisés, cibles et alertes automatiques.","Rapports et IA|||Génération de rapports de progrès et analyses intelligentes assistées par IA.","Collaboration|||Tâches, commentaires, partage de documents et historique des activités.","Gestion documentaire|||Centralisez tous les documents, versions et approbations."]},
    {"badge":"chips","title":"Des bénéfices concrets pour vos équipes","items":["+35% — de performance des projets","-30% — de temps passé sur le reporting","+50% — de maîtrise des risques et des coûts","100% — de visibilité en temps réel","Meilleure — collaboration et traçabilité des équipes"]},
    {"badge":"list","title":"Intégrations et compatibilité","items":["Fonctionne en ligne et hors ligne","Export Excel, PDF, PowerPoint","API ouverte et webhooks","Compatible mobile (Android et iOS)","Sécurisé et confidentiel"]},
    {"badge":"closing","title":"Pilotez vos projets. Maximisez votre impact.","text":"Adoptez une gestion de projet moderne, centrée sur les résultats et alignée sur les meilleures pratiques internationales.","image_url":"/images/research-innovation/project-capacity-building.png"}
  ]$j$::jsonb,
  $j$[
    {"badge":"hero-checklist","title":"","items":["Complete PMBOK® approach|||From initiation to closure","Smart AI-powered reports|||Analyses and recommendations","Interactive dashboards|||Real-time indicators","Collaboration and traceability|||All data in one place"]},
    {"badge":"steps","title":"A complete management cycle, aligned with the PMBOK®","items":["Initiate|||Define the vision, project charter and identify stakeholders.","Plan|||Build the work plan, budget, resources and schedule.","Execute|||Implement activities, manage resources and collaborate in real time.","Monitor and control|||Track progress, manage deviations and make informed decisions.","Close|||Evaluate results and capitalize on lessons learned.","Portfolios|||Prioritize, align and track all your projects to maximize impact."]},
    {"badge":"features","title":"Key features","items":["Design and framing|||Project charter, SMART objectives, WBS, milestones and deliverables.","Advanced planning|||Gantt chart, critical path, dependencies, resource allocation.","Budget management|||Detailed budgets, expense tracking, commitments and forecasts.","Risk management|||Identification, assessment, mitigation plans and monitoring.","KPI tracking|||Custom indicators, targets and automatic alerts.","Reports and AI|||Progress report generation and AI-assisted smart analysis.","Collaboration|||Tasks, comments, document sharing and activity history.","Document management|||Centralize all documents, versions and approvals."]},
    {"badge":"chips","title":"Concrete benefits for your teams","items":["+35% — project performance","-30% — time spent on reporting","+50% — risk and cost control","100% — real-time visibility","Better — team collaboration and traceability"]},
    {"badge":"list","title":"Integrations and compatibility","items":["Works online and offline","Excel, PDF, PowerPoint export","Open API and webhooks","Mobile compatible (Android and iOS)","Secure and confidential"]},
    {"badge":"closing","title":"Run your projects. Maximize your impact.","text":"Adopt modern, results-focused project management aligned with international best practice.","image_url":"/images/research-innovation/project-capacity-building.png"}
  ]$j$::jsonb
)
on conflict(page_key) do update set
  eyebrow=excluded.eyebrow, eyebrow_en=excluded.eyebrow_en, title=excluded.title, title_en=excluded.title_en,
  description=excluded.description, description_en=excluded.description_en, hero_image_url=excluded.hero_image_url,
  cta_label=excluded.cta_label, cta_label_en=excluded.cta_label_en, cta_url=excluded.cta_url,
  sections=excluded.sections, sections_en=excluded.sections_en, updated_at=now();
