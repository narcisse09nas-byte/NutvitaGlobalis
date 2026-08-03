import Link from "next/link";
import { ArrowRightIcon, ChartBarSquareIcon, ClipboardDocumentListIcon, HeartIcon } from "@heroicons/react/24/outline";
import MedicalDisclaimer from "@/components/MedicalDisclaimer";
import { getCurrentLocale } from "@/lib/i18n-server";
import { localizedPath } from "@/lib/i18n";
import { serviceEntryUrl } from "@/lib/service-entry";

const applications = [
  { key: "nutritrack", Icon: HeartIcon, fr: ["Prise en charge de la malnutrition aiguë (NutriTrack)", "Dépistage, admission, suivi clinique, gestion des stocks et reporting pour les structures autorisées."], en: ["Acute malnutrition care (NutriTrack)", "Screening, admission, clinical follow-up, stock management and reporting for authorized organizations."] },
  { key: "survey", Icon: ClipboardDocumentListIcon, fr: ["Support aux enquêtes de sécurité alimentaire et nutrition", "Concevez les questionnaires, collectez les données et produisez des analyses fiables pour la décision."], en: ["Food security and nutrition survey support", "Design questionnaires, collect data and produce reliable decision-ready analyses."] },
  { key: "project_management", Icon: ChartBarSquareIcon, fr: ["Gestion des projets, programmes et portefeuilles", "Planifiez les activités, ressources, résultats, risques et performances dans un espace structuré."], en: ["Project, programme and portfolio management", "Plan activities, resources, results, risks and performance in one structured workspace."] },
] as const;

export const metadata = { title: "Applications de support" };
export default async function SupportApplicationsPage() {
  const locale = await getCurrentLocale(), english = locale === "en";
  return <main><section className="section bg-mint"><div className="container-site max-w-4xl"><p className="eyebrow">{english ? "Professional solutions" : "Solutions professionnelles"}</p><h1 className="text-4xl font-black md:text-6xl">{english ? "Support applications built for action" : "Des applications de support conçues pour l'action"}</h1><p className="mt-5 text-lg leading-8 text-slate-600">{english ? "Explore only NutVitaGlobalis operational applications. Your access is checked when you open a solution." : "Découvrez uniquement les applications opérationnelles NutVitaGlobalis. Vos droits sont vérifiés à l'ouverture de la solution."}</p></div></section><MedicalDisclaimer/><section className="section"><div className="container-site grid gap-7 lg:grid-cols-3">{applications.map(app => { const [title, description] = english ? app.en : app.fr; return <article key={app.key} className="card flex flex-col p-8"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-mint"><app.Icon className="h-7 text-leaf"/></span><h2 className="mt-6 text-2xl font-black">{title}</h2><p className="mt-4 flex-1 leading-7 text-slate-600">{description}</p><Link className="btn-primary mt-7" href={localizedPath(locale, serviceEntryUrl(app.key))}>{english ? "Access the application" : "Accéder à l'application"}<ArrowRightIcon className="ml-2 h-4"/></Link></article>})}</div></section></main>;
}
