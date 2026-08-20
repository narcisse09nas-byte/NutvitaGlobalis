import Link from "next/link";
import CareersList from "@/components/careers/CareersList";
export const metadata = { title: "Carrières et offres d’emploi" };
export default function CareersPage() {
  return <div><section className="bg-forest py-16 text-white"><div className="container-site"><div className="flex flex-wrap items-start justify-between gap-6"><div><p className="text-sm font-black uppercase tracking-widest text-orange">Rejoignez NutVitaGlobalis</p><h1 className="mt-3 text-4xl font-black md:text-5xl">Carrières et offres d’emploi</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-white/70">Participez à une mission qui relie nutrition, santé, innovation et impact dans le monde.</p></div><Link href="#offres" className="rounded-xl border border-white/30 bg-white/10 px-6 py-3 font-black text-white transition hover:bg-white hover:text-forest">Voir les offres →</Link></div></div></section><section id="offres" className="container-site py-12"><CareersList /></section></div>;
}