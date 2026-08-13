import AboutExperience from "@/components/AboutExperience";
import { getSitePage } from "@/lib/site-pages";
import { getCurrentLocale } from "@/lib/i18n-server";
export const metadata = { title: "À propos | NutVitaGlobalis" };
export default async function About() { const [page,locale] = await Promise.all([getSitePage("a-propos"),getCurrentLocale()]); return page ? <AboutExperience page={page} en={locale==="en"}/> : null; }
