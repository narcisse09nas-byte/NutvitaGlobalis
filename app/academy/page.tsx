import Link from "next/link";

export const metadata = { title: "NutVitaGlobalis Academy" };

export default function AcademyGatewayPage() {
  return <main className="min-h-screen bg-[#f6f1e7] px-5 py-20">
    <section className="mx-auto max-w-3xl rounded-[32px] border border-forest/10 bg-white p-8 shadow-xl sm:p-12">
      <p className="text-sm font-black uppercase tracking-[0.25em] text-orange">Mes formations</p>
      <h1 className="mt-4 text-4xl font-black text-forest">NutVitaGlobalis Academy</h1>
      <p className="mt-5 text-lg leading-8 text-slate-600">L'application Academy est bien importee dans ce depot. Pour l'ouvrir sous <b>/academy</b>, demarrez son serveur ou configurez <b>ACADEMY_ORIGIN</b> sur l'environnement d'hebergement.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/espace-client" className="btn-primary">Retour a mon espace</Link>
        <Link href="/formations" className="btn-secondary">Voir le catalogue</Link>
      </div>
    </section>
  </main>;
}
