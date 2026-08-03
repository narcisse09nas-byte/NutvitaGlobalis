export type ManagedSection = { title: string; text?: string; items?: string[] };
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
};

export const sitePages: SitePageContent[] = [
  { page_key: "recrutement", label: "Recrutement", path: "/recrutement-dieteticiens", eyebrow: "Rejoignez-nous", title: "Rejoindre le rÃ©seau des diÃ©tÃ©ticiens-nutritionnistes NutVitaGlobalis", description: "Mettez votre expertise au service de patients et de programmes nutritionnels accessibles, rigoureux et adaptÃ©s aux rÃ©alitÃ©s locales.", sections: [
    { title: "Une communautÃ© professionnelle engagÃ©e", text: "NutVitaGlobalis rÃ©unit des professionnels qualifiÃ©s pour intervenir en tÃ©lÃ©conseil, suivi personnalisÃ©, nutrition clinique et programmes en ligne.", items: ["DiÃ©tÃ©ticien-nutritionniste", "Nutritionniste", "Professionnel de santÃ© avec expÃ©rience en nutrition", "Consultant en nutrition clinique"] },
    { title: "Domaines recherchÃ©s", items: ["DiabÃ¨te", "ObÃ©sitÃ©", "Nutrition infantile", "Nutrition maternelle", "Nutrition clinique", "Hypertension", "SantÃ© publique nutritionnelle"] },
    { title: "Processus de sÃ©lection", items: ["Soumission du dossier", "Analyse administrative", "Test Ã©crit en ligne", "Entretien vidÃ©o", "Validation finale", "IntÃ©gration au rÃ©seau"] },
  ], cta_label: "Soumettre ma candidature", cta_url: "/candidat" },
  { page_key: "a-propos", label: "Ã€ propos", path: "/a-propos", eyebrow: "Qui sommes-nous ?", title: "La science au service de vies plus saines", description: "NutVitaGlobalis est nÃ©e dâ€™une conviction : une information claire, adaptÃ©e et humaine peut transformer durablement la santÃ©.", sections: [
    { title: "Mission", text: "Rendre lâ€™expertise nutritionnelle fiable accessible aux familles, aux communautÃ©s et aux professionnels." },
    { title: "Vision", text: "Une Afrique oÃ¹ chacun dispose des connaissances nÃ©cessaires pour faire de la nutrition un levier de santÃ©." },
    { title: "Valeurs", text: "Rigueur scientifique, proximitÃ©, respect des cultures, prÃ©vention et impact durable guident chaque action." },
    { title: "Expertise", text: "Nutrition clinique, santÃ© publique, sÃ©curitÃ© alimentaire, formation et accompagnement comportemental." },
  ] },
  { page_key: "contact", label: "Contact", path: "/contact", eyebrow: "Parlons-nous", title: "Une question ? Notre Ã©quipe vous rÃ©pond", description: "Formation, accompagnement ou partenariat : Ã©crivez-nous et nous reviendrons vers vous rapidement.", sections: [{ title: "Restons en contact", text: "Nous rÃ©pondons gÃ©nÃ©ralement sous un jour ouvrÃ©." }] },
  { page_key: "ressources", label: "Ressources", path: "/ressources", eyebrow: "Apprendre", title: "Des ressources pour mieux dÃ©cider", description: "Articles pratiques, guides professionnels et outils fondÃ©s sur des informations fiables et contextualisÃ©es.", sections: [] },
  { page_key: "formations", label: "Formations", path: "/formations", eyebrow: "Se former", title: "Des compÃ©tences qui transforment les pratiques", description: "Des parcours flexibles, concrets et conÃ§us par des professionnels de la nutrition et de la santÃ© publique.", sections: [] },
  { page_key: "teleconseils", label: "TÃ©lÃ©conseils", path: "/teleconseils", eyebrow: "Ã€ vos cÃ´tÃ©s", title: "Votre nutritionniste, oÃ¹ que vous soyez", description: "Un Ã©change confidentiel en visioconfÃ©rence ou sur WhatsApp, suivi de recommandations adaptÃ©es Ã  votre santÃ© et Ã  votre quotidien.", sections: [] },
  { page_key: "suivi-sante", label: "Suivi SantÃ©", path: "/suivi-sante", eyebrow: "Suivi autonome annuel", title: "Comprendre vos indicateurs de santÃ©, jour aprÃ¨s jour", description: "Enregistrez vos donnÃ©es, visualisez vos tendances et recevez des analyses prudentes, sans consultation obligatoire.", sections: [{ title: "Suivi SantÃ© Autonome", text: "10 000 FCFA HT, taxe selon votre pays, accÃ¨s pendant 12 mois." }, { title: "Croissance Enfant", text: "10 000 FCFA HT par enfant et par an, avec historique et courbes." }] },
  { page_key: "acces", label: "Page de connexion", path: "/acces", eyebrow: "AccÃ¨s sÃ©curisÃ©s", title: "Choisissez votre espace", description: "Chaque utilisateur accÃ¨de uniquement aux services et informations correspondant Ã  son profil.", sections: [] },
  { page_key: "confidentialite", label: "ConfidentialitÃ©", path: "/confidentialite", eyebrow: "Vos donnÃ©es", title: "Politique de confidentialitÃ©", description: "Nous limitons la collecte aux informations nÃ©cessaires aux services de nutrition, de suivi santÃ© et de recrutement.", sections: [] },
  { page_key: "recherche-innovation", label: "Recherche & innovation", path: "/recherche-innovation", eyebrow: "Recherche · Innovation · Conseil", title: "Transformer les données en décisions, les idées en impact", description: "Nous accompagnons partout dans le monde les institutions, organisations, entreprises et chercheurs, de la conception à la mesure de l'impact.", sections: [
    { title: "Recherche scientifique", text: "Des protocoles rigoureux et des résultats directement exploitables.", items: ["Études quantitatives, qualitatives et mixtes", "Enquêtes SMART, SENS, KAP, DHS, MICS, HEA et IPC", "Revues systématiques, méta-analyses et recherche opérationnelle"] },
    { title: "Innovation", text: "Des solutions numériques et méthodologiques adaptées à chaque contexte.", items: ["Santé numérique et outils de collecte", "Analyse de données, SIG et intelligence artificielle", "Conception et expérimentation de solutions"] },
    { title: "Conseil stratégique", text: "Un accompagnement de bout en bout, aligné sur les standards internationaux.", items: ["Conception de projets et programmes", "Suivi-évaluation, apprentissage et capitalisation", "Renforcement des capacités et assistance technique"] },
    { title: "Nos domaines", items: ["Santé publique et nutrition", "Sécurité alimentaire", "Données et systèmes d'information", "Gestion de projets, programmes et portefeuilles"] },
    { title: "Notre démarche", items: ["Comprendre", "Concevoir", "Mettre en œuvre", "Mesurer", "Capitaliser"] },
    { title: "Pourquoi NutVitaGlobalis", items: ["Décisions fondées sur les preuves", "Expertise multidisciplinaire internationale", "Solutions adaptées au contexte", "Référentiels OMS, UNICEF, FAO et Sphere"] },
  ], cta_label: "Parler de votre projet", cta_url: "/contact" },];

export function defaultSitePage(key: string) { return sitePages.find(page => page.page_key === key); }
