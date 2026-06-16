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
  { page_key: "formations", label: "Formations", path: "/formations", eyebrow: "Se former", title: "Des compétences qui transforment les pratiques", description: "Des parcours flexibles, concrets et conçus par des professionnels de la nutrition et de la santé publique.", sections: [] },
  { page_key: "teleconseils", label: "Téléconseils", path: "/teleconseils", eyebrow: "À vos côtés", title: "Votre nutritionniste, où que vous soyez", description: "Un échange confidentiel en visioconférence ou sur WhatsApp, suivi de recommandations adaptées à votre santé et à votre quotidien.", sections: [] },
  { page_key: "suivi-sante", label: "Suivi Santé", path: "/suivi-sante", eyebrow: "Suivi autonome annuel", title: "Comprendre vos indicateurs de santé, jour après jour", description: "Enregistrez vos données, visualisez vos tendances et recevez des analyses prudentes, sans consultation obligatoire.", sections: [{ title: "Suivi Santé Autonome", text: "10 000 FCFA HT, taxe selon votre pays, accès pendant 12 mois." }, { title: "Croissance Enfant", text: "10 000 FCFA HT par enfant et par an, avec historique et courbes." }] },
  { page_key: "acces", label: "Page de connexion", path: "/acces", eyebrow: "Accès sécurisés", title: "Choisissez votre espace", description: "Chaque utilisateur accède uniquement aux services et informations correspondant à son profil.", sections: [] },
  { page_key: "confidentialite", label: "Confidentialité", path: "/confidentialite", eyebrow: "Vos données", title: "Politique de confidentialité", description: "Nous limitons la collecte aux informations nécessaires aux services de nutrition, de suivi santé et de recrutement.", sections: [] },
];

export function defaultSitePage(key: string) { return sitePages.find(page => page.page_key === key); }
