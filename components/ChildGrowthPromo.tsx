import Link from "next/link";
import { ChartBarIcon, CheckBadgeIcon, UserGroupIcon } from "@heroicons/react/24/outline";

export default function ChildGrowthPromo() {
  return <section className="section bg-mint/50"><div className="container-site grid items-center gap-8 rounded-[2rem] bg-white p-8 shadow-soft lg:grid-cols-2 lg:p-14"><div><span className="eyebrow"><UserGroupIcon className="mr-2 h-4"/>Nouveau service</span><h2 className="text-4xl font-black">Suivi Promotion Croissance Enfant</h2><p className="mt-4 leading-7 text-slate-600">Suivez les indicateurs de chaque enfant avec courbes et conseils.</p><p className="mt-5 text-2xl font-black text-forest">Acces gratuit temporaire</p><Link href="/espace-client/croissance-enfant" className="btn-primary mt-6">Ajouter un enfant</Link></div><div className="grid gap-3">{[[ChartBarIcon, "Courbes de croissance"], [CheckBadgeIcon, "Analyses et conseils prudents"], [UserGroupIcon, "Un suivi par enfant"]].map(([Icon, label]) => <div key={String(label)} className="flex items-center gap-3 rounded-2xl bg-mint p-5 font-bold text-forest"><Icon className="h-6 text-leaf"/>{String(label)}</div>)}</div></div></section>;
}
