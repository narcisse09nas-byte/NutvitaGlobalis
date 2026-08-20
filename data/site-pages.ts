import { clinicalNutritionSectionsEn, clinicalNutritionSectionsFr } from "./clinical-nutrition-page";
import { nutritionProgramSitePages } from "./nutrition-program-site-pages";
export type ManagedSection = { title: string; text?: string; items?: string[]; image_url?: string; cta_label?: string; cta_url?: string; badge?: string };
export type SitePageContent = {
  page_key: string;
  label: string;
  path: string;
  eyebrow: string;
  title: string;
  description: string;
  sections: ManagedSection[];
  cta_label?: string;
  cta_url?: string;
  eyebrow_en?: string;
  title_en?: string;
  description_en?: string;
  sections_en?: ManagedSection[];
  cta_label_en?: string;
  hero_image_url?: string;
  cta_image_url?: string;
  secondary_cta_label?: string;
  secondary_cta_label_en?: string;
  secondary_cta_url?: string;
};

export const sitePages: SitePageContent[] = [
  { page_key: "recrutement", label: "Recrutement", path: "/recrutement-dieteticiens", eyebrow: "Rejoignez-nous", title: "Rejoindre le réseau des diététiciens-nutritionnistes NutVitaGlobalis", description: "Mettez votre expertise au service de patients et de programmes nutritionnels accessibles, rigoureux et adaptés aux réalités locales.", sections: [
    { title: "Une communauté professionnelle engagée", text: "NutVitaGlobalis réunit des professionnels qualifiés pour intervenir en téléconseil, suivi personnalisé, nutrition clinique et programmes en ligne.", items: ["Diététicien-nutritionniste", "Nutritionniste", "Professionnel de santé avec expérience en nutrition", "Consultant en nutrition clinique"] },
    { title: "Domaines recherchés", items: ["Diabète", "Obésité", "Nutrition infantile", "Nutrition maternelle", "Nutrition clinique", "Hypertension", "Santé publique nutritionnelle"] },
    { title: "Processus de sélection", items: ["Soumission du dossier", "Analyse administrative", "Test écrit en ligne", "Entretien vidéo", "Validation finale", "Intégration au réseau"] },
  ], cta_label: "Soumettre ma candidature", cta_url: "/candidat" },
  { page_key: "a-propos", label: "À propos", path: "/a-propos", eyebrow: "Qui sommes-nous ?", title: "La science au service de vies plus saines", description: "NutVitaGlobalis est née d’une conviction : une information claire, adaptée et humaine peut transformer durablement la santé.", sections: [
    { title: "Mission", text: "Rendre l’expertise nutritionnelle fiable accessible aux familles, aux communautés et aux professionnels." },
    { title: "Vision", text: "Une Afrique où chacun dispose des connaissances nécessaires pour faire de la nutrition un levier de santé." },
    { title: "Valeurs", text: "Rigueur scientifique, proximité, respect des cultures, prévention et impact durable guident chaque action." },
    { title: "Expertise", text: "Nutrition clinique, santé publique, sécurité alimentaire, formation et accompagnement comportemental." },
  ] },
  { page_key: "contact", label: "Contact", path: "/contact", eyebrow: "Parlons-nous", title: "Une question ? Notre équipe vous répond", description: "Formation, accompagnement ou partenariat : écrivez-nous et nous reviendrons vers vous rapidement.", sections: [{ title: "Restons en contact", text: "Nous répondons généralement sous un jour ouvré." }] },
  { page_key: "ressources", label: "Ressources", path: "/ressources", eyebrow: "Apprendre", title: "Des ressources pour mieux décider", description: "Articles pratiques, guides professionnels et outils fondés sur des informations fiables et contextualisées.", sections: [] },
  { page_key: "formations", label: "Formations", path: "/formations", eyebrow: "Se former", eyebrow_en: "Learn", title: "Des compétences qui transforment les pratiques", title_en: "Skills that transform practice", description: "Des parcours flexibles, concrets et conçus par des professionnels de la nutrition et de la santé publique.", description_en: "Flexible, practical learning paths designed by nutrition and public health professionals.", hero_image_url: "/images/academy-hero-v1.png", cta_image_url: "/images/academy-cta-v1.png", cta_label: "Explorer les formations", cta_label_en: "Explore courses", cta_url: "#formations", secondary_cta_label: "Voir comment ça fonctionne", secondary_cta_label_en: "See how it works", secondary_cta_url: "#fonctionnement", sections: [
    {title:"Formations certifiées",text:"Des parcours évalués et reconnus."},{title:"100 % en ligne et accessibles",text:"Apprenez où que vous soyez."},{title:"Formateurs experts",text:"Des professionnels reconnus."},{title:"Attestation et certification",text:"Valorisez vos compétences."},
    {title:"1 200+",text:"Apprenants formés"},{title:"80+",text:"Formations disponibles"},{title:"25+",text:"Pays touchés"},{title:"95%",text:"Taux de satisfaction"},
    {title:"Nutrition clinique & diététique",text:"Prise en charge des patients, nutrition thérapeutique et pathologies."},{title:"Nutrition maternelle & infantile",text:"Grossesse, allaitement, croissance et développement."},{title:"Santé publique & épidémiologie",text:"Épidémiologie, prévention, promotion et surveillance."},{title:"Sécurité alimentaire & nutrition",text:"Systèmes alimentaires, résilience et analyses."},{title:"Enquêtes & collecte de données",text:"SMART, SENS, KAP, ODK et Kobo."},{title:"Gestion de projets humanitaires",text:"Cycle de projet, suivi-évaluation et risques."},{title:"Analyse des données & statistiques",text:"Excel avancé, SPSS, R, Python et Power BI."},{title:"Intelligence artificielle",text:"IA appliquée à la santé et analyse prédictive."},{title:"Logiciels & outils numériques",text:"SIG, DHIS2 et plateformes digitales."},{title:"Éthique, qualité & conformité",text:"Protection des données, qualité et normes."},
    {title:"Contenus d’experts",text:"Développés par des professionnels reconnus."},{title:"Approche pratique",text:"Études de cas, exercices et projets concrets."},{title:"Flexibilité totale",text:"Apprenez à votre rythme, où que vous soyez."},{title:"Certification reconnue",text:"Attestations valorisées sur le marché."},{title:"Communauté active",text:"Échangez, collaborez et progressez ensemble."},
    {title:"Inscrivez-vous",text:"Créez votre compte en quelques minutes."},{title:"Choisissez votre formation",text:"Parcourez et sélectionnez le programme adapté."},{title:"Apprenez à votre rythme",text:"Accédez aux cours, ressources et activités."},{title:"Évaluez vos compétences",text:"Réussissez les évaluations et exercices."},{title:"Obtenez votre certificat",text:"Recevez votre attestation et valorisez votre profil."},
    {title:"NutVitaGlobalis Academy",text:"Développez vos compétences, renforcez votre impact et faites évoluer votre carrière.",items:["Parcours flexibles","Contenus à jour","Apprentissage pratique","Communauté active"]},{title:"4,8/5",text:"Avis apprenants"}
  ], sections_en: [
    {title:"Certified courses",text:"Assessed and recognized learning paths."},{title:"100% online and accessible",text:"Learn wherever you are."},{title:"Expert instructors",text:"Recognized professionals."},{title:"Certificates and certification",text:"Showcase your skills."},
    {title:"1,200+",text:"Learners trained"},{title:"80+",text:"Courses available"},{title:"25+",text:"Countries reached"},{title:"95%",text:"Satisfaction rate"},
    {title:"Clinical nutrition & dietetics",text:"Patient care, therapeutic nutrition and diseases."},{title:"Maternal & child nutrition",text:"Pregnancy, breastfeeding, growth and development."},{title:"Public health & epidemiology",text:"Epidemiology, prevention, promotion and surveillance."},{title:"Food security & nutrition",text:"Food systems, resilience and analysis."},{title:"Surveys & data collection",text:"SMART, SENS, KAP, ODK and Kobo."},{title:"Humanitarian project management",text:"Project cycle, monitoring, evaluation and risk."},{title:"Data analysis & statistics",text:"Advanced Excel, SPSS, R, Python and Power BI."},{title:"Artificial intelligence",text:"AI for health and predictive analysis."},{title:"Software & digital tools",text:"GIS, DHIS2 and digital platforms."},{title:"Ethics, quality & compliance",text:"Data protection, quality and standards."},
    {title:"Expert content",text:"Developed by recognized professionals."},{title:"Practical approach",text:"Case studies, exercises and real projects."},{title:"Total flexibility",text:"Learn at your pace, wherever you are."},{title:"Recognized certification",text:"Credentials valued in the market."},{title:"Active community",text:"Connect, collaborate and grow together."},
    {title:"Sign up",text:"Create your account in minutes."},{title:"Choose your course",text:"Browse and select the right programme."},{title:"Learn at your pace",text:"Access lessons, resources and activities."},{title:"Assess your skills",text:"Complete assessments and exercises."},{title:"Earn your certificate",text:"Receive your credential and showcase your profile."},
    {title:"NutVitaGlobalis Academy",text:"Develop your skills, strengthen your impact and advance your career.",items:["Flexible pathways","Up-to-date content","Practical learning","Active community"]},{title:"4.8/5",text:"Learner reviews"}
  ] },  { page_key:"teleconseils", label:"Nutrition clinique & téléconsultation", path:"/teleconseils", eyebrow:"NutVitaGlobalis expertise", eyebrow_en:"NutVitaGlobalis expertise", title:"Nutrition clinique & téléconsultation", title_en:"Clinical nutrition & teleconsultation", description:"Accompagner les patients, les établissements de santé et les organisations grâce à des interventions nutritionnelles fondées sur les preuves, des consultations spécialisées et des solutions numériques innovantes.", description_en:"Supporting patients, health facilities and organizations through evidence-based nutrition interventions, specialized consultations and innovative digital solutions.", hero_image_url:"/images/clinical-nutrition-hero-v1.png", cta_label:"Demander une consultation", cta_label_en:"Request a consultation", cta_url:"/rendez-vous", secondary_cta_label:"Demander une proposition", secondary_cta_label_en:"Request a proposal", secondary_cta_url:"/contact", sections:clinicalNutritionSectionsFr,sections_en:clinicalNutritionSectionsEn },
  { page_key: "suivi-sante", label: "Suivi Santé", path: "/suivi-sante", eyebrow: "Suivi autonome annuel", title: "Comprendre vos indicateurs de santé, jour après jour", description: "Enregistrez vos données, visualisez vos tendances et recevez des analyses prudentes, sans consultation obligatoire.", sections: [{ title: "Suivi Santé Autonome", text: "10 000 FCFA HT, taxe selon votre pays, accès pendant 12 mois." }, { title: "Croissance Enfant", text: "10 000 FCFA HT par enfant et par an, avec historique et courbes." }] },
  { page_key: "acces", label: "Page de connexion", path: "/acces", eyebrow: "Accès sécurisés", title: "Choisissez votre espace", description: "Chaque utilisateur accède uniquement aux services et informations correspondant à son profil.", sections: [] },
  { page_key: "confidentialite", label: "Confidentialité", path: "/confidentialite", eyebrow: "Vos données", title: "Politique de confidentialité", description: "Nous limitons la collecte aux informations nécessaires aux services de nutrition, de suivi santé et de recrutement.", sections: [] },
  { page_key:"restauration", label:"Restauration", path:"/restauration", eyebrow:"Restauration saine", eyebrow_en:"Healthy catering", title:"Les menus du jour,\npréparés avec soin", title_en:"Today’s menus,\nprepared with care", description:"Découvrez des repas sains, équilibrés et savoureux disponibles dans votre ville. Connectez-vous pour consulter les menus, passer commande et vous faire livrer rapidement.", description_en:"Discover healthy, balanced and delicious meals available in your city. Sign in to view menus, place an order and receive prompt delivery.", hero_image_url:"/images/catering-hero-african-v2.png", cta_image_url:"/images/catering-kitchen-v1.png", cta_label:"Passer une commande", cta_label_en:"Place an order", cta_url:"/restauration/commander", sections:[
    {title:"Ingrédients frais et de qualité"},{title:"Recettes équilibrées et validées"},{title:"Préparés avec soin, livrés avec rapidité"},{title:"Hygiène et sécurité alimentaire garanties"},
    {title:"Cuisines centrales",text:"Repas préparés dans nos cuisines centralisées selon des standards d’hygiène stricts.",image_url:"/images/catering-kitchen-v1.png"},{title:"Points de vente",text:"Retrouvez nos menus dans nos points de vente partenaires près de chez vous.",image_url:"/images/catering-outlet-v1.png"},{title:"Hôpitaux partenaires",text:"Nos menus sont également disponibles dans les hôpitaux et structures de santé partenaires.",image_url:"/images/catering-hospital-v1.png"},
    {title:"Ingrédients frais et locaux"},{title:"Repas équilibrés et nutritifs"},{title:"Normes d’hygiène respectées"},{title:"Livraison rapide et fiable"},{title:"Soutien à votre bien-être"}
  ],sections_en:[
    {title:"Fresh quality ingredients"},{title:"Balanced validated recipes"},{title:"Prepared with care, delivered promptly"},{title:"Food hygiene and safety guaranteed"},
    {title:"Central kitchens",text:"Meals prepared in our central kitchens under strict hygiene standards.",image_url:"/images/catering-kitchen-v1.png"},{title:"Sales outlets",text:"Find our menus at partner outlets near you.",image_url:"/images/catering-outlet-v1.png"},{title:"Partner hospitals",text:"Our menus are also available in partner hospitals and health facilities.",image_url:"/images/catering-hospital-v1.png"},
    {title:"Fresh local ingredients"},{title:"Balanced nutritious meals"},{title:"Hygiene standards respected"},{title:"Fast reliable delivery"},{title:"Supporting your wellbeing"}
  ] },  { page_key: "applications-support", label: "Applications de support", path: "/applications-support", eyebrow: "Solutions professionnelles", eyebrow_en: "Professional solutions", title: "Des applications de support\nconçues pour l’action", title_en: "Support applications\nbuilt for action", description: "Découvrez uniquement les applications opérationnelles NutVitaGlobalis. Vos droits sont vérifiés à l’ouverture de la solution.", description_en: "Explore NutVitaGlobalis operational applications. Your permissions are verified when a solution opens.", hero_image_url: "/images/support-applications-devices-v1.png", cta_label: "Voir toutes les applications", cta_label_en: "View all applications", cta_url: "#applications", secondary_cta_label: "Demander une démo", secondary_cta_label_en: "Request a demo", secondary_cta_url: "/contact", sections: [
    { title: "Accès sécurisé", text: "Authentification et droits vérifiés" },
    { title: "Données fiables", text: "Collecte rigoureuse et analyses validées" },
    { title: "Décisions éclairées", text: "Informations pertinentes au bon moment" },
    { title: "Impact mesurable", text: "Suivi continu et résultats tangibles" },
    { title: "Prise en charge de la malnutrition aiguë (NutriTrack)", text: "Digitalisez tout le parcours de prise en charge de la malnutrition aiguë, du dépistage au suivi de la guérison, avec des rapports conformes aux normes nationales et internationales.", items: ["Dépistage rapide et admission simplifiée", "Suivi clinique et nutritionnel personnalisé", "Gestion des stocks et consommables", "Alertes et rappels automatiques", "Suivi des performances et indicateurs clés"], badge: "PHARE" },
    { title: "Support aux enquêtes de sécurité alimentaire et nutrition", text: "Concevez, collectez et analysez des données fiables pour des décisions rapides et basées sur des preuves.", items: ["Conception de questionnaires (SMART, MAD, FSC, rCSI...) et modèles prédéfinis", "Collecte mobile & hors ligne (ODK/Kobo)", "Nettoyage, validation et gestion des données", "Analyses avancées (Python) intégrées", "Tableaux de bord interactifs et visualisations", "Export facile (Excel, SPSS, Stata, PDF...)"] },
    { title: "Gestion des projets, programmes et portefeuilles", text: "Planifiez, exécutez et suivez vos projets avec efficacité, collaborez en temps réel et atteignez vos objectifs plus rapidement.", items: ["Planification et suivi des activités", "Gestion budgétaire et allocation des ressources", "Suivi des risques, problèmes et actions", "Suivi des indicateurs de performance (KPI)", "Tableaux de bord dynamiques et rapports", "Collaboration et gestion documentaire intégrée"] },
    { title: "Sécurité et conformité", text: "Données protégées, normes internationales respectées." },
    { title: "Interopérabilité", text: "Intégration fluide avec vos outils et systèmes existants." },
    { title: "Disponible partout", text: "Accédez à vos données en ligne ou hors ligne, sur tous vos appareils." },
    { title: "Support réactif", text: "Assistance technique et accompagnement personnalisé." },
  ], sections_en: [
    { title: "Secure access", text: "Verified authentication and permissions" },
    { title: "Reliable data", text: "Rigorous collection and validated analysis" },
    { title: "Informed decisions", text: "Relevant information at the right time" },
    { title: "Measurable impact", text: "Continuous monitoring and tangible results" },
    { title: "Acute malnutrition care (NutriTrack)", text: "Digitalize the entire acute malnutrition care pathway, from screening to recovery follow-up, with reports compliant with national and international standards.", items: ["Fast screening and simplified admission", "Personalized clinical and nutritional follow-up", "Stock and supply management", "Automated alerts and reminders", "Performance and key indicator monitoring"], badge: "FLAGSHIP" },
    { title: "Food security and nutrition survey support", text: "Design, collect and analyze reliable data for fast, evidence-based decisions.", items: ["Questionnaire design (SMART, MAD, FCS, rCSI...) and built-in templates", "Mobile & offline data collection (ODK/Kobo)", "Data cleaning, validation and management", "Built-in advanced analysis (Python)", "Interactive dashboards and visualizations", "Easy export (Excel, SPSS, Stata, PDF...)"] },
    { title: "Project, programme and portfolio management", text: "Plan, execute and track your projects efficiently, collaborate in real time and reach your goals faster.", items: ["Activity planning and monitoring", "Budget management and resource allocation", "Risk, issue and action tracking", "Key performance indicator (KPI) monitoring", "Dynamic dashboards and reports", "Integrated collaboration and document management"] },
    { title: "Security and compliance", text: "Protected data and respected international standards." },
    { title: "Interoperability", text: "Seamless integration with your existing tools and systems." },
    { title: "Available everywhere", text: "Access your data online or offline, on every device." },
    { title: "Responsive support", text: "Technical assistance and personalized support." },
  ] },
  { page_key: "applications-support-nutritrack", label: "Support — NutriTrack", path: "/applications-support/nutritrack",
    eyebrow: "Service phare", eyebrow_en: "Flagship service",
    title: "Prise en charge de la malnutrition aiguë (NutriTrack)", title_en: "Acute malnutrition care (NutriTrack)",
    description: "NutriTrack est l'application complète qui digitalise le protocole national de prise en charge de la malnutrition aiguë. De l'admission au suivi de la guérison, suivez chaque enfant, gérez les rapports conformes aux normes nationales et OMS, et améliorez la qualité des soins.",
    description_en: "NutriTrack is the complete application that digitizes the national protocol for acute malnutrition care. From admission to recovery follow-up, track every child, manage reports compliant with national and WHO standards, and improve care quality.",
    hero_image_url: "/images/Image-mere-enfant-hero.png", cta_label: "Accéder à l'application", cta_label_en: "Access the application", cta_url: "/nutritrack",
    sections: [
      { badge: "hero-checklist", title: "", items: ["Conforme aux protocoles nationaux et OMS", "Suivi clinique et nutritionnel personnalisé", "Gestion des stocks et consommables", "Rapports standards et tableaux de bord"] },
      { badge: "chips", title: "Résultats mesurés sur le terrain", items: ["+25% — Taux de récupération", "-40% — Temps de traitement administratif", "100% — Conformité aux protocoles CMAM/OMS", "Données fiables — pour des décisions éclairées"] },
      { badge: "features", title: "Fonctionnalités clés", items: [
        "Dépistage et admission simplifiés|||Enregistrez rapidement les enfants, leur état nutritionnel (PB, PB/TA, appétit, œdèmes) et leur éligibilité au programme.",
        "Suivi clinique et nutritionnel|||Suivez l'évolution de chaque enfant (poids, PB/TA, appétit, maladies) avec des courbes et indicateurs visuels.",
        "Gestion des traitements|||Planifiez les rations, enregistrez les distributions et suivez l'observance et les consommations.",
        "Gestion des stocks|||Suivi en temps réel des intrants thérapeutiques et consommables, avec alertes de réapprovisionnement.",
        "Rappels et alertes|||Rappels de rendez-vous, suivi des absences et alertes cliniques pour une prise en charge continue.",
        "Rapports et performances|||Générez automatiquement les rapports conformes CMAM/OMS et suivez vos indicateurs clés en temps réel.",
      ] },
      { badge: "steps", title: "Parcours de prise en charge digitalisé", items: [
        "Dépistage|||Identification des cas et évaluation initiale",
        "Admission|||Enregistrement des enfants, éligibilité au programme",
        "Traitement|||Distribution des rations, suivi et ajustements",
        "Suivi régulier|||Contrôles, consultations et ajustements",
        "Sortie nutritionnelle|||Guérison, transfert ou abandon documenté",
      ] },
      { badge: "list", title: "Pour qui ?", items: ["Structures de santé (CSPS, hôpitaux, ONG)", "Programmes CMAM communautaires", "Superviseurs et gestionnaires de programmes", "Ministères et partenaires techniques"] },
      { badge: "list", title: "Intégrations", items: ["Conforme aux protocoles CMAM/OMS", "Fonctionne en ligne et hors ligne", "Export Excel, SPSS, PDF", "Sécurisé et confidentiel"] },
      { badge: "closing", title: "Une meilleure prise en charge, des vies sauvées", text: "NutriTrack vous aide à fournir des soins de qualité, basés sur des données fiables et en temps réel, pour chaque enfant qui en a besoin.", image_url: "/images/Image-mere-enfant-hero.png" },
    ],
    sections_en: [
      { badge: "hero-checklist", title: "", items: ["Compliant with national and WHO protocols", "Personalized clinical and nutritional follow-up", "Stock and supply management", "Standard reports and dashboards"] },
      { badge: "chips", title: "Results measured in the field", items: ["+25% — Recovery rate", "-40% — Administrative processing time", "100% — Compliance with CMAM/WHO protocols", "Reliable data — for informed decisions"] },
      { badge: "features", title: "Key features", items: [
        "Simplified screening and admission|||Quickly register children, their nutritional status (MUAC, WHZ, appetite, oedema) and programme eligibility.",
        "Clinical and nutritional follow-up|||Track each child's progress (weight, WHZ, appetite, illnesses) with charts and visual indicators.",
        "Treatment management|||Plan rations, log distributions and track adherence and consumption.",
        "Stock management|||Real-time tracking of therapeutic supplies, with replenishment alerts.",
        "Reminders and alerts|||Appointment reminders, absence tracking and clinical alerts for continuous care.",
        "Reports and performance|||Automatically generate CMAM/WHO-compliant reports and track your key indicators in real time.",
      ] },
      { badge: "steps", title: "A fully digitized care pathway", items: [
        "Screening|||Case identification and initial assessment",
        "Admission|||Child registration and programme eligibility",
        "Treatment|||Ration distribution, follow-up and adjustments",
        "Regular follow-up|||Check-ups, consultations and adjustments",
        "Nutritional discharge|||Documented recovery, transfer or default",
      ] },
      { badge: "list", title: "Who is it for?", items: ["Health facilities (clinics, hospitals, NGOs)", "Community-based CMAM programmes", "Programme supervisors and managers", "Ministries and technical partners"] },
      { badge: "list", title: "Integrations", items: ["Compliant with CMAM/WHO protocols", "Works online and offline", "Excel, SPSS, PDF export", "Secure and confidential"] },
      { badge: "closing", title: "Better care, lives saved", text: "NutriTrack helps you deliver quality care, based on reliable, real-time data, for every child who needs it.", image_url: "/images/Image-mere-enfant-hero.png" },
    ],
  },
  { page_key: "applications-support-sansurvey", label: "Support — SANSurvey", path: "/applications-support/sansurvey",
    eyebrow: "Solution d'enquête", eyebrow_en: "Survey solution",
    title: "Enquêtes de sécurité alimentaire & nutrition", title_en: "Food security and nutrition surveys",
    description: "Une solution complète pour planifier et réaliser des enquêtes nutritionnelles et de sécurité alimentaire de bout en bout, avec des outils de collecte (ODK), de gestion et d'analyse des données avec Python.",
    description_en: "A complete solution to plan and run nutrition and food security surveys end to end, with data collection (ODK), management and Python-powered analysis tools.",
    hero_image_url: "/images/research-innovation/hero-field-impact.png", cta_label: "Accéder à l'application", cta_label_en: "Access the application", cta_url: "/surveys",
    sections: [
      { badge: "hero-checklist", title: "", items: ["Conception de questionnaires intelligente", "Collecte de données mobile via ODK/Kobo", "Analyses avancées avec Python", "Cartographie et visualisation interactive"] },
      { badge: "chips", title: "Des modèles standards intégrés pour gagner du temps", items: ["MAD/MDD — Malnutrition aiguë", "FCS — Food Consumption Score", "rCSI — Reduced Coping Strategies Index", "SMART — Standardized Monitoring & Assessment", "HEA — Household Economy Approach", "+ Autres modules — WASH, IYCF, nutrition infantile, etc."] },
      { badge: "steps", title: "Notre approche en 5 étapes", items: [
        "Planifier|||Définissez les objectifs, la méthodologie, l'échantillonnage et le calendrier.",
        "Concevoir|||Créez ou personnalisez le questionnaire avec nos modèles intégrés.",
        "Collecter|||Déployez sur ODK Collect, en ligne ou hors ligne, avec géolocalisation et contrôle qualité.",
        "Analyser|||Nettoyez les données, générez des tableaux de bord et des analyses avec Python.",
        "Rapporter|||Produisez des rapports clairs et interactifs, prêts à partager et à décider.",
      ] },
      { badge: "features", title: "Fonctionnalités clés", items: [
        "Conception de questionnaires|||Éditeur intuitif, logique conditionnelle, validations et bibliothèque de questions.",
        "Échantillonnage et planification|||Calcul de la taille d'échantillon, stratification, sélection des grappes.",
        "Collecte de données|||Intégration ODK/Kobo, collecte hors ligne, géolocalisation, médias et suivi en temps réel.",
        "Supervision et qualité|||Contrôles en temps réel, suivi des enquêteurs et de la performance de la collecte.",
        "Gestion des données|||Nettoyage, validation, fusion et gestion centralisée des données.",
        "Analyses avancées (Python)|||Scripts intégrés (MAD, FCS, rCSI...), modélisations statistiques et exports.",
        "Cartographie interactive|||Cartes thématiques, heatmaps, couches multiples et analyses spatiales.",
        "Rapports et visualisations|||Rapports automatiques, graphiques interactifs, export PDF/Excel/Word et partage sécurisé.",
      ] },
      { badge: "chips", title: "Les bénéfices pour votre organisation", items: ["Gain de temps — jusqu'à 40% de temps économisé", "Données fiables — qualité et cohérence assurées", "Décisions éclairées — indicateurs précis pour des actions efficaces", "Réduction des coûts — moins de déplacements et d'erreurs", "Conformité et standards — aligné sur les normes internationales"] },
      { badge: "list", title: "Intégrations et compatibilité", items: ["ODK Collect (Kobo)", "Python intégré", "Export Excel, SPSS, R, Stata", "API ouverte et webhooks", "Fonctionne hors ligne avec synchronisation", "Sécurisé et confidentiel"] },
      { badge: "closing", title: "Transformez vos données en impact", text: "Collectez des données de qualité, analysez-les en profondeur et prenez des décisions qui améliorent réellement la sécurité alimentaire et la nutrition.", image_url: "/images/research-innovation/hero-field-impact.png" },
    ],
    sections_en: [
      { badge: "hero-checklist", title: "", items: ["Smart questionnaire design", "Mobile data collection via ODK/Kobo", "Advanced analysis with Python", "Interactive mapping and visualization"] },
      { badge: "chips", title: "Built-in standard modules to save time", items: ["MAD/MDD — Acute malnutrition", "FCS — Food Consumption Score", "rCSI — Reduced Coping Strategies Index", "SMART — Standardized Monitoring & Assessment", "HEA — Household Economy Approach", "+ Other modules — WASH, IYCF, child nutrition, etc."] },
      { badge: "steps", title: "Our 5-step approach", items: [
        "Plan|||Define objectives, methodology, sampling and timeline.",
        "Design|||Create or customize the questionnaire with our built-in templates.",
        "Collect|||Deploy on ODK Collect, online or offline, with geolocation and quality control.",
        "Analyze|||Clean the data and generate dashboards and analyses with Python.",
        "Report|||Produce clear, interactive reports ready to share and decide on.",
      ] },
      { badge: "features", title: "Key features", items: [
        "Questionnaire design|||Intuitive editor, conditional logic, validations and question library.",
        "Sampling and planning|||Sample size calculation, stratification, cluster selection.",
        "Data collection|||ODK/Kobo integration, offline collection, geolocation, media and real-time monitoring.",
        "Supervision and quality|||Real-time checks, enumerator tracking and collection performance.",
        "Data management|||Cleaning, validation, merging and centralized data management.",
        "Advanced analysis (Python)|||Built-in scripts (MAD, FCS, rCSI...), statistical modelling and exports.",
        "Interactive mapping|||Thematic maps, heatmaps, multiple layers and spatial analysis.",
        "Reports and visualizations|||Automated reports, interactive charts, PDF/Excel/Word export and secure sharing.",
      ] },
      { badge: "chips", title: "Benefits for your organization", items: ["Time savings — up to 40% time saved", "Reliable data — quality and consistency guaranteed", "Informed decisions — precise indicators for effective action", "Cost reduction — fewer trips and errors", "Compliance and standards — aligned with international norms"] },
      { badge: "list", title: "Integrations and compatibility", items: ["ODK Collect (Kobo)", "Built-in Python", "Excel, SPSS, R, Stata export", "Open API and webhooks", "Works offline with synchronization", "Secure and confidential"] },
      { badge: "closing", title: "Turn your data into impact", text: "Collect quality data, analyze it in depth and make decisions that truly improve food security and nutrition.", image_url: "/images/research-innovation/hero-field-impact.png" },
    ],
  },
  { page_key: "applications-support-promanage", label: "Support — ProManage", path: "/applications-support/promanage",
    eyebrow: "Gestion de projets", eyebrow_en: "Project management",
    title: "Gestion des projets, programmes et portefeuilles", title_en: "Project, programme and portfolio management",
    description: "Notre application traduit les meilleures pratiques du guide PMBOK® en un outil simple et puissant pour piloter vos projets et programmes de nutrition et de santé avec efficacité, transparence et impact.",
    description_en: "Our application translates PMBOK® guide best practices into a simple, powerful tool to run your nutrition and health projects and programmes with efficiency, transparency and impact.",
    hero_image_url: "/images/research-innovation/project-capacity-building.png", cta_label: "Accéder à l'application", cta_label_en: "Access the application", cta_url: "/op-management",
    sections: [
      { badge: "hero-checklist", title: "", items: [
        "Approche PMBOK® complète|||De l'initiation à la clôture",
        "Rapports intelligents avec IA|||Analyses et recommandations",
        "Tableaux de bord interactifs|||Indicateurs en temps réel",
        "Collaboration et traçabilité|||Toutes les données au même endroit",
      ] },
      { badge: "steps", title: "Un cycle de gestion complet, aligné sur le PMBOK®", items: [
        "Initier|||Définissez la vision, la charte de projet et identifiez les parties prenantes.",
        "Planifier|||Élaborez le plan de travail, le budget, les ressources et le calendrier.",
        "Exécuter|||Mettez en œuvre les activités, gérez les ressources et collaborez en temps réel.",
        "Suivre et contrôler|||Suivez les progrès, gérez les écarts et prenez des décisions éclairées.",
        "Clôturer|||Évaluez les résultats et capitalisez les apprentissages.",
        "Portefeuilles|||Priorisez, alignez et suivez l'ensemble de vos projets pour maximiser l'impact.",
      ] },
      { badge: "features", title: "Fonctionnalités clés", items: [
        "Conception et cadrage|||Charte de projet, objectifs SMART, WBS, jalons et livrables.",
        "Planification avancée|||Diagramme de Gantt, chemin critique, dépendances, allocation des ressources.",
        "Gestion budgétaire|||Budgets détaillés, suivi des dépenses, engagements et prévisions.",
        "Gestion des risques|||Identification, évaluation, plans d'atténuation et suivi.",
        "Suivi des indicateurs (KPI)|||Indicateurs personnalisés, cibles et alertes automatiques.",
        "Rapports et IA|||Génération de rapports de progrès et analyses intelligentes assistées par IA.",
        "Collaboration|||Tâches, commentaires, partage de documents et historique des activités.",
        "Gestion documentaire|||Centralisez tous les documents, versions et approbations.",
      ] },
      { badge: "chips", title: "Des bénéfices concrets pour vos équipes", items: ["+35% — de performance des projets", "-30% — de temps passé sur le reporting", "+50% — de maîtrise des risques et des coûts", "100% — de visibilité en temps réel", "Meilleure — collaboration et traçabilité des équipes"] },
      { badge: "list", title: "Intégrations et compatibilité", items: ["Fonctionne en ligne et hors ligne", "Export Excel, PDF, PowerPoint", "API ouverte et webhooks", "Compatible mobile (Android et iOS)", "Sécurisé et confidentiel"] },
      { badge: "closing", title: "Pilotez vos projets. Maximisez votre impact.", text: "Adoptez une gestion de projet moderne, centrée sur les résultats et alignée sur les meilleures pratiques internationales.", image_url: "/images/research-innovation/project-capacity-building.png" },
    ],
    sections_en: [
      { badge: "hero-checklist", title: "", items: [
        "Complete PMBOK® approach|||From initiation to closure",
        "Smart AI-powered reports|||Analyses and recommendations",
        "Interactive dashboards|||Real-time indicators",
        "Collaboration and traceability|||All data in one place",
      ] },
      { badge: "steps", title: "A complete management cycle, aligned with the PMBOK®", items: [
        "Initiate|||Define the vision, project charter and identify stakeholders.",
        "Plan|||Build the work plan, budget, resources and schedule.",
        "Execute|||Implement activities, manage resources and collaborate in real time.",
        "Monitor and control|||Track progress, manage deviations and make informed decisions.",
        "Close|||Evaluate results and capitalize on lessons learned.",
        "Portfolios|||Prioritize, align and track all your projects to maximize impact.",
      ] },
      { badge: "features", title: "Key features", items: [
        "Design and framing|||Project charter, SMART objectives, WBS, milestones and deliverables.",
        "Advanced planning|||Gantt chart, critical path, dependencies, resource allocation.",
        "Budget management|||Detailed budgets, expense tracking, commitments and forecasts.",
        "Risk management|||Identification, assessment, mitigation plans and monitoring.",
        "KPI tracking|||Custom indicators, targets and automatic alerts.",
        "Reports and AI|||Progress report generation and AI-assisted smart analysis.",
        "Collaboration|||Tasks, comments, document sharing and activity history.",
        "Document management|||Centralize all documents, versions and approvals.",
      ] },
      { badge: "chips", title: "Concrete benefits for your teams", items: ["+35% — project performance", "-30% — time spent on reporting", "+50% — risk and cost control", "100% — real-time visibility", "Better — team collaboration and traceability"] },
      { badge: "list", title: "Integrations and compatibility", items: ["Works online and offline", "Excel, PDF, PowerPoint export", "Open API and webhooks", "Mobile compatible (Android and iOS)", "Secure and confidential"] },
      { badge: "closing", title: "Run your projects. Maximize your impact.", text: "Adopt modern, results-focused project management aligned with international best practice.", image_url: "/images/research-innovation/project-capacity-building.png" },
    ],
  },
  { page_key: "recherche-innovation", label: "Recherche & innovation", path: "/recherche-innovation", eyebrow: "Recherche · Innovation · Conseil", title: "Transformer les données en décisions, les idées en impact", description: "Nous accompagnons partout dans le monde les institutions, organisations, entreprises et chercheurs, de la conception à la mesure de l'impact.", sections: [
    { title: "Recherche scientifique", text: "Des protocoles rigoureux et des résultats directement exploitables.", items: ["Études quantitatives, qualitatives et mixtes", "Enquêtes SMART, SENS, KAP, DHS, MICS, HEA et IPC", "Revues systématiques, méta-analyses et recherche opérationnelle"] },
    { title: "Innovation", text: "Des solutions numériques et méthodologiques adaptées à chaque contexte.", items: ["Santé numérique et outils de collecte", "Analyse de données, SIG et intelligence artificielle", "Conception et expérimentation de solutions"] },
    { title: "Conseil stratégique", text: "Un accompagnement de bout en bout, aligné sur les standards internationaux.", items: ["Conception de projets et programmes", "Suivi-évaluation, apprentissage et capitalisation", "Renforcement des capacités et assistance technique"] },
    { title: "Nos domaines", items: ["Santé publique et nutrition", "Sécurité alimentaire", "Données et systèmes d'information", "Gestion de projets, programmes et portefeuilles"] },
    { title: "Notre démarche", items: ["Comprendre", "Concevoir", "Mettre en œuvre", "Mesurer", "Capitaliser"] },
    { title: "Pourquoi NutVitaGlobalis", items: ["Décisions fondées sur les preuves", "Expertise multidisciplinaire internationale", "Solutions adaptées au contexte", "Référentiels OMS, UNICEF, FAO et Sphere"] },
  ], cta_label: "Parler de votre projet", cta_url: "/contact" },  ...nutritionProgramSitePages,
];

export function defaultSitePage(key: string) { return sitePages.find(page => page.page_key === key); }
