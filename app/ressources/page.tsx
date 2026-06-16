import ManagedPageHero from "@/components/ManagedPageHero";
import ManagedPageSections from "@/components/ManagedPageSections";
import ResourcesTabs from "@/components/ResourcesTabs";
import { getArticles, getPremiumResources } from "@/lib/public-content";
import { getSitePage } from "@/lib/site-pages";
export const metadata={title:"Ressources"}; export const revalidate=60;
export default async function Ressources(){const [articles,premium,page]=await Promise.all([getArticles(),getPremiumResources(),getSitePage("ressources")]);return <>{page&&<><ManagedPageHero initial={page}/><ManagedPageSections initial={page}/></>}<section className="section"><div className="container-site"><ResourcesTabs articles={articles} premiumResources={premium}/></div></section></>}
