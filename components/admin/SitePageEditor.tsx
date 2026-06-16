"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { ManagedSection, SitePageContent } from "@/data/site-pages";

export default function SitePageEditor({ initial }: { initial: SitePageContent }) {
  const [data, setData] = useState(initial);
  const [message, setMessage] = useState("");
  const updateSection = (index: number, patch: Partial<ManagedSection>) => setData({ ...data, sections: data.sections.map((section, i) => i === index ? { ...section, ...patch } : section) });
  async function save(event: FormEvent) {
    event.preventDefault(); setMessage("Enregistrement...");
    const { label, path, ...payload } = data;
    const { error } = await createClient().from("site_pages").upsert(payload);
    setMessage(error ? error.message : "Page enregistrée. Les modifications sont visibles sur le site.");
  }
  return <form onSubmit={save} className="grid gap-6">
    <section className="grid gap-5 rounded-2xl border bg-white p-6 md:grid-cols-2">
      <Field label="Petit titre" value={data.eyebrow} onChange={value => setData({ ...data, eyebrow: value })}/>
      <Field label="Titre principal" value={data.title} onChange={value => setData({ ...data, title: value })}/>
      <label className="grid gap-2 text-sm font-bold md:col-span-2">Texte de présentation<textarea rows={4} className="admin-input" value={data.description} onChange={event => setData({ ...data, description: event.target.value })}/></label>
      <Field label="Texte du bouton" value={data.cta_label || ""} onChange={value => setData({ ...data, cta_label: value })}/>
      <Field label="Lien du bouton" value={data.cta_url || ""} onChange={value => setData({ ...data, cta_url: value })}/>
    </section>
    {data.sections.map((section, index) => <section key={index} className="grid gap-4 rounded-2xl border bg-white p-6">
      <div className="flex items-center justify-between"><h2 className="font-black">Bloc {index + 1}</h2><button type="button" className="text-sm font-bold text-red-600" onClick={() => setData({ ...data, sections: data.sections.filter((_, i) => i !== index) })}>Supprimer</button></div>
      <Field label="Titre du bloc" value={section.title} onChange={value => updateSection(index, { title: value })}/>
      <label className="grid gap-2 text-sm font-bold">Texte<textarea rows={3} className="admin-input" value={section.text || ""} onChange={event => updateSection(index, { text: event.target.value })}/></label>
      <label className="grid gap-2 text-sm font-bold">Liste, une ligne par élément<textarea rows={5} className="admin-input" value={(section.items || []).join("\n")} onChange={event => updateSection(index, { items: event.target.value.split("\n").map(item => item.trim()).filter(Boolean) })}/></label>
    </section>)}
    <div className="flex flex-wrap gap-3"><button type="button" className="btn-secondary" onClick={() => setData({ ...data, sections: [...data.sections, { title: "Nouveau bloc", text: "", items: [] }] })}>Ajouter un bloc</button><button className="btn-primary">Enregistrer la page</button><Link href={data.path} target="_blank" className="btn-secondary">Prévisualiser</Link></div>
    {message && <p className="font-semibold text-leaf">{message}</p>}
  </form>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="grid gap-2 text-sm font-bold">{label}<input className="admin-input" value={value} onChange={event => onChange(event.target.value)}/></label>; }
