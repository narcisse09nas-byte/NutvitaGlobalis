"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Settings = Record<string, unknown>;
const fields = [
  ["hero_title", "Titre principal (FR)"], ["hero_title_en", "Main title (EN)"],
  ["slogan", "Slogan (FR)"], ["slogan_en", "Slogan (EN)"],
  ["presentation", "Texte de presentation (FR)"], ["presentation_en", "Presentation text (EN)"],
  ["hero_image_url", "Image de banniere"],
  ["primary_button_label", "Bouton principal (FR)"], ["primary_button_label_en", "Primary button (EN)"],
  ["primary_button_url", "Lien du bouton principal"],
  ["secondary_button_label", "Bouton secondaire (FR)"], ["secondary_button_label_en", "Secondary button (EN)"],
  ["secondary_button_url", "Lien du bouton secondaire"],
  ["newsletter_title", "Titre newsletter (FR)"], ["newsletter_title_en", "Newsletter title (EN)"],
  ["newsletter_text", "Texte newsletter (FR)"], ["newsletter_text_en", "Newsletter text (EN)"],
  ["welcome_message_fr", "Message d'accueil en francais"], ["welcome_message_en", "Welcome message in English"],
  ["whatsapp_number", "Numero WhatsApp du pied de page"], ["whatsapp_label", "Libelle WhatsApp"],
  ["facebook_url", "Lien de la page Facebook"], ["linkedin_url", "Lien de la page LinkedIn"],
] as const;
const areas = ["presentation", "presentation_en", "newsletter_text", "newsletter_text_en", "welcome_message_fr", "welcome_message_en"];

export default function HomepageEditor({ initial }: { initial: Settings }) {
  const [data, setData] = useState(initial); const [message, setMessage] = useState("");
  async function save(event: FormEvent) {
    event.preventDefault(); const { error } = await createClient().from("homepage_settings").upsert({ ...data, id: 1 });
    setMessage(error ? error.message : "Page d'accueil enregistree.");
  }
  return <form onSubmit={save} className="grid gap-5 border bg-white p-6 md:grid-cols-2">
    {fields.map(([name, label]) => <label key={name} className={`grid gap-2 text-sm font-bold ${areas.includes(name) ? "md:col-span-2" : ""}`}>{label}
      {areas.includes(name) ? <><textarea rows={name.startsWith("welcome_") ? 16 : 4} className="admin-input" value={String(data[name] || "")} onChange={event => setData({ ...data, [name]: event.target.value })} />{name.startsWith("welcome_") && <span className="text-xs font-normal leading-5 text-slate-500">Commencez chaque puce par <b>- </b>. Utilisez <b>*texte*</b> pour l'italique et <b>**texte**</b> pour le gras.</span>}</> : <input className="admin-input" value={String(data[name] || "")} onChange={event => setData({ ...data, [name]: event.target.value })} />}
    </label>)}
    <p className="text-sm font-semibold text-leaf md:col-span-2">Les articles et formations mis en avant sont selectionnes automatiquement.</p>
    {message && <p className="md:col-span-2">{message}</p>}<button className="btn-primary justify-self-start md:col-span-2">Enregistrer</button>
  </form>;
}