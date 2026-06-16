"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bars3Icon, UserCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { localizedPath, normalizeLocale, stripLocale, ui } from "@/lib/i18n";

export default function Header() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const locale = normalizeLocale(stripLocale(path).locale);
  const t = ui[locale].nav;
  const links = [
    ["/", t.home],
    ["/suivi-sante", t.health],
    ["/formations", t.courses],
    ["/teleconseils", t.counselling],
    ["/ressources", t.resources],
    ["/recrutement-dieteticiens", t.recruitment],
    ["/a-propos", t.about],
    ["/contact", t.contact],
  ] as const;
  const canonical = stripLocale(path).pathname;

  return <header className="sticky top-0 z-50 border-b border-forest/10 bg-cream/95 backdrop-blur">
    <div className="container-site flex h-20 min-w-0 items-center justify-between gap-3">
      <Link href={localizedPath(locale, "/")} className="flex min-w-0 items-center gap-2">
        <Image src="/brand/nutvita-logo-round.png" alt="NutVita Globalis" width={44} height={44} className="h-11 w-11 shrink-0 rounded-full object-cover" priority />
        <span className="truncate text-base font-black text-forest sm:text-lg">NutVita<span className="text-orange">Globalis</span></span>
      </Link>
      <nav className="hidden items-center gap-5 lg:flex">{links.map(([href, label]) => <Link key={href} href={localizedPath(locale, href)} className={`text-sm font-semibold transition hover:text-leaf ${canonical === href ? "text-leaf" : "text-slate-600"}`}>{label}</Link>)}</nav>
      <div className="hidden items-center gap-3 lg:flex">
        <LanguageSwitcher compact />
        <Link href={localizedPath(locale, "/acces")} className="btn-primary"><UserCircleIcon className="mr-2 h-5" />{t.login}</Link>
      </div>
      <button type="button" aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} aria-expanded={open} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-forest/15 bg-white text-forest shadow-sm lg:hidden" onClick={() => setOpen(!open)}>{open ? <XMarkIcon className="h-6" /> : <Bars3Icon className="h-6" />}</button>
    </div>
    {open && <nav className="container-site grid gap-1 border-t py-4 lg:hidden">
      {links.map(([href, label]) => <Link onClick={() => setOpen(false)} key={href} href={localizedPath(locale, href)} className={`rounded-xl px-4 py-3 font-semibold ${canonical === href ? "bg-mint text-leaf" : "hover:bg-mint"}`}>{label}</Link>)}
      <div className="px-4 py-2"><LanguageSwitcher compact /></div>
      <Link onClick={() => setOpen(false)} href={localizedPath(locale, "/acces")} className="btn-primary mt-2"><UserCircleIcon className="mr-2 h-5" />{t.login}</Link>
    </nav>}
  </header>;
}
