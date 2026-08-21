"use client";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/lib/ppm/types";

const splitList = (value: string) => value.split(",").map(item => item.trim()).filter(Boolean);

const fields: Array<[keyof Project, string, boolean?]> = [
  ["context", "Contexte"],
  ["central_problem", "Probleme central"],
  ["identified_needs", "Besoins identifies"],
  ["available_data", "Donnees disponibles"],
  ["causes", "Causes"],
  ["consequences", "Consequences"],
  ["justification", "Justification de l'intervention"],
  ["opportunity", "Opportunite"],
  ["expected_benefits", "Benefices attendus"],
  ["strategic_alignment", "Alignement strategique"],
  ["national_alignment", "Alignement national"],
  ["added_value", "Valeur ajoutee"],
];

export default function ProjectContextForm({ project }: { project: Project }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = { sdgs: splitList(String(form.get("sdgs") || "")) };
    for (const [key] of fields) payload[key as string] = String(form.get(key as string) || "").trim() || null;
    const supabase = createClient();
    const result = await supabase.from("ppm_projects").update(payload).eq("id", project.id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setMessage("Contexte et justification enregistres.");
  }

  return <form onSubmit={submit} className="grid gap-5 rounded-2xl border bg-white p-6">
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map(([key, label]) => <label key={key as string} className="grid gap-2 text-sm font-bold sm:col-span-2"><span>{label}</span><textarea name={key as string} rows={2} defaultValue={(project[key] as string) || ""} className="admin-input" /></label>)}
      <label className="grid gap-2 text-sm font-bold sm:col-span-2">ODD concernes (separes par des virgules)<input name="sdgs" defaultValue={(project.sdgs || []).join(", ")} className="admin-input" /></label>
    </div>
    {message && <p className="rounded-xl bg-mint p-3 text-sm font-bold text-forest">{message}</p>}
    <div className="flex justify-end"><button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Enregistrer le contexte"}</button></div>
  </form>;
}
