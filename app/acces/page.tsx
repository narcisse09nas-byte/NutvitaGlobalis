import Link from "next/link";
import { ArrowRightIcon, BriefcaseIcon, BuildingOffice2Icon, ShieldCheckIcon, UserCircleIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import ManagedPageHero from "@/components/ManagedPageHero";
import { getSitePage } from "@/lib/site-pages";

const spaces = [
  { title: "Espace client", text: "Accedez a vos formations, consultations, factures, abonnements et donnees de suivi sante.", href: "/connexion", action: "Connexion client", icon: UserCircleIcon, tone: "bg-mint text-leaf" },
  { title: "Espace candidat", text: "Creez ou suivez votre candidature, completez votre dossier et consultez vos convocations.", href: "/candidat", action: "Connexion candidat", icon: UserPlusIcon, tone: "bg-sky-50 text-sky-700" },
  { title: "Dieteticien/nutritionniste partenaire", text: "Retrouvez votre activite clinique, vos clients, paiements, messages et appels.", href: "/partenaire/connexion", action: "Portail partenaire", icon: BriefcaseIcon, tone: "bg-orange/10 text-orange" },
  { title: "Administration", text: "Acces reserve aux administrateurs autorises de NutVitaGlobalis.", href: "/admin", action: "Connexion administrateur", icon: ShieldCheckIcon, tone: "bg-forest text-white" },
  { title: "Service FOSA", text: "Gerez les formations sanitaires, les equipes, les admissions nutritionnelles et les rapports.", href: "/fosa", action: "Acceder au service FOSA", icon: BuildingOffice2Icon, tone: "bg-teal-50 text-teal-700" },
] as const;

export const metadata = { title: "Se connecter" };

export default async function AccessPage() {
  const page = await getSitePage("acces");
  return <>{page && <ManagedPageHero initial={page} />}<section className="section"><div className="container-site grid gap-6 md:grid-cols-2">{spaces.map(({ title, text, href, action, icon: Icon, tone }) => <article key={title} className="card flex flex-col p-7 sm:p-9"><span className={`grid h-14 w-14 place-items-center rounded-2xl ${tone}`}><Icon className="h-7" /></span><h2 className="mt-6 text-2xl font-black">{title}</h2><p className="mt-3 flex-1 leading-7 text-slate-500">{text}</p><Link href={href} className="btn-secondary mt-7 justify-between">{action}<ArrowRightIcon className="ml-3 h-5" /></Link></article>)}</div></section></>;
}
