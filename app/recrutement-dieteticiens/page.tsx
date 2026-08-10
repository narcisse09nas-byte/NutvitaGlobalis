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
      <ManagedPageSections initial={page} />
    </>
  ) : null;
}
