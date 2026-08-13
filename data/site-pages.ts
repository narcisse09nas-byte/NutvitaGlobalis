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
    { title: "Prise en charge de la malnutrition aiguë (NutriTrack)", text: "Dépistage, admission, suivi clinique, gestion des stocks et reporting pour les structures autorisées.", items: ["Suivi des cas MAM & MAS", "Gestion des admissions et sorties", "Monitoring des stocks et consommables", "Rapports standards et personnalisés"] },
    { title: "Support aux enquêtes de sécurité alimentaire et nutrition", text: "Concevez les questionnaires, collectez les données et produisez des analyses fiables pour la décision.", items: ["Conception de questionnaires (ODK/Kobo)", "Collecte mobile et hors ligne", "Nettoyage et validation des données", "Analyses statistiques et tableaux de bord"] },
    { title: "Gestion des projets, programmes et portefeuilles", text: "Planifiez les activités, ressources, résultats, risques et performances dans un espace structuré.", items: ["Planification et suivi des activités", "Gestion budgétaire et ressources", "Suivi des indicateurs et résultats", "Tableaux de bord et rapports"] },
    { title: "Sécurité et conformité", text: "Données protégées, normes internationales respectées." },
    { title: "Interopérabilité", text: "Intégration fluide avec vos outils et systèmes existants." },
    { title: "Disponible partout", text: "Accédez à vos données en ligne ou hors ligne, sur tous vos appareils." },
    { title: "Support réactif", text: "Assistance technique et accompagnement personnalisé." },
  ], sections_en: [
    { title: "Secure access", text: "Verified authentication and permissions" },
    { title: "Reliable data", text: "Rigorous collection and validated analysis" },
    { title: "Informed decisions", text: "Relevant information at the right time" },
    { title: "Measurable impact", text: "Continuous monitoring and tangible results" },
    { title: "Acute malnutrition care (NutriTrack)", text: "Screening, admission, clinical monitoring, stock management and reporting for authorized facilities.", items: ["MAM & SAM case monitoring", "Admission and discharge management", "Stock and supply monitoring", "Standard and custom reports"] },
    { title: "Food security and nutrition survey support", text: "Design questionnaires, collect data and produce reliable decision-ready analyses.", items: ["Questionnaire design (ODK/Kobo)", "Mobile and offline collection", "Data cleaning and validation", "Statistical analysis and dashboards"] },
    { title: "Project, programme and portfolio management", text: "Plan activities, resources, results, risks and performance in one structured workspace.", items: ["Activity planning and monitoring", "Budget and resource management", "Indicator and results monitoring", "Dashboards and reports"] },
    { title: "Security and compliance", text: "Protected data and respected international standards." },
    { title: "Interoperability", text: "Seamless integration with your existing tools and systems." },
    { title: "Available everywhere", text: "Access your data online or offline, on every device." },
    { title: "Responsive support", text: "Technical assistance and personalized support." },
  ] },  { page_key: "recherche-innovation", label: "Recherche & innovation", path: "/recherche-innovation", eyebrow: "Recherche · Innovation · Conseil", title: "Transformer les données en décisions, les idées en impact", description: "Nous accompagnons partout dans le monde les institutions, organisations, entreprises et chercheurs, de la conception à la mesure de l'impact.", sections: [
    { title: "Recherche scientifique", text: "Des protocoles rigoureux et des résultats directement exploitables.", items: ["Études quantitatives, qualitatives et mixtes", "Enquêtes SMART, SENS, KAP, DHS, MICS, HEA et IPC", "Revues systématiques, méta-analyses et recherche opérationnelle"] },
    { title: "Innovation", text: "Des solutions numériques et méthodologiques adaptées à chaque contexte.", items: ["Santé numérique et outils de collecte", "Analyse de données, SIG et intelligence artificielle", "Conception et expérimentation de solutions"] },
    { title: "Conseil stratégique", text: "Un accompagnement de bout en bout, aligné sur les standards internationaux.", items: ["Conception de projets et programmes", "Suivi-évaluation, apprentissage et capitalisation", "Renforcement des capacités et assistance technique"] },
    { title: "Nos domaines", items: ["Santé publique et nutrition", "Sécurité alimentaire", "Données et systèmes d'information", "Gestion de projets, programmes et portefeuilles"] },
    { title: "Notre démarche", items: ["Comprendre", "Concevoir", "Mettre en œuvre", "Mesurer", "Capitaliser"] },
    { title: "Pourquoi NutVitaGlobalis", items: ["Décisions fondées sur les preuves", "Expertise multidisciplinaire internationale", "Solutions adaptées au contexte", "Référentiels OMS, UNICEF, FAO et Sphere"] },
  ], cta_label: "Parler de votre projet", cta_url: "/contact" },  ...nutritionProgramSitePages,
];

export function defaultSitePage(key: string) { return sitePages.find(page => page.page_key === key); }
