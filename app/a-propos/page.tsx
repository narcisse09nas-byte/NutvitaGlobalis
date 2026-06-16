import ManagedPageHero from "@/components/ManagedPageHero";
import ManagedPageSections from "@/components/ManagedPageSections";
import { getSitePage } from "@/lib/site-pages";
export const metadata = { title: "À propos" };
export default async function About() { const page = await getSitePage("a-propos"); return page ? <><ManagedPageHero initial={page}/><ManagedPageSections initial={page}/></> : null; }
