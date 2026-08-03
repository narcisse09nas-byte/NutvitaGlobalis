"use client";
import { usePathname } from "next/navigation";
export default function MedicalDisclaimer(){const english=(usePathname()||"").startsWith("/en");return <aside className="border-y border-orange/10 bg-orange/[.045] px-5 py-2 text-center text-xs font-medium text-slate-500"><span className="mr-2 text-orange" aria-hidden="true">&#9432;</span>{english?"NutVitaGlobalis information does not replace urgent medical care or a physician's advice.":"Les informations de NutVitaGlobalis ne remplacent pas les soins médicaux urgents ni l'avis d'un médecin."}</aside>}
