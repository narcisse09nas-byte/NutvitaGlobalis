import ManagedPageHero from "@/components/ManagedPageHero";
import ManagedPageSections from "@/components/ManagedPageSections";
import { getSitePage } from "@/lib/site-pages";

export const metadata = { title: "Recrutement des dieteticiens-nutritionnistes" };

export default async function Recruitment() {
  const page = await getSitePage("recrutement");
  return page ? (
    <>
      <ManagedPageHero initial={page} />
      <section className="mx-auto my-8 max-w-6xl rounded-2xl border border-orange/30 bg-mint p-6 text-forest">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-leaf">Information temporaire</p>
        <h2 className="mt-2 text-2xl font-black">Processus base sur le volontariat</h2>
        <p className="mt-3 max-w-4xl leading-7">
          Pendant la phase actuelle de structuration juridique de NutVitaGlobalis, les candidatures, tests, entretiens et collaborations initiales sont geres sur une base volontaire. Les conditions contractuelles et financieres definitives seront communiquees avant tout engagement formel.
        </p>
      </section>
      <ManagedPageSections initial={page} />
    </>
  ) : null;
}
