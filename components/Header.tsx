"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRightOnRectangleIcon, Bars3Icon, BriefcaseIcon, ChevronDownIcon, UserCircleIcon, UserGroupIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { localizedPath, normalizeLocale, stripLocale, ui } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [opportunitiesOpen, setOpportunitiesOpen] = useState(false);
  const [user, setUser] = useState<{ email?: string; name?: string } | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const opportunitiesRef = useRef<HTMLDivElement>(null);
  const path = usePathname();
  const locale = normalizeLocale(stripLocale(path).locale);
  const t = ui[locale].nav;
  const canonical = stripLocale(path).pathname;
  const links = [
    ["/", t.home],
    ["/services", locale === "en" ? "Our services" : "Nos services"],
    ["/teleconseils", locale === "en" ? "Teleconsultations" : "Téléconseils"],
    ["/teleconseils#packs", locale === "en" ? "Packages" : "Packs"],
    ["/ressources", t.resources],
    ["/a-propos", t.about],
    ["/contact", t.contact],
  ] as const;
  const opportunities = [
    ["/carrieres", locale === "en" ? "Job opportunities" : "Offres d'emploi", locale === "en" ? "Join the NutVitaGlobalis staff team." : "Rejoignez l'equipe Staff NutVitaGlobalis.", BriefcaseIcon],
    ["/recrutement-dieteticiens", locale === "en" ? "Dietitian network" : "Reseau de nutritionnistes", locale === "en" ? "Apply to the professional partner network." : "Candidatez au reseau professionnel partenaire.", UserGroupIcon],
  ] as const;
  const opportunityActive = opportunities.some(([href]) => canonical === href);
  const initials = (user?.name || user?.email || "U").split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase();

  useEffect(() => {
    const supabase = createClient();
    const updateUser = (current: any) => setUser(current ? {
      email: current.email || "",
      name: current.user_metadata?.full_name || current.user_metadata?.name || "",
    } : null);
    supabase.auth.getUser().then(({ data }) => updateUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => updateUser(session?.user));
    const close = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setProfileOpen(false);
      if (opportunitiesRef.current && !opportunitiesRef.current.contains(event.target as Node)) setOpportunitiesOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => {
      listener.subscription.unsubscribe();
      document.removeEventListener("mousedown", close);
    };
  }, []);

  async function logout() {
    await createClient().auth.signOut();
    setProfileOpen(false);
    setOpen(false);
    location.assign(localizedPath(locale, "/"));
  }

  const accountControls = user ? (
      <div ref={profileRef} className="relative">
        <button
          type="button"
          aria-label={locale === "en" ? "Open profile" : "Ouvrir le profil"}
          aria-expanded={profileOpen}
          onClick={() => setProfileOpen(value => !value)}
          className="grid h-11 w-11 place-items-center rounded-full bg-forest text-sm font-black text-white"
        >
          {initials}
        </button>
        {profileOpen && (
          <div className="absolute right-0 top-14 w-64 rounded-lg border bg-white p-4 shadow-xl">
            <p className="truncate font-black text-forest">{user.name || (locale === "en" ? "My profile" : "Mon profil")}</p>
            <p className="mt-1 truncate text-sm text-slate-500">{user.email}</p>
            <div className="mt-4 grid gap-2">
              <Link href={localizedPath(locale, "/espace-client/profil")} className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-forest">
                {locale === "en" ? "Client profile" : "Profil client"}
              </Link>
              <Link href={localizedPath(locale, "/acces-nutritrack")} className="rounded-lg bg-cyan-50 px-3 py-2 text-sm font-bold text-cyan-800">
                NutriTrack
              </Link>
              <button type="button" onClick={logout} className="flex items-center rounded-lg px-3 py-2 text-left text-sm font-bold text-red-700 hover:bg-red-50">
                <ArrowRightOnRectangleIcon className="mr-2 h-5" />{locale === "en" ? "Sign out" : "Se deconnecter"}
              </button>
            </div>
          </div>
        )}
      </div>
  ) : (
    <Link href={localizedPath(locale, "/connexion")} className="btn-primary"><UserCircleIcon className="mr-2 h-5" />{t.login}</Link>
  );

  return <header className="sticky top-0 z-50 border-b border-forest/10 bg-cream/95 backdrop-blur">
    <div className="container-site flex h-20 min-w-0 items-center justify-between gap-4">
      <Link href={localizedPath(locale, "/")} className="flex shrink-0 items-center gap-2">
        <Image src="/brand/nutvita-logo-round.png" alt="NutVita Globalis" width={44} height={44} className="h-11 w-11 shrink-0 rounded-full object-cover" priority />
        <span className="whitespace-nowrap text-base font-black text-forest xl:text-lg">NutVita<span className="text-orange">Globalis</span></span>
      </Link>
      <nav className="hidden items-center gap-3 lg:flex">{links.slice(0,5).map(([href, label]) => <Link key={href} href={localizedPath(locale, href)} className={`whitespace-nowrap text-sm font-semibold transition hover:text-leaf ${canonical === href.split("#")[0] ? "text-leaf" : "text-slate-600"}`}>{label}</Link>)}
        <div ref={opportunitiesRef} className="relative">
          <button type="button" aria-expanded={opportunitiesOpen} onClick={() => setOpportunitiesOpen(value => !value)} className={`inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold transition hover:text-leaf ${opportunityActive ? "text-leaf" : "text-slate-600"}`}>{locale === "en" ? "Opportunities" : "Opportunites"}<ChevronDownIcon className={`h-4 transition ${opportunitiesOpen ? "rotate-180" : ""}`}/></button>
          {opportunitiesOpen && <div className="absolute left-1/2 top-10 w-80 -translate-x-1/2 rounded-lg border bg-white p-2 shadow-xl">{opportunities.map(([href,label,description,Icon])=><Link onClick={()=>setOpportunitiesOpen(false)} key={href} href={localizedPath(locale,href)} className="flex gap-3 rounded-md p-3 hover:bg-mint"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-forest text-white"><Icon className="h-5"/></span><span><b className="block text-sm text-forest">{label}</b><small className="mt-1 block leading-5 text-slate-500">{description}</small></span></Link>)}</div>}
        </div>
        {links.slice(5).map(([href, label]) => <Link key={href} href={localizedPath(locale, href)} className={`whitespace-nowrap text-sm font-semibold transition hover:text-leaf ${canonical === href ? "text-leaf" : "text-slate-600"}`}>{label}</Link>)}
      </nav>
      <div className="hidden shrink-0 items-center gap-3 lg:flex">
        <LanguageSwitcher compact />
        {accountControls}
      </div>
      <button type="button" aria-label={open ? (locale === "en" ? "Close menu" : "Fermer le menu") : (locale === "en" ? "Open menu" : "Ouvrir le menu")} aria-expanded={open} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-forest/15 bg-white text-forest shadow-sm lg:hidden" onClick={() => setOpen(!open)}>{open ? <XMarkIcon className="h-6" /> : <Bars3Icon className="h-6" />}</button>
    </div>
    {open && <nav className="container-site grid gap-1 border-t py-4 lg:hidden">
      {links.slice(0,5).map(([href, label]) => <Link onClick={() => setOpen(false)} key={href} href={localizedPath(locale, href)} className={`rounded-xl px-4 py-3 font-semibold ${canonical === href.split("#")[0] ? "bg-mint text-leaf" : "hover:bg-mint"}`}>{label}</Link>)}
      <p className="px-4 pb-1 pt-3 text-xs font-black uppercase text-slate-400">{locale === "en" ? "Opportunities" : "Opportunites"}</p>
      {opportunities.map(([href,label,,Icon])=><Link onClick={()=>setOpen(false)} key={href} href={localizedPath(locale,href)} className={`flex items-center gap-3 rounded-xl px-4 py-3 font-semibold ${canonical===href?"bg-mint text-leaf":"hover:bg-mint"}`}><Icon className="h-5"/>{label}</Link>)}
      {links.slice(5).map(([href, label]) => <Link onClick={() => setOpen(false)} key={href} href={localizedPath(locale, href)} className={`rounded-xl px-4 py-3 font-semibold ${canonical === href ? "bg-mint text-leaf" : "hover:bg-mint"}`}>{label}</Link>)}
      <div className="px-4 py-2"><LanguageSwitcher compact /></div>
      {user ? (
        <>
          <div className="mx-4 rounded-lg bg-slate-50 p-3">
            <p className="truncate font-black">{user.name || user.email}</p>
            <p className="truncate text-sm text-slate-500">{user.email}</p>
          </div>
          <Link onClick={() => setOpen(false)} href={localizedPath(locale, "/espace-client/profil")} className="rounded-lg px-4 py-3 font-semibold hover:bg-mint">{locale === "en" ? "My profile" : "Mon profil"}</Link>
          <Link onClick={() => setOpen(false)} href={localizedPath(locale, "/acces-nutritrack")} className="rounded-lg px-4 py-3 font-semibold hover:bg-cyan-50">NutriTrack</Link>
          <button type="button" onClick={logout} className="btn-primary mt-2"><ArrowRightOnRectangleIcon className="mr-2 h-5" />{locale === "en" ? "Sign out" : "Se deconnecter"}</button>
        </>
      ) : (
        <Link onClick={() => setOpen(false)} href={localizedPath(locale, "/connexion")} className="btn-primary mt-2"><UserCircleIcon className="mr-2 h-5" />{t.login}</Link>
      )}
    </nav>}
  </header>;
}
