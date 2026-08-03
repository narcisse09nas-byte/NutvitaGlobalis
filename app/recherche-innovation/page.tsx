import Image from "next/image";
import Link from "next/link";
import ManagedPageHero from "@/components/ManagedPageHero";
import ManagedPageSections from "@/components/ManagedPageSections";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getHomepageCommunity, getTestimonials } from "@/lib/public-content";
import { getSitePage } from "@/lib/site-pages";

export const metadata = { title: "Recherche scientifique, innovation et conseil stratégique" };
export default async function ResearchInnovationPage() {
  const [page, locale, community, testimonials] = await Promise.all([getSitePage("recherche-innovation"), getCurrentLocale(), getHomepageCommunity(), getTestimonials()]);
  if (!page) return null;
  const english = locale === "en";
  return <main><ManagedPageHero initial={page}/><ManagedPageSections initial={page}/>{community.gallery.length > 0 && <section className="section bg-mint"><div className="container-site"><p className="eyebrow">{english ? "In the field" : "Sur le terrain"}</p><h2 className="text-4xl font-black">{english ? "Projects and expertise in action" : "Nos projets et expertises en action"}</h2><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{community.gallery.slice(0,6).map((item:any)=><figure key={item.id} className="card overflow-hidden"><div className="relative h-56"><Image src={item.image_url} alt={english ? item.title_en || item.title : item.title} fill className="object-cover"/></div><figcaption className="p-5 font-bold">{english ? item.title_en || item.title : item.title}</figcaption></figure>)}</div></div></section>}{(testimonials?.length||0)>0&&<section className="section"><div className="container-site"><p className="eyebrow">{english?"Testimonials":"Témoignages"}</p><div className="mt-7 grid gap-5 md:grid-cols-3">{testimonials!.slice(0,3).map((item:any)=><blockquote key={item.id||item.name} className="card p-7"><p className="leading-7">“{item.testimony}”</p><footer className="mt-5 font-black text-forest">{item.name}</footer></blockquote>)}</div></div></section>}<section className="section bg-forest text-white"><div className="container-site text-center"><h2 className="text-4xl font-black text-white">{english ? "Have a study, programme or innovation project?" : "Vous avez une étude, un programme ou un projet d'innovation ?"}</h2><p className="mx-auto mt-4 max-w-2xl text-white/75">{english ? "Tell us about your context and expected impact." : "Présentez-nous votre contexte et l'impact recherché."}</p><Link href="/contact" className="btn-primary mt-7">{english ? "Contact our experts" : "Contacter nos experts"}</Link></div></section></main>;
}
