export type LegalLocale = "fr" | "en";
export type LegalSection = { title: string; body: string };
export type LegalTemplate = {
  key: string;
  slug: string;
  type: string;
  requiresSignature?: boolean;
  signatureType?: "teleconsultation" | "partner_contract" | "client_contract" | "parental_consent";
  fr: { title: string; intro: string; sections: LegalSection[] };
  en: { title: string; intro: string; sections: LegalSection[] };
};

const disclaimerFr = "Les informations fournies par NutVitaGlobalis sont destinees a des fins educatives et informatives. Elles ne remplacent pas un diagnostic medical, un traitement medical ou une consultation aupres d'un professionnel de sante qualifie.";
const disclaimerEn = "Information provided by NutVitaGlobalis is intended for educational and informational purposes. It does not replace a medical diagnosis, medical treatment, or consultation with a qualified healthcare professional.";

export const legalTemplates: LegalTemplate[] = [
  {
    key: "cgu",
    slug: "cgu",
    type: "terms_of_use",
    fr: {
      title: "Conditions Generales d'Utilisation",
      intro: "Les presentes Conditions Generales d'Utilisation encadrent l'acces a la plateforme NutVitaGlobalis, a ses espaces publics et a ses espaces connectes.",
      sections: [
        { title: "Objet du site", body: "NutVitaGlobalis propose des informations nutritionnelles, des formations, des teleconseils, des outils de suivi sante, un suivi de croissance enfant et des services de collaboration avec des professionnels. La plateforme n'est pas un service d'urgence medicale." },
        { title: "Creation de compte", body: "L'utilisateur doit fournir des informations exactes, maintenir ses coordonnees a jour et proteger ses identifiants. Toute utilisation du compte est reputee effectuee par son titulaire jusqu'a notification d'une compromission." },
        { title: "Responsabilites des utilisateurs", body: "L'utilisateur s'engage a renseigner des donnees sinceres, a respecter les rendez-vous, a ne pas transmettre de contenus illicites et a utiliser les services dans un cadre personnel ou professionnel autorise." },
        { title: "Suspension de compte", body: "NutVitaGlobalis peut suspendre temporairement ou definitivement un compte en cas de fraude, abus, tentative d'acces non autorise, non-paiement, comportement dangereux ou violation des presentes conditions." },
        { title: "Securite", body: "La plateforme met en oeuvre des controles d'acces, une journalisation des actions sensibles et des mesures de protection adaptees. L'utilisateur doit signaler rapidement toute suspicion d'acces non autorise." },
        { title: "Donnees personnelles", body: "Les donnees sont traitees selon la Politique de Confidentialite. Certaines donnees peuvent concerner la sante ou la croissance d'un enfant et necessitent des protections renforcees et des consentements specifiques." },
        { title: "Propriete intellectuelle", body: "Les textes, marques, contenus pedagogiques, interfaces, rapports, modeles et documents NutVitaGlobalis sont proteges. Toute reproduction non autorisee est interdite." },
        { title: "Utilisation acceptable", body: "Il est interdit de contourner les protections, d'extraire massivement les contenus, d'usurper une identite, de perturber la plateforme ou d'utiliser les services pour produire des conseils dangereux." },
        { title: "Loi applicable", body: "Les presentes conditions sont interpretees selon les lois applicables au lieu d'exploitation de NutVitaGlobalis et, lorsque pertinent, selon les regles locales de protection des consommateurs et des donnees." },
        { title: "Formations, evaluations et certificats", body: "L'acces aux formations depend du role actif, de l'inscription et, le cas echeant, du paiement. Les regles d'evaluation, de surveillance, de progression et de certification sont precisees dans chaque parcours. Toute fraude, usurpation ou partage de compte peut entrainer l'annulation des resultats ou certificats." },
        { title: "Professionnels et formateurs", body: "Les nutritionnistes, formateurs et autres partenaires interviennent dans la limite de leurs qualifications, autorisations et missions. Leur acces est limite aux services, formations et dossiers qui leur sont attribues." },
        { title: "Paiements, abonnements et services numeriques", body: "Les achats, abonnements, renouvellements, taxes, activations, annulations et remboursements sont egalement regis par les Conditions Generales de Vente et la Politique de Remboursement applicables au moment de la transaction." },
        { title: "Fonctions automatisees et intelligence artificielle", body: "Les analyses, suggestions ou contenus produits automatiquement sont des aides informatives. Ils peuvent etre incomplets et doivent etre verifies avant toute decision importante, conformement aux Conditions d'Utilisation de l'IA." },
        { title: "Disponibilite et evolution du service", body: "La plateforme peut etre interrompue pour maintenance, securite, mise a jour ou evenement independant de notre volonte. Les fonctionnalites peuvent evoluer afin d'ameliorer le service ou respecter de nouvelles obligations." },
        { title: "Modification des conditions", body: "Les presentes conditions peuvent etre mises a jour lorsque les services ou obligations evoluent. La version et la date applicables sont affichees; une nouvelle acceptation peut etre demandee pour les changements substantiels." },
        { title: "Resolution des litiges", body: "Les parties recherchent d'abord une solution amiable. A defaut, le litige peut etre porte devant les autorites competentes selon les regles applicables." },
      ],
    },
    en: {
      title: "Terms of Use",
      intro: "These Terms of Use govern access to NutVitaGlobalis, including public pages and authenticated workspaces.",
      sections: [
        { title: "Purpose of the site", body: "NutVitaGlobalis provides nutrition information, courses, counselling, health tracking, child growth monitoring and collaboration services with professionals. The platform is not an emergency medical service." },
        { title: "Account creation", body: "Users must provide accurate information, keep contact details up to date and protect their credentials. Activity on an account is deemed to be performed by its holder until a compromise is reported." },
        { title: "User responsibilities", body: "Users agree to provide truthful data, attend appointments, avoid unlawful content and use services only within an authorized personal or professional context." },
        { title: "Account suspension", body: "NutVitaGlobalis may suspend or terminate an account in cases of fraud, abuse, unauthorized access attempts, non-payment, dangerous conduct or breach of these terms." },
        { title: "Security", body: "The platform uses access controls, logging of sensitive actions and appropriate protection measures. Users must promptly report suspected unauthorized access." },
        { title: "Personal data", body: "Data is processed under the Privacy Policy. Some data may relate to health or child growth and requires reinforced protection and specific consent." },
        { title: "Intellectual property", body: "NutVitaGlobalis texts, brands, learning content, interfaces, reports, templates and documents are protected. Unauthorized reproduction is prohibited." },
        { title: "Acceptable use", body: "Users may not bypass protections, extract content at scale, impersonate others, disrupt the platform or use services to produce dangerous advice." },
        { title: "Applicable law", body: "These terms are interpreted according to the laws applicable to NutVitaGlobalis operations and, where relevant, local consumer and data protection rules." },
        { title: "Courses, assessments and certificates", body: "Access to courses depends on the active role, enrollment and, where applicable, payment. Assessment, proctoring, progress and certification rules are specified in each learning path. Fraud, impersonation or account sharing may lead to cancellation of results or certificates." },
        { title: "Professionals and instructors", body: "Dietitians, instructors and other partners act within their qualifications, authorizations and assigned duties. Their access is limited to the services, courses and records assigned to them." },
        { title: "Payments, subscriptions and digital services", body: "Purchases, subscriptions, renewals, taxes, activation, cancellation and refunds are also governed by the Terms of Sale and Refund Policy applicable at the time of the transaction." },
        { title: "Automated and artificial intelligence features", body: "Automated analyses, suggestions and generated content are informational aids. They may be incomplete and must be reviewed before important decisions, in accordance with the AI Usage Terms." },
        { title: "Service availability and evolution", body: "The platform may be interrupted for maintenance, security, updates or events beyond our control. Features may evolve to improve the service or comply with new obligations." },
        { title: "Changes to these terms", body: "These terms may be updated as services or obligations evolve. The applicable version and date are displayed, and renewed acceptance may be required for material changes." },
        { title: "Dispute resolution", body: "The parties first seek an amicable solution. Failing that, disputes may be submitted to competent authorities under applicable rules." },
      ],
    },
  },
  {
    key: "cgv",
    slug: "cgv",
    type: "terms_of_sale",
    fr: {
      title: "Conditions Generales de Vente",
      intro: "Les presentes Conditions Generales de Vente encadrent l'achat des services numeriques et d'accompagnement proposes par NutVitaGlobalis.",
      sections: [
        { title: "Produits vendus", body: "NutVitaGlobalis vend des formations, packs de teleconseil nutritionnel, abonnements de suivi sante, abonnements de suivi croissance enfant, ressources premium et services associes." },
        { title: "Formations", body: "Les formations sont livrees sous forme numerique via la plateforme ou un environnement de formation connecte. Les objectifs, durees, prix et conditions d'acces sont affiches avant achat." },
        { title: "Teleconseils", body: "Les teleconseils donnent acces a un accompagnement nutritionnel sur une periode definie, avec rendez-vous, messagerie ou appels selon l'offre souscrite." },
        { title: "Suivi Sante", body: "Le Suivi Sante donne acces a l'enregistrement de mesures, graphiques, analyses automatisees, rapports et recommandations informatives selon le niveau d'abonnement." },
        { title: "Suivi Croissance Enfant", body: "Le suivi de croissance enfant est rattache au parent ou tuteur et permet l'enregistrement de mesures, l'affichage de courbes et l'analyse informative de la croissance." },
        { title: "Prix et taxes", body: "Les prix sont affiches hors taxes ou toutes taxes comprises selon le contexte. Les taxes applicables dependent du pays, du type de service et des regles fiscales configurees." },
        { title: "Facturation", body: "Une facture ou un recu est genere apres confirmation du paiement. Le client doit verifier l'exactitude de ses informations de facturation." },
        { title: "Paiement", body: "Les paiements peuvent etre traites par Stripe, Flutterwave, mobile money, carte bancaire ou tout autre canal active. L'acces au service peut etre suspendu en cas d'echec ou d'annulation de paiement." },
        { title: "Livraison numerique", body: "Sauf mention contraire, les services numeriques sont actives automatiquement ou manuellement apres confirmation du paiement et verification eventuelle." },
        { title: "Annulation et remboursement", body: "Les annulations et remboursements suivent la Politique de Remboursement. Certains services consommes, demarres ou personnalises ne sont pas automatiquement remboursables." },
      ],
    },
    en: {
      title: "Terms and Conditions of Sale",
      intro: "These Terms and Conditions of Sale govern purchases of digital services and support offered by NutVitaGlobalis.",
      sections: [
        { title: "Products sold", body: "NutVitaGlobalis sells courses, nutrition counselling packs, health monitoring subscriptions, child growth monitoring subscriptions, premium resources and related services." },
        { title: "Courses", body: "Courses are delivered digitally through the platform or a connected learning environment. Objectives, duration, prices and access conditions are displayed before purchase." },
        { title: "Nutrition counselling", body: "Counselling packs provide nutrition support for a defined period, with appointments, messaging or calls depending on the selected offer." },
        { title: "Health Monitoring", body: "Health Monitoring provides access to measurement entry, charts, automated analyses, reports and informational recommendations according to the subscription level." },
        { title: "Child Growth Monitoring", body: "Child growth monitoring is linked to a parent or guardian and allows measurement entry, growth curves and informational growth analysis." },
        { title: "Prices and taxes", body: "Prices are displayed excluding or including taxes depending on context. Applicable taxes depend on country, service type and configured tax rules." },
        { title: "Invoicing", body: "An invoice or receipt is generated after payment confirmation. The client must verify the accuracy of billing information." },
        { title: "Payment", body: "Payments may be processed by Stripe, Flutterwave, mobile money, card or any activated channel. Service access may be suspended after failed or cancelled payment." },
        { title: "Digital delivery", body: "Unless otherwise stated, digital services are activated automatically or manually after payment confirmation and any required verification." },
        { title: "Cancellation and refund", body: "Cancellations and refunds follow the Refund Policy. Consumed, started or personalized services are not automatically refundable." },
      ],
    },
  },
  {
    key: "confidentialite",
    slug: "confidentialite",
    type: "privacy_policy",
    fr: {
      title: "Politique de Confidentialite",
      intro: "Cette politique explique comment NutVitaGlobalis collecte, utilise, conserve et protege les donnees personnelles et les donnees sensibles.",
      sections: [
        { title: "Donnees collectees", body: "Nous pouvons collecter l'identite, les coordonnees, le pays, la ville, les informations de paiement, les documents, les messages, les consentements, les journaux techniques et les donnees necessaires au service." },
        { title: "Donnees de sante", body: "Les mesures anthropometriques, donnees biologiques, habitudes alimentaires, informations de consultation et donnees de croissance enfant sont traitees avec une vigilance renforcee." },
        { title: "Utilisation des donnees", body: "Les donnees servent a creer les comptes, fournir les services, securiser les acces, generer des rapports, traiter les paiements, envoyer des notifications et respecter les obligations legales." },
        { title: "Stockage", body: "Les donnees sont stockees dans des environnements techniques selectionnes pour leur securite et leur compatibilite avec les besoins de la plateforme." },
        { title: "Securite", body: "NutVitaGlobalis applique des controles d'acces par role, la journalisation, des protections applicatives et des mecanismes de limitation d'acces aux donnees sensibles." },
        { title: "Conservation", body: "Les donnees sont conservees pendant la duree necessaire aux finalites du traitement, aux obligations legales, a la preuve des consentements et a la securite." },
        { title: "Droits des utilisateurs", body: "Les utilisateurs peuvent demander l'acces, la rectification, l'export, l'opposition lorsque applicable, la limitation ou la suppression de leurs donnees." },
        { title: "Export des donnees", body: "Un espace de confidentialite permet au client de demander ou telecharger une copie des informations le concernant lorsque la fonctionnalite est disponible." },
        { title: "Suppression des donnees", body: "La suppression peut etre limitee par des obligations legales, comptables, contractuelles, de prevention de fraude ou de preuve des soins et consentements." },
        { title: "Contact confidentialite", body: "Toute demande peut etre envoyee a contact@nutvitaglobalis.com ou effectuee depuis l'espace client." },
      ],
    },
    en: {
      title: "Privacy Policy",
      intro: "This policy explains how NutVitaGlobalis collects, uses, retains and protects personal and sensitive data.",
      sections: [
        { title: "Data collected", body: "We may collect identity, contact details, country, city, payment information, documents, messages, consents, technical logs and data required for service delivery." },
        { title: "Health data", body: "Anthropometric measurements, biological data, food habits, consultation information and child growth data are processed with reinforced care." },
        { title: "Use of data", body: "Data is used to create accounts, provide services, secure access, generate reports, process payments, send notifications and meet legal obligations." },
        { title: "Storage", body: "Data is stored in technical environments selected for security and compatibility with platform needs." },
        { title: "Security", body: "NutVitaGlobalis applies role-based access controls, logging, application protections and mechanisms limiting access to sensitive data." },
        { title: "Retention", body: "Data is retained for as long as necessary for processing purposes, legal obligations, proof of consent and security." },
        { title: "User rights", body: "Users may request access, correction, export, objection where applicable, restriction or deletion of their data." },
        { title: "Data export", body: "A privacy area allows clients to request or download a copy of their information when the feature is available." },
        { title: "Data deletion", body: "Deletion may be limited by legal, accounting, contractual, fraud prevention or evidence obligations." },
        { title: "Privacy contact", body: "Requests may be sent to contact@nutvitaglobalis.com or submitted from the client area." },
      ],
    },
  },
  {
    key: "cookies",
    slug: "cookies",
    type: "cookie_policy",
    fr: { title: "Politique de Cookies", intro: "Cette politique decrit l'utilisation des cookies et technologies similaires sur NutVitaGlobalis.", sections: [
      { title: "Cookies essentiels", body: "Ces cookies sont necessaires a la connexion, la securite, la langue choisie, la navigation et la protection contre les abus. Ils ne peuvent pas etre desactives depuis la plateforme sans affecter le service." },
      { title: "Cookies analytiques", body: "Ils aident a comprendre l'utilisation des pages, les performances et les parcours. Lorsqu'ils sont actives, les donnees sont utilisees de maniere agregee autant que possible." },
      { title: "Cookies marketing", body: "Ils peuvent etre utilises pour mesurer des campagnes ou proposer des contenus adaptes, uniquement lorsque le consentement requis est obtenu." },
      { title: "Consentement", body: "L'utilisateur peut accepter ou refuser les cookies non essentiels selon les options disponibles et les exigences locales." },
      { title: "Gestion des preferences", body: "Les preferences peuvent etre modifiees depuis le bandeau cookies, le navigateur ou l'espace de confidentialite lorsque disponible." },
    ] },
    en: { title: "Cookie Policy", intro: "This policy describes the use of cookies and similar technologies on NutVitaGlobalis.", sections: [
      { title: "Essential cookies", body: "These cookies are required for login, security, selected language, navigation and abuse prevention. They cannot be disabled from the platform without affecting the service." },
      { title: "Analytics cookies", body: "They help understand page usage, performance and user journeys. When enabled, data is used in aggregated form whenever possible." },
      { title: "Marketing cookies", body: "They may be used to measure campaigns or provide tailored content, only where the required consent has been obtained." },
      { title: "Consent", body: "Users may accept or refuse non-essential cookies according to available options and local requirements." },
      { title: "Managing preferences", body: "Preferences may be changed from the cookie banner, browser settings or privacy area when available." },
    ] },
  },
  {
    key: "remboursement",
    slug: "remboursement",
    type: "refund_policy",
    fr: { title: "Politique de Remboursement", intro: "Cette politique precise les conditions de remboursement applicables aux services NutVitaGlobalis.", sections: [
      { title: "Formations", body: "Le remboursement d'une formation est possible uniquement si la formation n'a pas ete commencee, si aucun contenu substantiel n'a ete consomme et si la demande est formulee dans le delai indique lors de l'achat." },
      { title: "Teleconseils", body: "Un remboursement peut etre demande avant le rendez-vous selon les conditions affichees, notamment en cas d'annulation suffisamment anticipee ou d'impossibilite imputable a NutVitaGlobalis." },
      { title: "Abonnements", body: "La resiliation met fin au renouvellement futur. Un remboursement partiel peut etre examine pour les periodes non consommees, sauf abus, avantage deja utilise ou condition contraire affichee." },
      { title: "Procedure", body: "La demande doit indiquer le service, la date d'achat, le motif et le moyen de paiement. NutVitaGlobalis peut demander des justificatifs." },
      { title: "Delais", body: "Les delais de remboursement dependent du moyen de paiement, du prestataire financier et des controles anti-fraude." },
    ] },
    en: { title: "Refund Policy", intro: "This policy defines refund conditions for NutVitaGlobalis services.", sections: [
      { title: "Courses", body: "A course refund is possible only if the course has not been started, no substantial content has been consumed and the request is submitted within the period displayed at purchase." },
      { title: "Nutrition counselling", body: "A refund may be requested before the appointment under displayed conditions, especially if cancellation is sufficiently early or the issue is attributable to NutVitaGlobalis." },
      { title: "Subscriptions", body: "Cancellation stops future renewal. A partial refund may be reviewed for unused periods, except in cases of abuse, benefits already used or contrary displayed conditions." },
      { title: "Procedure", body: "The request must include service, purchase date, reason and payment method. NutVitaGlobalis may request supporting evidence." },
      { title: "Timelines", body: "Refund timelines depend on the payment method, financial provider and anti-fraud checks." },
    ] },
  },
  {
    key: "consentement-teleconsultation",
    slug: "consentement-teleconsultation",
    type: "teleconsultation_consent",
    requiresSignature: true,
    signatureType: "teleconsultation",
    fr: { title: "Consentement a la Teleconsultation", intro: "Ce consentement doit etre accepte avant la premiere teleconsultation nutritionnelle.", sections: [
      { title: "Nature du service", body: "La teleconsultation NutVitaGlobalis est un accompagnement nutritionnel a distance realise par un professionnel ou un partenaire autorise selon le service souscrit." },
      { title: "Limites de la teleconsultation", body: "La teleconsultation ne remplace pas une urgence medicale, un examen clinique, un diagnostic medical ou une prescription. En cas de symptome grave, contactez les services d'urgence ou un medecin." },
      { title: "Confidentialite", body: "Les informations partagees sont traitees avec confidentialite et accessibles uniquement aux personnes autorisees pour la fourniture du service, la securite ou les obligations legales." },
      { title: "Consentement volontaire", body: "Le client confirme participer volontairement, peut poser des questions et peut mettre fin au service selon les conditions applicables." },
      { title: "Acceptation numerique", body: "La signature electronique, l'horodatage, l'adresse IP, l'utilisateur et la version du document signe sont conserves comme preuve du consentement." },
    ] },
    en: { title: "Teleconsultation Consent", intro: "This consent must be accepted before the first nutrition teleconsultation.", sections: [
      { title: "Nature of the service", body: "NutVitaGlobalis teleconsultation is remote nutrition support provided by a professional or authorized partner according to the subscribed service." },
      { title: "Limits of teleconsultation", body: "Teleconsultation does not replace emergency care, a physical examination, medical diagnosis or prescription. In case of serious symptoms, contact emergency services or a physician." },
      { title: "Confidentiality", body: "Shared information is treated confidentially and accessible only to authorized persons for service delivery, security or legal obligations." },
      { title: "Voluntary consent", body: "The client confirms voluntary participation, may ask questions and may end the service under applicable conditions." },
      { title: "Digital acceptance", body: "Electronic signature, timestamp, IP address, user and signed document version are retained as proof of consent." },
    ] },
  },
  {
    key: "conditions-suivi-sante",
    slug: "conditions-suivi-sante",
    type: "health_monitoring_terms",
    fr: { title: "Conditions du Suivi Sante", intro: "Ces conditions encadrent l'utilisation du module de suivi sante NutVitaGlobalis.", sections: [
      { title: "Usage personnel", body: "Le suivi sante est destine au suivi personnel du client et a l'organisation de ses donnees nutritionnelles. Il ne doit pas etre utilise pour prendre seul des decisions medicales critiques." },
      { title: "Limites du service", body: "Les graphiques, alertes et commentaires sont informatifs. Ils ne constituent ni diagnostic, ni traitement, ni avis medical urgent." },
      { title: "Donnees enregistrees", body: "Le client peut enregistrer poids, taille, IMC, constantes, donnees biologiques, habitudes alimentaires, documents et informations utiles au suivi." },
      { title: "Analyse IA", body: "L'IA peut aider a interpreter des tendances et produire des recommandations prudentes, mais ses resultats doivent etre verifies par un professionnel qualifie." },
      { title: "Responsabilite du client", body: "Le client reste responsable de l'exactitude des donnees saisies et doit consulter un professionnel en cas de doute, symptome ou resultat inquietant." },
    ] },
    en: { title: "Health Monitoring Terms", intro: "These terms govern use of the NutVitaGlobalis health monitoring module.", sections: [
      { title: "Personal use", body: "Health monitoring is intended for personal tracking and organization of nutrition data. It must not be used alone for critical medical decisions." },
      { title: "Service limits", body: "Charts, alerts and comments are informational. They are not a diagnosis, treatment or urgent medical advice." },
      { title: "Recorded data", body: "Clients may record weight, height, BMI, vital signs, biological data, food habits, documents and information useful for monitoring." },
      { title: "AI analysis", body: "AI may help interpret trends and produce cautious recommendations, but results must be reviewed by a qualified professional." },
      { title: "Client responsibility", body: "The client remains responsible for data accuracy and must consult a professional in case of doubt, symptoms or concerning results." },
    ] },
  },
  {
    key: "conditions-croissance-enfant",
    slug: "conditions-croissance-enfant",
    type: "child_growth_terms",
    requiresSignature: true,
    signatureType: "parental_consent",
    fr: { title: "Conditions du Suivi Croissance Enfant", intro: "Ces conditions encadrent le suivi de croissance des enfants par un parent ou tuteur autorise.", sections: [
      { title: "Consentement parental", body: "Le parent ou tuteur declare etre autorise a renseigner les donnees de l'enfant et a utiliser le service dans son interet." },
      { title: "Utilisation des donnees de l'enfant", body: "Les donnees de l'enfant sont utilisees pour afficher les courbes, suivre les mesures, produire des commentaires informatifs et faciliter l'accompagnement." },
      { title: "Suivi des mesures", body: "Les mesures doivent etre saisies avec soin, avec les dates correctes et les unites appropriees. Des erreurs de saisie peuvent fausser les analyses." },
      { title: "Analyse IA", body: "Les analyses automatisees peuvent signaler des points a verifier, mais ne remplacent pas l'evaluation d'un pediatre ou professionnel qualifie." },
      { title: "Limites du service", body: "Le service n'est pas un dispositif d'urgence. En cas de retard de croissance suspect, symptome ou inquietude, consultez rapidement un professionnel." },
    ] },
    en: { title: "Child Growth Monitoring Terms", intro: "These terms govern child growth monitoring by an authorized parent or guardian.", sections: [
      { title: "Parental consent", body: "The parent or guardian declares being authorized to enter the child's data and use the service in the child's interest." },
      { title: "Use of child data", body: "Child data is used to display curves, track measurements, produce informational comments and support follow-up." },
      { title: "Measurement tracking", body: "Measurements must be entered carefully, with correct dates and units. Entry errors may distort analyses." },
      { title: "AI analysis", body: "Automated analyses may flag points to review but do not replace assessment by a pediatrician or qualified professional." },
      { title: "Service limits", body: "The service is not an emergency tool. In case of suspected growth delay, symptoms or concern, promptly consult a professional." },
    ] },
  },
  {
    key: "conditions-recrutement-dieteticiens",
    slug: "conditions-recrutement-dieteticiens",
    type: "dietitian_recruitment_terms",
    fr: { title: "Conditions de Recrutement des Dieteticiens", intro: "Ces conditions encadrent le processus de candidature des dieteticiens-nutritionnistes souhaitant rejoindre le reseau.", sections: [
      { title: "Conditions d'eligibilite", body: "Le candidat doit fournir une identite exacte, des coordonnees valides, des diplomes pertinents, une experience ou competence compatible et accepter les standards NutVitaGlobalis." },
      { title: "Verification des diplomes", body: "NutVitaGlobalis peut demander des copies, verifier l'authenticite des diplomes, contacter les etablissements ou refuser un dossier incomplet." },
      { title: "Verification des references", body: "Le candidat autorise la verification de references professionnelles, experiences, antecedents declares et informations necessaires a l'evaluation." },
      { title: "Protection des donnees", body: "Les donnees de candidature sont traitees pour l'analyse du dossier, les entretiens, tests, decisions et obligations de preuve." },
      { title: "Motifs de rejet", body: "Un dossier peut etre rejete en cas d'informations fausses, documents non conformes, references defavorables, competence insuffisante, comportement inadapte ou besoin operationnel limite." },
    ] },
    en: { title: "Dietitian Recruitment Terms", intro: "These terms govern the application process for dietitians-nutritionists wishing to join the network.", sections: [
      { title: "Eligibility conditions", body: "Candidates must provide accurate identity, valid contact details, relevant credentials, compatible experience or skills and accept NutVitaGlobalis standards." },
      { title: "Credential verification", body: "NutVitaGlobalis may request copies, verify credential authenticity, contact institutions or refuse an incomplete file." },
      { title: "Reference checks", body: "The candidate authorizes verification of professional references, experience, declared background and information required for assessment." },
      { title: "Data protection", body: "Application data is processed for file review, interviews, tests, decisions and evidentiary obligations." },
      { title: "Reasons for rejection", body: "An application may be rejected for false information, non-compliant documents, unfavorable references, insufficient competence, inappropriate conduct or limited operational need." },
    ] },
  },
  {
    key: "contrat-partenariat-dieteticien",
    slug: "contrat-partenariat-dieteticien",
    type: "dietitian_partnership_agreement",
    requiresSignature: true,
    signatureType: "partner_contract",
    fr: { title: "Contrat de Partenariat Dieteticien", intro: "Modele de contrat de partenariat entre NutVitaGlobalis et {{nom_dieteticien}} ({{email_dieteticien}}).", sections: [
      { title: "Objet du partenariat", body: "Le present contrat definit les conditions dans lesquelles {{nom_dieteticien}} intervient comme partenaire dieteticien-nutritionniste pour les services NutVitaGlobalis." },
      { title: "Missions", body: "Le partenaire peut realiser des teleconseils, suivis nutritionnels, avis professionnels, contenus pedagogiques, actions de prevention et toute mission convenue par ecrit." },
      { title: "Remuneration", body: "La remuneration est calculee selon les regles validees par NutVitaGlobalis. Le tarif de reference de consultation est {{tarif_consultation}}, sous reserve des conditions commerciales applicables." },
      { title: "Confidentialite", body: "Le partenaire s'engage a garder confidentielles les donnees clients, informations internes, documents, methodes et informations medicales ou nutritionnelles accessibles." },
      { title: "Protection des donnees", body: "Le partenaire respecte les consignes de securite, limite l'acces aux donnees au strict necessaire et signale tout incident ou suspicion d'incident." },
      { title: "Qualite de service", body: "Le partenaire agit avec competence, prudence, ponctualite, courtoisie et conformite aux standards professionnels, sans poser de diagnostic medical hors de son champ autorise." },
      { title: "Resiliation", body: "Chaque partie peut mettre fin au partenariat selon le preavis ou immediatement en cas de faute grave, violation de confidentialite, fraude ou risque pour les clients." },
      { title: "Signature electronique", body: "Le contrat est signe electroniquement le {{date_signature}}. L'horodatage, l'adresse IP et l'empreinte de signature sont conserves." },
    ] },
    en: { title: "Dietitian Partnership Agreement", intro: "Partnership agreement template between NutVitaGlobalis and {{nom_dieteticien}} ({{email_dieteticien}}).", sections: [
      { title: "Purpose of the partnership", body: "This agreement defines the conditions under which {{nom_dieteticien}} acts as a dietitian-nutritionist partner for NutVitaGlobalis services." },
      { title: "Duties", body: "The partner may perform nutrition counselling, follow-up, professional opinions, learning content, prevention activities and any mission agreed in writing." },
      { title: "Compensation", body: "Compensation is calculated according to rules approved by NutVitaGlobalis. The reference consultation fee is {{tarif_consultation}}, subject to applicable commercial terms." },
      { title: "Confidentiality", body: "The partner must keep confidential client data, internal information, documents, methods and medical or nutrition information accessed." },
      { title: "Data protection", body: "The partner follows security instructions, limits data access to what is strictly necessary and reports any incident or suspected incident." },
      { title: "Service quality", body: "The partner acts with competence, caution, punctuality, courtesy and compliance with professional standards, without making medical diagnoses outside authorized scope." },
      { title: "Termination", body: "Either party may terminate the partnership according to notice or immediately in case of serious breach, confidentiality violation, fraud or risk to clients." },
      { title: "Electronic signature", body: "The agreement is electronically signed on {{date_signature}}. Timestamp, IP address and signature hash are retained." },
    ] },
  },
  {
    key: "conditions-ia",
    slug: "conditions-utilisation-ia",
    type: "ai_usage_terms",
    fr: { title: "Conditions d'Utilisation de l'IA", intro: "Ces conditions encadrent les fonctions d'intelligence artificielle utilisees par NutVitaGlobalis.", sections: [
      { title: "Aide a l'interpretation", body: "L'IA fournit une aide a l'interpretation des donnees, a la redaction de commentaires et a la detection de tendances a partir des informations disponibles." },
      { title: "Pas de remplacement professionnel", body: "L'IA ne remplace pas un professionnel de sante, un dieteticien, un medecin, un pediatre ou un service d'urgence." },
      { title: "Limites des recommandations", body: "Les recommandations peuvent etre incompletes, sensibles a la qualite des donnees et doivent etre verifiees avant toute decision importante." },
      { title: "Responsabilite de l'utilisateur", body: "L'utilisateur reste responsable de ses decisions, doit verifier les informations et consulter un professionnel en cas de doute ou de symptome." },
    ] },
    en: { title: "AI Usage Terms", intro: "These terms govern artificial intelligence features used by NutVitaGlobalis.", sections: [
      { title: "Interpretation aid", body: "AI provides assistance in interpreting data, drafting comments and detecting trends based on available information." },
      { title: "No professional replacement", body: "AI does not replace a healthcare professional, dietitian, physician, pediatrician or emergency service." },
      { title: "Recommendation limits", body: "Recommendations may be incomplete, sensitive to data quality and must be reviewed before any important decision." },
      { title: "User responsibility", body: "Users remain responsible for decisions, must verify information and consult a professional in case of doubt or symptoms." },
    ] },
  },
  {
    key: "limitation-responsabilite",
    slug: "limitation-responsabilite",
    type: "liability_disclaimer",
    fr: { title: "Declaration de Limitation de Responsabilite", intro: disclaimerFr, sections: [
      { title: "Information educative", body: disclaimerFr },
      { title: "Urgences", body: "En cas de douleur, malaise, symptome grave, suspicion de complication ou urgence, l'utilisateur doit contacter immediatement un service d'urgence ou un professionnel de sante." },
      { title: "Decision medicale", body: "Aucune information affichee ne doit conduire a commencer, interrompre ou modifier un traitement sans avis medical qualifie." },
    ] },
    en: { title: "Disclaimer and Limitation of Liability", intro: disclaimerEn, sections: [
      { title: "Educational information", body: disclaimerEn },
      { title: "Emergencies", body: "In case of pain, illness, serious symptom, suspected complication or emergency, the user must immediately contact emergency services or a healthcare professional." },
      { title: "Medical decision", body: "No displayed information should lead to starting, stopping or changing treatment without qualified medical advice." },
    ] },
  },
];

export const legalTemplateMap = Object.fromEntries(legalTemplates.map(doc => [doc.key, doc])) as Record<string, LegalTemplate>;

export const legalRoutes = {
  cgu: "cgu",
  cgv: "cgv",
  confidentialite: "confidentialite",
  remboursement: "remboursement",
  cookies: "cookies",
  "consentement-teleconsultation": "consentement-teleconsultation",
  "conditions-suivi-sante": "conditions-suivi-sante",
  "conditions-croissance-enfant": "conditions-croissance-enfant",
  "conditions-recrutement-dieteticiens": "conditions-recrutement-dieteticiens",
  "contrat-partenariat-dieteticien": "contrat-partenariat-dieteticien",
  "conditions-utilisation-ia": "conditions-ia",
  "limitation-responsabilite": "limitation-responsabilite",
} as const;

export function sectionsToText(sections: LegalSection[]) {
  return sections.map(section => `${section.title}\n${section.body}`).join("\n\n");
}

export function textToSections(value: string): LegalSection[] {
  return value.split(/\n{2,}/).map(block => {
    const [title = "", ...body] = block.split("\n");
    return { title: title.trim(), body: body.join("\n").trim() };
  }).filter(section => section.title && section.body);
}
