import Link from "next/link";
import { ArrowRightIcon, CheckIcon } from "@heroicons/react/24/outline";
import ManagedPageHero from "@/components/ManagedPageHero";
import MedicalDisclaimer from "@/components/MedicalDisclaimer";
import { getTeleconseils } from "@/lib/public-content";
import { getSitePage } from "@/lib/site-pages";

const fallback = [
  { id: "perte-poids", name: "Perte de poids", description: "Un plan realiste pour retrouver votre equilibre.", duration: "45 minutes", price: 15000 },
  { id: "diabete", name: "Diabete", description: "Adaptez votre alimentation a votre traitement.", duration: "45 minutes", price: 15000 },
  { id: "femme-enceinte", name: "Femme enceinte", description: "Un accompagnement a chaque trimestre.", duration: "45 minutes", price: 15000 },
  { id: "nutrition-infantile", name: "Nutrition infantile", description: "Des reperes personnalises pour votre enfant.", duration: "45 minutes", price: 15000 },
];

const benefits = [
  "Bilan nutritionnel personnalise",
  "Plan d'action individualise",
  "Suivi personnalise",
  "Chat securise avec votre expert",
  "Teleconsultations video",
  "Tableau de bord de suivi",
  "Rapports et recommandations",
];

const differentiators = [
  "Analyse intelligente de vos donnees de sante",
  "Visualisation automatique de votre progression",
  "Accompagnement par des specialistes qualifies",
  "Acces en francais et en anglais",
  "Suivi depuis ordinateur ou smartphone",
];

export const metadata = { title: "Teleconseils nutritionnels" };
export const revalidate = 60;

export default async function Teleconseils() {
  const [loaded, page] = await Promise.all([getTeleconseils(), getSitePage("teleconseils")]);
  const packs = loaded?.length ? loaded : fallback;

  return <>
    {page && <ManagedPageHero initial={page} />}
    <MedicalDisclaimer />
    <section className="section">
      <div className="container-site">
        <div className="mb-8 rounded-3xl bg-mint p-7">
          <p className="text-xs font-bold uppercase tracking-widest text-leaf">Ce qui differencie NutVitaGlobalis</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            {differentiators.map(item => <div key={item} className="rounded-2xl bg-white p-4 text-sm font-bold text-forest">{item}</div>)}
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {packs.map((p: any) => {
            const checkoutId = p.id || p.slug || encodeURIComponent(String(p.name).toLowerCase().replace(/\s+/g, "-"));
            return <article key={p.id || p.name} className="flex min-h-full flex-col rounded-2xl bg-forest p-7 text-white shadow-soft">
              <span className="mb-5 text-xs font-bold uppercase tracking-widest text-orange">Suivi de 3 mois</span>
              <h2 className="text-2xl font-black text-white">Pack {p.name}</h2>
              <p className="mt-4 flex-1 leading-7 text-white/70">{p.description}</p>
              <div className="my-6 grid gap-3 text-sm">
                {benefits.map(item => <span key={item} className="flex gap-2"><CheckIcon className="h-5 shrink-0 text-orange" />{item}</span>)}
              </div>
              <p className="mb-5 rounded-2xl bg-white/10 p-4 text-sm font-bold text-white">Acces gratuit temporaire pendant la mise en stand-by des paiements.</p>
              <Link href={`/inscription?redirect=${encodeURIComponent(`/checkout?type=consultation&id=${checkoutId}`)}`} className="btn-primary mt-auto">Creer mon compte <ArrowRightIcon className="ml-2 h-4" /></Link>
            </article>;
          })}
        </div>
      </div>
    </section>
  </>;
}
