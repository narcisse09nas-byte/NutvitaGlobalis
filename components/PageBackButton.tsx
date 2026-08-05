"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { localizedPath, normalizeLocale, stripLocale } from "@/lib/i18n";

const roots=new Set(["/","/connexion","/inscription","/mot-de-passe-oublie","/admin","/super-admin","/maximus","/nutritrack","/op-management","/candidat","/staff-candidat","/partenaire","/espace-client"]);

export default function PageBackButton(){
 const router=useRouter();
 const pathname=usePathname();
 const stripped=stripLocale(pathname);
 if(roots.has(stripped.pathname))return null;
 const locale=normalizeLocale(stripped.locale);
 const label=locale==="en"?"Back":"Retour";
 function goBack(){
  if(window.history.length>1)router.back();
  else router.push(localizedPath(locale,"/"));
 }
 return <button type="button" onClick={goBack} className="fixed bottom-5 left-4 z-[75] inline-flex min-h-11 items-center gap-2 rounded-full border border-forest/15 bg-white/95 px-4 py-2 text-sm font-black text-forest shadow-xl backdrop-blur transition hover:-translate-y-0.5 hover:bg-mint focus:outline-none focus:ring-2 focus:ring-leaf md:bottom-7 md:left-7" aria-label={label}><ArrowLeft className="h-4 w-4"/><span>{label}</span></button>;
}
