import ManagedPageHero from "@/components/ManagedPageHero";
import ManagedPageSections from "@/components/ManagedPageSections";
import { getSitePage } from "@/lib/site-pages";
export const metadata = { title: "Recrutement des diététiciens-nutritionnistes" };
export default async function Recruitment() { const page = await getSitePage("recrutement"); return page ? <><ManagedPageHero initial={page}/><ManagedPageSections initial={page}/></> : null; }
