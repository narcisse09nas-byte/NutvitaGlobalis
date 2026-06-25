import Link from "next/link";
import { AcademicCapIcon, ArrowRightIcon, BuildingOffice2Icon, ChartBarSquareIcon, ClipboardDocumentListIcon, CommandLineIcon, HeartIcon, PresentationChartLineIcon, RectangleGroupIcon, VideoCameraIcon } from "@heroicons/react/24/outline";

const available = [
  { title: "Suivi sante", text: "Suivi autonome ou premium des indicateurs de sante, tendances, analyses et rapports.", href: "/suivi-sante", icon: HeartIcon, tone: "bg-emerald-50 text-emerald-700" },
  { title: "Suivi croissance enfant", text: "Courbes, mesures, analyses et accompagnement de la croissance de l'enfant.", href: "/connexion", icon: ChartBarSquareIcon, tone: "bg-sky-50 text-sky-700" },
  { title: "Formations certifiantes", text: "Parcours de formation, ressources pedagogiques et accompagnement des apprenants.", href: "/formations", icon: AcademicCapIcon, tone: "bg-violet-50 text-violet-700" },
  { title: "Teleconseils et packs", text: "Accompagnement nutritionnel, consultations video et programmes personnalises.", href: "/teleconseils", icon: VideoCameraIcon, tone: "bg-orange/10 text-orange" },
  { title: "NutriTrack", text: "Application de support a la prise en charge integree de la malnutrition aigue.", href: "/acces-nutritrack", icon: BuildingOffice2Icon, tone: "bg-cyan-50 text-cyan-700" },
  { title: "Support Food Security and Nutrition Survey", text: "Planification, echantillonnage, collecte, controle qualite et analyse des enquetes de securite alimentaire et nutrition.", href: "/surveys", icon: ClipboardDocumentListIcon, tone: "bg-lime-50 text-lime-800" },
  { title: "OP Management", text: "Gestion des projets, financements, planification, execution, indicateurs et reporting.", href: "/op-management", icon: PresentationChartLineIcon, tone: "bg-blue-50 text-blue-700" },
  { title: "Manager", text: "Console de direction pour superviser les equipes, operations, ressources et performances.", href: "/manager", icon: RectangleGroupIcon, tone: "bg-rose-50 text-rose-700" },
  { title: "Maximus", text: "Cockpit interne de pilotage du cabinet, reserve aux super administrateurs NutVitaGlobalis.", href: "/maximus", icon: CommandLineIcon, tone: "bg-slate-900 text-white" },
] as const;

export const metadata = { title: "Nos services" };

export default function ServicesPage() {
  return <main>
    <section className="bg-forest py-16 text-white"><div className="container-site"><p className="text-sm font-black uppercase tracking-widest text-orange">NutVitaGlobalis</p><h1 className="mt-4 text-5xl font-black text-white">Nos services</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-white/70">Un point d'entree clair vers les services de sante, de formation et de gestion de donnees proposes par la plateforme.</p></div></section>
    <section className="section"><div className="container-site"><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{available.map(({ title, text, href, icon: Icon, tone }) => <article key={title} className="card flex flex-col p-7"><span className={`grid h-12 w-12 place-items-center rounded-lg ${tone}`}><Icon className="h-6" /></span><h2 className="mt-5 text-2xl font-black">{title}</h2><p className="mt-3 flex-1 leading-7 text-slate-500">{text}</p><Link href={href} className="btn-secondary mt-6 justify-between">Acceder<ArrowRightIcon className="ml-3 h-5" /></Link></article>)}</div></div></section>
  </main>;
}
