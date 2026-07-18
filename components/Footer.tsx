"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import WhatsAppContact from "@/components/WhatsAppContact";
import { siteConfig } from "@/data/site";
import { localizedPath, normalizeLocale, stripLocale, ui } from "@/lib/i18n";

export default function Footer({ settings = {} }: { settings?: Record<string, unknown> }) {
  const pathname = usePathname();
  const locale = normalizeLocale(stripLocale(pathname).locale);
  const t = ui[locale].footer;
  const number = String(settings.whatsapp_number || siteConfig.whatsappNumber || "").replace(/\D/g, "");
  const whatsappLabel = String(settings.whatsapp_label || siteConfig.whatsappLabel);
  const facebookUrl = String(settings.facebook_url || "");
  const linkedinUrl = String(settings.linkedin_url || "");

  return (
    <footer className="bg-forest text-white">
      <div className="container-site grid gap-10 py-14 md:grid-cols-4">
        <div>
          <div className="mb-4 w-fit rounded-md bg-white px-3 py-2">
            <Image src="/brand/nutvita-logo-full.png" alt="NutVita Globalis" width={220} height={96} className="h-16 w-auto object-contain" />
          </div>
          <p className="text-sm leading-7 text-white/65">{t.promise}</p>
          <div className="mt-5"><LanguageSwitcher compact /></div>
        </div>
        <div>
          <h3 className="mb-4 font-bold text-white">{t.explore}</h3>
          <div className="grid gap-3 text-sm text-white/65">
            <Link href={localizedPath(locale, "/formations")}>{ui[locale].nav.courses}</Link>
            <Link href={localizedPath(locale, "/teleconseils")}>{ui[locale].nav.counselling}</Link>
            <Link href={localizedPath(locale, "/ressources")}>{ui[locale].nav.resources}</Link>
            <Link href={localizedPath(locale, "/recrutement-dieteticiens")}>{ui[locale].nav.recruitment}</Link>
          </div>
        </div>
        <div>
          <h3 className="mb-4 font-bold text-white">{t.access}</h3>
          <div className="grid gap-3 text-sm text-white/65">
            <Link href={localizedPath(locale, "/connexion")}>{t.chooseSpace}</Link>
            <Link href="/connexion">{t.clientArea}</Link>
            <Link href="/candidat">{t.candidate}</Link>
            <Link href="/admin">{t.admin}</Link>
          </div>
        </div>
        <div>
          <h3 className="mb-4 font-bold text-white"><WhatsAppContact number={number} label="Contact" /></h3>
          <div className="grid gap-3 text-sm text-white/65">
            <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>
            <WhatsAppContact number={number} label={whatsappLabel} />
            {facebookUrl && <a href={facebookUrl} target="_blank" rel="noopener noreferrer">Facebook</a>}
            {linkedinUrl && <a href={linkedinUrl} target="_blank" rel="noopener noreferrer">LinkedIn</a>}
            <span>{siteConfig.address}</span>
            <Link href={localizedPath(locale, "/confidentialite")}>{t.privacy}</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-6 text-center text-xs text-white/50">(c) {new Date().getFullYear()} NutVitaGlobalis. {t.rights}</div>
    </footer>
  );
}