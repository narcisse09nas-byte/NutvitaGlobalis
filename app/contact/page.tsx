import Link from "next/link";
import { ChatBubbleLeftRightIcon, EnvelopeIcon, MapPinIcon } from "@heroicons/react/24/outline";
import ContactForm from "@/components/ContactForm";
import ManagedPageHero from "@/components/ManagedPageHero";
import ManagedPageSections from "@/components/ManagedPageSections";
import { siteConfig, whatsappUrl } from "@/data/site";
import { getSitePage } from "@/lib/site-pages";
import { getCurrentLocale } from "@/lib/i18n-server";

export const metadata = { title: "Contact" };
type ContactItem = { Icon: typeof EnvelopeIcon; label: string; value: string; href?: string };

export default async function Contact() {
  const [page, locale] = await Promise.all([getSitePage("contact"), getCurrentLocale()]);
  const english = locale === "en";
  const items: ContactItem[] = [
    { Icon: EnvelopeIcon, label: "Email", value: siteConfig.email, href: `mailto:${siteConfig.email}` },
    { Icon: ChatBubbleLeftRightIcon, label: "WhatsApp", value: siteConfig.whatsappLabel, href: whatsappUrl() },
    { Icon: MapPinIcon, label: english ? "Address" : "Adresse", value: siteConfig.address },
  ];
  return <>{page && <><ManagedPageHero initial={page} /><ManagedPageSections initial={page} /></>}<section className="section"><div className="container-site grid gap-10 lg:grid-cols-[.8fr_1.2fr]"><div><h2 className="text-3xl font-black">{english ? "Contact details" : "Coordonnees"}</h2><div className="mt-8 grid gap-4">{items.map(({ Icon, label, value, href }) => {
    const content = <><span className="grid h-11 w-11 place-items-center rounded-xl bg-mint"><Icon className="h-5 text-leaf" /></span><div><p className="text-xs font-bold uppercase text-slate-400">{label}</p><p className="font-bold text-forest">{value}</p></div></>;
    return href ? <Link href={href} target={label === "WhatsApp" ? "_blank" : undefined} className="flex items-center gap-4 rounded-2xl bg-white p-5 transition hover:shadow-soft" key={label}>{content}</Link> : <div className="flex items-center gap-4 rounded-2xl bg-white p-5" key={label}>{content}</div>;
  })}</div><Link href={whatsappUrl()} target="_blank" className="btn-primary mt-6">{english ? "Write on WhatsApp" : "Ecrire sur WhatsApp"}</Link></div><ContactForm /></div></section></>;
}
