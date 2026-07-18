import ManagedPageHero from "@/components/ManagedPageHero";
import ManagedPageSections from "@/components/ManagedPageSections";
import { getSitePage } from "@/lib/site-pages";
import { getCurrentLocale } from "@/lib/i18n-server";

export const metadata = { title: "Recrutement des dieteticiens-nutritionnistes" };

export default async function Recruitment() {
  const [page, locale] = await Promise.all([getSitePage("recrutement"), getCurrentLocale()]);
  const english = locale === "en";
  return page ? (
    <>
      <ManagedPageHero initial={page} />
      <section className="mx-auto my-8 max-w-6xl rounded-2xl border border-orange/30 bg-mint p-6 text-forest">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-leaf">{english ? "Temporary information" : "Information temporaire"}</p>
        <h2 className="mt-2 text-2xl font-black">{english ? "Volunteer-based process" : "Processus base sur le volontariat"}</h2>
        <p className="mt-3 max-w-4xl leading-7">
          {english ? "During NutVitaGlobalis' current legal structuring phase, applications, tests, interviews and initial collaborations are managed on a voluntary basis. Final contractual and financial terms will be communicated before any formal commitment." : "Pendant la phase actuelle de structuration juridique de NutVitaGlobalis, les candidatures, tests, entretiens et collaborations initiales sont geres sur une base volontaire. Les conditions contractuelles et financieres definitives seront communiquees avant tout engagement formel."}
        </p>
      </section>
      <ManagedPageSections initial={page} />
    </>
  ) : null;
}
