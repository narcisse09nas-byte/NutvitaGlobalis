"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import type { ManagedSection, SitePageContent } from "@/data/site-pages";
import { createClient } from "@/lib/supabase/client";

type Editable=SitePageContent&{eyebrow_en?:string;title_en?:string;description_en?:string;sections_en?:ManagedSection[];cta_label_en?:string;secondary_cta_label?:string;secondary_cta_label_en?:string;secondary_cta_url?:string;hero_image_url?:string;cta_image_url?:string};

export default function SitePageEditor({initial}:{initial:Editable}){
 const [data,setData]=useState<Editable>({...initial,sections_en:initial.sections_en||initial.sections.map(section=>({...section}))});
 const [message,setMessage]=useState("");
 const update=(key:"sections"|"sections_en",index:number,patch:Partial<ManagedSection>)=>setData({...data,[key]:(data[key]||[]).map((section,i)=>i===index?{...section,...patch}:section)});
 async function save(event:FormEvent){
  event.preventDefault();setMessage("Enregistrement...");
  const {label,path,...payload}=data;
  const {error}=await createClient().from("site_pages").upsert(payload);
  setMessage(error?error.message:"Page enregistrée. Les versions française et anglaise sont disponibles.");
 }
 return <form onSubmit={save} className="grid gap-6">
  <div className="grid gap-6 xl:grid-cols-2">{(["fr","en"] as const).map(lang=>{
   const suffix=lang==="en"?"_en":"";
   const sectionsKey=lang==="en"?"sections_en":"sections";
   const sections=data[sectionsKey]||[];
   return <section key={lang} className="grid content-start gap-5 rounded-2xl border bg-white p-6"><h2 className="text-xl font-black text-forest">{lang==="fr"?"Français":"English"}</h2><Field label="Petit titre" value={String(data[`eyebrow${suffix}` as keyof Editable]||"")} onChange={value=>setData({...data,[`eyebrow${suffix}`]:value})}/><Area label={lang==="fr"?"Titre principal (utilisez une nouvelle ligne pour la partie verte)":"Main title (use a new line for the green part)"} value={String(data[`title${suffix}` as keyof Editable]||"")} onChange={value=>setData({...data,[`title${suffix}`]:value})} rows={3}/><Area label="Présentation" value={String(data[`description${suffix}` as keyof Editable]||"")} onChange={value=>setData({...data,[`description${suffix}`]:value})}/><Field label="Texte du bouton principal" value={String(data[`cta_label${suffix}` as keyof Editable]||"")} onChange={value=>setData({...data,[`cta_label${suffix}`]:value})}/><Field label="Texte du bouton secondaire" value={String(data[`secondary_cta_label${suffix}` as keyof Editable]||"")} onChange={value=>setData({...data,[`secondary_cta_label${suffix}`]:value})}/>{sections.map((section,index)=><div key={index} className="grid gap-3 rounded-xl bg-slate-50 p-4"><div className="flex justify-between"><b>Bloc {index+1}</b><button type="button" className="text-xs font-bold text-red-600" onClick={()=>setData({...data,[sectionsKey]:sections.filter((_,i)=>i!==index)})}>Supprimer</button></div><Field label="Titre" value={section.title} onChange={value=>update(sectionsKey,index,{title:value})}/><Area label="Texte" value={section.text||""} onChange={value=>update(sectionsKey,index,{text:value})}/><Area label="Liste (une ligne par élément)" value={(section.items||[]).join("\n")} onChange={value=>update(sectionsKey,index,{items:value.split("\n").map(x=>x.trim()).filter(Boolean)})}/><Field label="Image du bloc (URL, facultatif)" value={section.image_url||""} onChange={value=>update(sectionsKey,index,{image_url:value})}/><Field label="Libellé du bouton (facultatif)" value={section.cta_label||""} onChange={value=>update(sectionsKey,index,{cta_label:value})}/><Field label="Lien du bouton (facultatif)" value={section.cta_url||""} onChange={value=>update(sectionsKey,index,{cta_url:value})}/><Field label="Badge (facultatif)" value={section.badge||""} onChange={value=>update(sectionsKey,index,{badge:value})}/></div>)}<button type="button" className="btn-secondary" onClick={()=>setData({...data,[sectionsKey]:[...sections,{title:lang==="fr"?"Nouveau bloc":"New section",text:"",items:[]}]})}>Ajouter un bloc</button></section>
  })}</div>
  <section className="grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-2"><h2 className="text-xl font-black text-forest md:col-span-2">Médias et liens communs</h2><Field label="Image principale (URL)" value={data.hero_image_url||""} onChange={value=>setData({...data,hero_image_url:value})}/><Field label="Image du bandeau final (URL)" value={data.cta_image_url||""} onChange={value=>setData({...data,cta_image_url:value})}/><Field label="Lien du bouton principal" value={data.cta_url||""} onChange={value=>setData({...data,cta_url:value})}/><Field label="Lien du bouton secondaire" value={data.secondary_cta_url||""} onChange={value=>setData({...data,secondary_cta_url:value})}/></section>
  <div className="flex flex-wrap gap-3"><button className="btn-primary">Enregistrer les deux langues</button><Link href={data.path} target="_blank" className="btn-secondary">Prévisualiser</Link></div>{message&&<p className="font-semibold text-leaf">{message}</p>}
 </form>;
}
function Field({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}){return <label className="grid gap-2 text-sm font-bold">{label}<input className="admin-input" value={value} onChange={event=>onChange(event.target.value)}/></label>}
function Area({label,value,onChange,rows=4}:{label:string;value:string;onChange:(value:string)=>void;rows?:number}){return <label className="grid gap-2 text-sm font-bold">{label}<textarea rows={rows} className="admin-input" value={value} onChange={event=>onChange(event.target.value)}/></label>}
