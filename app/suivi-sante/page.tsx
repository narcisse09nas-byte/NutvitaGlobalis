import Link from "next/link";
import { ChartBarIcon, DocumentTextIcon, SparklesIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import ManagedPageHero from "@/components/ManagedPageHero";
import MedicalDisclaimer from "@/components/MedicalDisclaimer";
import { formatXofAsUsd } from "@/lib/currency";
import { getSitePage } from "@/lib/site-pages";

export const metadata = { title: "Suivi Sante et Croissance Enfant" };

const features = [
  [ChartBarIcon, "Vos tendances", "Poids, IMC, glycemie, HbA1c, cholesterol, tension et apports alimentaires."],
  [SparklesIcon, "Analyse automatisee", "Commentaires accessibles, resume clinique et alertes a verifier."],
  [DocumentTextIcon, "Historique prive", "Vos mesures sont conservees dans votre espace securise."],
  [UserGroupIcon, "Croissance enfant", "Un suivi annuel distinct pour chaque enfant abonne."],
] as const;

export default async function HealthTracking() {
  const page = await getSitePage("suivi-sante");
  const price = formatXofAsUsd(10000);

  return <>
    {page && <ManagedPageHero initial={page} />}
    <MedicalDisclaimer />
    <section className="bg-forest py-10 text-white">
      <div className="container-site flex flex-wrap items-center justify-between gap-5">
        <p className="text-2xl font-black text-orange">{price} HT pour 12 mois</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/inscription" className="btn-primary bg-orange">Creer mon compte</Link>
          <Link href="/espace-client/abonnement" className="btn-secondary border-white text-white">Activer le suivi</Link>
        </div>
      </div>
    </section>
    <section className="section">
      <div className="container-site grid gap-6 md:grid-cols-2">
        {features.map(([Icon, title, description]) => <article key={title} className="card p-7">
          <Icon className="h-10 text-leaf" />
          <h2 className="mt-5 text-2xl font-black">{title}</h2>
          <p className="mt-3 text-slate-500">{description}</p>
        </article>)}
      </div>
    </section>
    <section className="section bg-mint">
      <div className="container-site grid gap-6 text-center md:grid-cols-2">
        <Offer title="Suivi Sante Autonome" text={`${price} HT, acces pendant 12 mois.`} href="/espace-client/abonnement" action="Souscrire" />
        <Offer title="Croissance Enfant" text={`${price} HT par enfant et par an.`} href="/espace-client/croissance-enfant" action="Ajouter un enfant" />
      </div>
    </section>
  </>;
}

function Offer({ title, text, href, action }: { title: string; text: string; href: string; action: string }) {
  return <article className="rounded-3xl bg-white p-8">
    <h2 className="text-3xl font-black">{title}</h2>
    <p className="mt-3">{text}</p>
    <Link href={href} className="btn-primary mt-6">{action}</Link>
  </article>;
}
