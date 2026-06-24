import Link from "next/link";
import { AcademicCapIcon, ArrowRightIcon, BuildingOffice2Icon, ChartBarSquareIcon, ClipboardDocumentListIcon, HeartIcon, VideoCameraIcon } from "@heroicons/react/24/outline";

const available = [
  { title: "Suivi sante", text: "Suivi autonome ou premium des indicateurs de sante, tendances, analyses et rapports.", href: "/suivi-sante", icon: HeartIcon, tone: "bg-emerald-50 text-emerald-700" },
  { title: "Suivi croissance enfant", text: "Courbes, mesures, analyses et accompagnement de la croissance de l'enfant.", href: "/connexion", icon: ChartBarSquareIcon, tone: "bg-sky-50 text-sky-700" },
  { title: "Formations certifiantes", text: "Parcours de formation, ressources pedagogiques et accompagnement des apprenants.", href: "/formations", icon: AcademicCapIcon, tone: "bg-violet-50 text-violet-700" },
  { title: "Teleconseils et packs", text: "Accompagnement nutritionnel, consultations video et programmes personnalises.", href: "/teleconseils", icon: VideoCameraIcon, tone: "bg-orange/10 text-orange" },
  { title: "Gestion des FOSA", text: "Admissions nutritionnelles, suivi des enfants, stock, supervision et rapports par formation sanitaire.", href: "/fosa", icon: BuildingOffice2Icon, tone: "bg-teal-50 text-teal-700" },
] as const;

const upcoming = [
  { title: "Enquetes de securite alimentaire et nutrition", text: "Planification, collecte des donnees, controle qualite, analyse et restitution." },
  { title: "Gestion des projets", text: "Planification, activites, equipes, indicateurs, budgets, risques et rapports." },
] as const;

export const metadata = { title: "Nos services" };

export default function ServicesPage() {
  return <main>
    <section className="bg-forest py-16 text-white"><div className="container-site"><p className="text-sm font-black uppercase tracking-widest text-orange">NutVitaGlobalis</p><h1 className="mt-4 text-5xl font-black text-white">Nos services</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-white/70">Un point d'entree clair vers les services de sante, de formation et de gestion de donnees proposes par la plateforme.</p></div></section>
    <section className="section"><div className="container-site"><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{available.map(({ title, text, href, icon: Icon, tone }) => <article key={title} className="card flex flex-col p-7"><span className={`grid h-12 w-12 place-items-center rounded-lg ${tone}`}><Icon className="h-6" /></span><h2 className="mt-5 text-2xl font-black">{title}</h2><p className="mt-3 flex-1 leading-7 text-slate-500">{text}</p><Link href={href} className="btn-secondary mt-6 justify-between">Decouvrir<ArrowRightIcon className="ml-3 h-5" /></Link></article>)}</div><div className="mt-16 border-t pt-10"><h2 className="text-3xl font-black">Services en preparation</h2><div className="mt-6 grid gap-4 md:grid-cols-2">{upcoming.map(item => <article key={item.title} className="rounded-lg border border-dashed bg-slate-50 p-6"><ClipboardDocumentListIcon className="h-7 text-slate-400" /><p className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400">Bientot disponible</p><h3 className="mt-2 text-xl font-black">{item.title}</h3><p className="mt-2 leading-7 text-slate-500">{item.text}</p></article>)}</div></div></div></section>
  </main>;
}
