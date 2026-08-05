"use client";

import QRCode from "qrcode";
import { Building2, Globe2, Mail, MapPin, Phone, Printer, QrCode, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type StaffCardData={fullName:string;position:string;unit:string;email:string;phone:string;city:string;country:string;reference?:string};

export default function StaffBusinessCard({staff,onClose}:{staff:StaffCardData;onClose:()=>void}){
 const [qrSrc,setQrSrc]=useState("");
 const locationLabel=[staff.city,staff.country].filter(Boolean).join(", ")||"Douala, Cameroun";
 const loginPath=useMemo(()=>{
  const redirect="/api/access/open?service=maximus&role=staff";
  return `/connexion?identifiant=${encodeURIComponent(staff.email||"")}&redirect=${encodeURIComponent(redirect)}`;
 },[staff.email]);
 useEffect(()=>{
  if(!staff.email)return;
  const target=`${window.location.origin}${loginPath}`;
  QRCode.toDataURL(target,{width:360,margin:2,errorCorrectionLevel:"H",color:{dark:"#0b4a37",light:"#ffffff"}}).then(setQrSrc).catch(()=>setQrSrc(""));
 },[loginPath,staff.email]);
 return <div className="fixed inset-0 z-[120] overflow-y-auto bg-slate-950/70 p-4 md:p-8" onMouseDown={onClose}>
  <section className="mx-auto w-full max-w-6xl" onMouseDown={event=>event.stopPropagation()}>
   <div className="mb-4 flex items-center justify-between gap-4 text-white print:hidden"><div><p className="text-xs font-black uppercase tracking-widest text-orange">NutVitaGlobalis</p><h2 className="text-2xl font-black text-white">Carte de visite / Business card</h2></div><div className="flex gap-2"><button type="button" onClick={()=>window.print()} className="inline-flex items-center rounded-full bg-white px-5 py-3 font-black text-forest"><Printer className="mr-2 h-5"/>Imprimer / PDF</button><button type="button" onClick={onClose} className="grid h-12 w-12 place-items-center rounded-full bg-white/10" aria-label="Fermer / Close"><X/></button></div></div>
   <div id="staff-business-card" className="grid gap-6 print:block">
    <article className="business-side relative overflow-hidden rounded-[2rem] bg-white p-8 text-forest shadow-2xl md:p-12"><div className="grid min-h-[360px] items-center gap-8 md:grid-cols-[.85fr_1.15fr]"><div className="flex items-center justify-center border-forest/20 md:border-r md:pr-10"><img src="/brand/nutvita-logo-full.png" alt="NutVitaGlobalis" className="max-h-48 w-full object-contain"/></div><div><p className="text-4xl font-black uppercase leading-tight md:text-5xl">{staff.fullName}</p><p className="mt-3 text-2xl font-bold">{staff.position||"Staff NutVitaGlobalis"}</p><p className="mt-1 text-xl font-black text-orange">{staff.unit}</p><div className="mt-7 grid gap-3 text-lg"><Line icon={Phone} text={staff.phone||"—"}/><Line icon={Mail} text={staff.email||"contact@nutvitaglobalis.com"}/><Line icon={Globe2} text="www.nutvitaglobalis.com"/><Line icon={MapPin} text={locationLabel}/></div>{staff.reference&&<p className="mt-6 text-xs font-bold uppercase tracking-widest text-slate-400">ID {staff.reference}</p>}</div></div><div className="absolute -bottom-20 -left-10 h-32 w-[75%] -rotate-3 bg-forest"/><div className="absolute -bottom-16 -right-10 h-24 w-[70%] rotate-2 bg-orange"/></article>
    <article className="business-side relative overflow-hidden rounded-[2rem] bg-forest p-8 text-white shadow-2xl md:p-10"><div className="relative z-10 grid min-h-[380px] items-center gap-7 md:grid-cols-[1fr_190px]"><div className="flex h-full flex-col justify-between gap-8"><div className="grid grid-cols-2 gap-4 md:grid-cols-3">{[["Nutrition","Nutrition"],["Santé","Health"],["Sécurité alimentaire","Food security"],["Suivi & impact","Monitoring & impact"],["Formation","Training"],["Innovation","Innovation"]].map(([fr,en])=><div key={fr} className="rounded-2xl border border-white/15 bg-white/5 p-3 text-center"><Building2 className="mx-auto h-7 text-orange"/><p className="mt-2 text-sm font-black">{fr}</p><p className="mt-1 text-[10px] text-white/55">{en}</p></div>)}</div><div><p className="font-serif text-3xl italic text-orange md:text-4xl">Nourish life, build the future</p><div className="mt-4 h-px max-w-3xl bg-gradient-to-r from-orange via-orange/40 to-transparent"/></div><div className="flex flex-wrap gap-x-7 gap-y-2 text-xs text-white/80"><span className="flex gap-2"><Globe2 className="h-4 text-orange"/>www.nutvitaglobalis.com</span><span className="flex gap-2"><Mail className="h-4 text-orange"/>contact@nutvitaglobalis.com</span><span className="flex gap-2"><MapPin className="h-4 text-orange"/>{locationLabel}</span></div></div><div className="rounded-3xl bg-white p-4 text-center text-forest shadow-xl">{qrSrc?<a href={loginPath} aria-label="Ouvrir le portail du personnel / Open staff portal"><img src={qrSrc} alt="QR code d’accès au portail du personnel" className="mx-auto h-40 w-40"/></a>:<div className="grid h-40 place-items-center rounded-2xl bg-mint"><QrCode className="h-12 text-leaf"/></div>}<p className="mt-3 text-xs font-black">{staff.email?"Scanner pour se connecter":"Adresse email requise"}</p><p className="mt-1 text-[10px] leading-4 text-slate-500">Scan to sign in · email prefilled<br/>Mot de passe requis / Password required</p></div></div><div className="absolute -right-20 -top-20 h-80 w-80 rounded-full border-[55px] border-white/5"/></article>
   </div>
   <p className="mt-4 text-center text-xs text-white/65 print:hidden">Le QR code contient uniquement l’adresse du portail et l’email du personnel. Aucun mot de passe ni secret n’y est enregistré. / The QR code contains only the portal address and staff email. No password or secret is stored.</p>
   <style jsx global>{`@media print{body *{visibility:hidden!important}#staff-business-card,#staff-business-card *{visibility:visible!important}#staff-business-card{position:absolute;inset:0;width:100%;padding:8mm;background:white}.business-side{break-after:page;box-shadow:none!important;border:1px solid #ddd;min-height:88mm}}`}</style>
  </section>
 </div>;
}
function Line({icon:Icon,text}:{icon:typeof Phone;text:string}){return <p className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-forest text-white"><Icon className="h-5"/></span><span className="break-all">{text}</span></p>}
