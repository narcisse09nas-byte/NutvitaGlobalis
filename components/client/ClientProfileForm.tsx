"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const conditions = [
  ["diabetes", "Diabete", "Diabetes"],
  ["hypertension", "Hypertension", "Hypertension"],
  ["obesity", "Obesite", "Obesity"],
  ["dyslipidemia", "Dyslipidemie", "Dyslipidemia"],
  ["kidney_disease", "Maladie renale", "Kidney disease"],
] as const;

export default function ClientProfileForm({ userId, email, initial, locale="fr" }: { userId: string; email: string; initial: Record<string, any>;locale?:"fr"|"en" }) {
  const en=locale==="en",tx=(fr:string,english:string)=>en?english:fr;
  const [data, setData] = useState<Record<string, any>>({
    ...initial,
    id: userId,
    email: initial.email || email,
    medical_history: initial.medical_history || {},
  });
  const [message, setMessage] = useState("");

  async function save(event: FormEvent) {
    event.preventDefault();
    const { error } = await createClient().from("client_profiles").upsert(data);
    setMessage(error ? error.message : tx("Profil sante enregistre.","Health profile saved."));
  }

  const update = (key: string, value: unknown) => setData(current => ({ ...current, [key]: value }));
  return <form onSubmit={save} className="grid gap-6 rounded-2xl border bg-white p-6 md:grid-cols-2">
    <Text label={tx("Nom complet","Full name")} value={data.full_name} set={value => update("full_name", value)} />
    <label className="grid gap-2 text-sm font-bold">{tx("Sexe","Sex")}<select className="admin-input" value={data.sex || ""} onChange={event => update("sex", event.target.value)}><option value="">{tx("Non renseigne","Not provided")}</option><option value="Femme">{tx("Femme","Female")}</option><option value="Homme">{tx("Homme","Male")}</option><option value="Autre">{tx("Autre","Other")}</option></select></label>
    <Text label={tx("Date de naissance","Date of birth")} type="date" value={data.birth_date} set={value => update("birth_date", value)} />
    <Text label={tx("Profession","Occupation")} value={data.profession} set={value => update("profession", value)} />
    <Text label={tx("Ville","City")} value={data.city} set={value => update("city", value)} />
    <Text label={tx("Telephone","Phone")} value={data.phone} set={value => update("phone", value)} />
    <Text label="Email" type="email" value={data.email} set={value => update("email", value)} />
    <Text label={tx("Adresse","Address")} value={data.address} set={value => update("address", value)} />
    <div className="md:col-span-2"><h2 className="text-xl font-black">{tx("Historique medical","Medical history")}</h2><div className="mt-4 flex flex-wrap gap-3">{conditions.map(([key, labelFr,labelEn]) => <label key={key} className="flex gap-2 rounded-full border px-4 py-2 text-sm"><input type="checkbox" checked={Boolean(data.medical_history[key])} onChange={event => update("medical_history", { ...data.medical_history, [key]: event.target.checked })} />{en?labelEn:labelFr}</label>)}</div></div>
    <label className="grid gap-2 text-sm font-bold">{tx("Allergies","Allergies")}<textarea className="admin-input" value={data.allergies || ""} onChange={event => update("allergies", event.target.value)} /></label>
    <label className="grid gap-2 text-sm font-bold">{tx("Autres pathologies","Other conditions")}<textarea className="admin-input" value={data.other_conditions || ""} onChange={event => update("other_conditions", event.target.value)} /></label>
    {message && <p className="rounded-xl bg-mint p-4 font-bold text-forest md:col-span-2">{message}</p>}
    <button className="btn-primary justify-self-start md:col-span-2">{tx("Enregistrer mon profil","Save my profile")}</button>
  </form>;
}

function Text({ label, value, set, type = "text" }: { label: string; value: unknown; set: (value: string) => void; type?: string }) {
  return <label className="grid gap-2 text-sm font-bold">{label}<input type={type} className="admin-input" value={String(value || "")} onChange={event => set(event.target.value)} /></label>;
}
