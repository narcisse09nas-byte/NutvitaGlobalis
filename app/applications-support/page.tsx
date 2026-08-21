import Link from "next/link";
import { ArrowRight, BarChart3, CalendarDays, CheckCircle2, ClipboardList, Cloud, Headphones, HeartPulse, Network, ShieldCheck, Users, Zap, type LucideIcon } from "lucide-react";
import { getCurrentLocale } from "@/lib/i18n-server";
import { localizedPath } from "@/lib/i18n";
import { serviceEntryUrl } from "@/lib/service-entry";
import { getSitePage } from "@/lib/site-pages";
import type { ManagedSection } from "@/data/site-pages";

export const metadata={title:"Applications de support | NutVitaGlobalis"};

const valueIcons=[ShieldCheck,BarChart3,Zap,Users] as const;
const appDefinitions=[
 {key:"nutritrack",Icon:HeartPulse,badge:"PHARE",appHref:"/nutritrack",image:"/images/support-nutritrack-dashboard-v2.png",accent:"#f43f68",soft:"#fff0f4"},
 {key:"survey",Icon:ClipboardList,appHref:"/surveys",image:"/images/support-sansurvey-dashboard-v2.png",accent:"#2975bb",soft:"#edf5ff"},
 {key:"project_management",Icon:BarChart3,appHref:"/op-management",image:"/images/support-promanage-dashboard-v2.png",accent:"#18834d",soft:"#edf7ef"},
] as const;
const trustIcons=[ShieldCheck,Network,Cloud,Headphones] as const;

export default async function SupportApplicationsPage(){
 const [locale,page]=await Promise.all([getCurrentLocale(),getSitePage("applications-support")]);
 const english=locale==="en";
 const t=(fr:string,en:string)=>english?en:fr;
 const sections=page?.sections||[];
 const valueFallbacks:ManagedSection[]=[
  {title:t("Accès sécurisé","Secure access"),text:t("Authentification et droits vérifiés","Verified authentication and permissions")},
  {title:t("Données fiables","Reliable data"),text:t("Collecte rigoureuse et analyses validées","Rigorous collection and validated analysis")},
  {title:t("Décisions éclairées","Informed decisions"),text:t("Informations pertinentes au bon moment","Relevant information at the right time")},
  {title:t("Impact mesurable","Measurable impact"),text:t("Suivi continu et résultats tangibles","Continuous monitoring and tangible results")},
 ];
 const appFallbacks:ManagedSection[]=[
  {title:t("Prise en charge de la malnutrition aiguë (NutriTrack)","Acute malnutrition care (NutriTrack)"),text:t("Dépistage, admission, suivi clinique, gestion des stocks et reporting pour les structures autorisées.","Screening, admission, clinical monitoring, stock management and reporting for authorized facilities."),items:t(["Suivi des cas MAM & MAS","Gestion des admissions et sorties","Monitoring des stocks et consommables","Rapports standards et personnalisés"].join("|"),["MAM & SAM case monitoring","Admission and discharge management","Stock and supply monitoring","Standard and custom reports"].join("|")).split("|")},
  {title:t("Support aux enquêtes de sécurité alimentaire et nutrition","Food security and nutrition survey support"),text:t("Concevez les questionnaires, collectez les données et produisez des analyses fiables pour la décision.","Design questionnaires, collect data and produce reliable decision-ready analyses."),items:t(["Conception de questionnaires (ODK/Kobo)","Collecte mobile et hors ligne","Nettoyage et validation des données","Analyses statistiques et tableaux de bord"].join("|"),["Questionnaire design (ODK/Kobo)","Mobile and offline collection","Data cleaning and validation","Statistical analysis and dashboards"].join("|")).split("|")},
  {title:t("Gestion des projets, programmes et portefeuilles","Project, programme and portfolio management"),text:t("Planifiez les activités, ressources, résultats, risques et performances dans un espace structuré.","Plan activities, resources, results, risks and performance in one structured workspace."),items:t(["Planification et suivi des activités","Gestion budgétaire et ressources","Suivi des indicateurs et résultats","Tableaux de bord et rapports"].join("|"),["Activity planning and monitoring","Budget and resource management","Indicator and results monitoring","Dashboards and reports"].join("|")).split("|")},
 ];
 const trustFallbacks:ManagedSection[]=[
  {title:t("Sécurité et conformité","Security and compliance"),text:t("Données protégées, normes internationales respectées.","Protected data and respected international standards.")},
  {title:t("Interopérabilité","Interoperability"),text:t("Intégration fluide avec vos outils et systèmes existants.","Seamless integration with your existing tools and systems.")},
  {title:t("Disponible partout","Available everywhere"),text:t("Accédez à vos données en ligne ou hors ligne, sur tous vos appareils.","Access your data online or offline, on every device.")},
  {title:t("Support réactif","Responsive support"),text:t("Assistance technique et accompagnement personnalisé.","Technical assistance and personalized support.")},
 ];
 const values=valueFallbacks.map((fallback,index)=>sections[index]||fallback);
 const apps=appFallbacks.map((fallback,index)=>sections[index+4]||fallback);
 const trusts=trustFallbacks.map((fallback,index)=>sections[index+7]||fallback);
 const title=page?.title||t("Des applications de support\nconçues pour l’action","Support applications\nbuilt for action");
 const [titleLead,...titleAccentParts]=title.split("\n");
 const titleAccent=titleAccentParts.join(" ");
 const heroImage=(page as any)?.hero_image_url||"/images/support-applications-devices-v1.png";
 const primaryLabel=page?.cta_label||t("Voir toutes les applications","View all applications");
 const primaryUrl=page?.cta_url||"#applications";
 const secondaryLabel=(page as any)?.secondary_cta_label||t("Demander une démo","Request a demo");
 const secondaryUrl=(page as any)?.secondary_cta_url||"/contact";
 return <main className="overflow-hidden bg-[#fbfcfa] text-forest">
  <section className="relative isolate border-b bg-gradient-to-br from-white via-[#fbfdfb] to-[#eef8f2] py-16 lg:py-20"><div className="absolute -right-20 top-0 h-96 w-96 rounded-full bg-mint/60 blur-3xl"/><div className="container-site relative grid items-center gap-10 lg:grid-cols-[1fr_1.08fr]"><div><span className="inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[.16em] text-leaf shadow-soft"><span className="mr-2 h-2 w-2 rounded-full bg-leaf"/>{page?.eyebrow||t("Solutions professionnelles","Professional solutions")}</span><h1 className="mt-6 text-5xl font-black leading-[1.03] md:text-7xl">{titleLead}{titleAccent&&<><br/><span className="text-[#4ca36b]">{titleAccent}</span></>}</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">{page?.description||t("Découvrez uniquement les applications opérationnelles NutVitaGlobalis. Vos droits sont vérifiés à l’ouverture de la solution.","Explore NutVitaGlobalis operational applications. Your permissions are verified when a solution opens.")}</p><div className="mt-9 grid gap-5 sm:grid-cols-2">{values.map((item,index)=>{const Icon=valueIcons[index];return <div key={item.title} className="grid grid-cols-[52px_1fr] gap-4 border-slate-200 sm:border-r sm:pr-5"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e7f4e9] text-leaf"><Icon className="h-6"/></span><div><h2 className="font-black">{item.title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p></div></div>})}</div><div className="mt-9 flex flex-wrap gap-4"><Link href={primaryUrl} className="btn-primary min-w-56">{primaryLabel}<ArrowRight className="ml-2 h-4"/></Link><Link href={secondaryUrl} className="btn-secondary min-w-52">{secondaryLabel}<CalendarDays className="ml-2 h-4"/></Link></div></div><div className="relative min-h-[420px]"><div className="absolute inset-0 bg-[radial-gradient(circle,#bfe4c8_1.5px,transparent_1.5px)] [background-size:18px_18px] opacity-45 [mask-image:linear-gradient(to_left,black,transparent)]"/><img src={heroImage} alt={t("Applications NutVitaGlobalis sur ordinateur, tablette et téléphone","NutVitaGlobalis applications on laptop, tablet and phone")} className="relative z-10 h-full min-h-[420px] w-full object-contain"/></div></div></section>

  <section id="applications" className="section scroll-mt-24"><div className="container-site grid items-stretch gap-6 lg:grid-cols-3">{appDefinitions.map((definition,index)=>{const item=apps[index],Icon=definition.Icon,detailHref=localizedPath(locale,definition.key==="nutritrack"?"/applications-support/nutritrack":definition.key==="survey"?"/applications-support/sansurvey":"/applications-support/promanage");return <article key={definition.key} className="support-app-card group flex min-h-[590px] flex-col overflow-hidden rounded-[1.25rem] border bg-white p-7 shadow-soft transition hover:-translate-y-1 hover:shadow-xl md:rounded-[2rem] md:p-8" style={{"--card-accent":definition.accent,"--card-soft":definition.soft} as React.CSSProperties}><div className="flex items-start gap-5"><span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--card-soft)] text-[var(--card-accent)] md:h-16 md:w-16"><Icon className="h-8"/></span><div className="flex-1"><div className="flex items-start justify-between gap-3"><h2 className="text-2xl font-black leading-7">{item.title}</h2>{"badge" in definition&&<span className="rounded-full bg-orange/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-orange">{definition.badge}</span>}</div></div></div><div className="relative -mr-16 -mt-3 ml-auto h-32 w-[58%] overflow-hidden rounded-xl md:mr-0 md:mt-5 md:h-44 md:w-full"><img src={definition.image} alt="" className="h-full w-full object-cover"/></div><p className="mt-5 text-sm leading-7 text-slate-600">{item.text}</p><ul className="mt-6 grid gap-3 text-sm">{(item.items||[]).map(feature=><li key={feature} className="flex gap-3"><CheckCircle2 className="h-5 shrink-0 text-leaf"/><span>{feature}</span></li>)}</ul><div className="mt-auto grid gap-3 pt-6"><Link href={definition.appHref} className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--card-accent)] px-6 font-black text-white shadow-lg transition group-hover:brightness-95">{t("Accéder à l’application","Access the application")}<ArrowRight className="ml-3 h-4 transition group-hover:translate-x-1"/></Link><Link href={detailHref} className="inline-flex min-h-12 items-center justify-center rounded-full border border-forest/15 px-6 font-black text-forest transition hover:bg-mint">{t("Découvrir le service","Discover the service")}<ArrowRight className="ml-3 h-4 transition group-hover:translate-x-1"/></Link></div></article>})}</div></section>

  <section className="pb-16"><div className="container-site"><div className="grid gap-6 rounded-[2rem] border bg-gradient-to-r from-[#f2f8f4] to-white p-7 shadow-soft lg:grid-cols-[1.1fr_repeat(4,1fr)] lg:p-10"><div><h2 className="text-2xl font-black">{t("Pourquoi choisir les applications NutVitaGlobalis ?","Why choose NutVitaGlobalis applications?")}</h2><div className="mt-4 h-1 w-12 rounded-full bg-leaf"/></div>{trusts.map((item,index)=>{const Icon=trustIcons[index];return <div key={item.title} className="flex gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#dff1e3] text-leaf"><Icon className="h-6"/></span><div><h3 className="font-black">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p></div></div>})}</div></div></section>
 </main>;
}

