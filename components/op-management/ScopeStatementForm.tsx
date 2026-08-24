"use client";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { ScopeStatement } from "@/lib/ppm/types";

const fields: Array<[string, string, string]> = [
  ["in_scope", "In Scope — ce que le projet couvre", "In Scope — what the project covers"],
  ["out_of_scope", "Out of Scope — ce qui est explicitement exclu", "Out of Scope — what is explicitly excluded"],
  ["deliverables", "Livrables principaux", "Main deliverables"],
  ["acceptance_criteria", "Criteres d'acceptation", "Acceptance criteria"],
  ["constraints", "Contraintes", "Constraints"],
  ["assumptions", "Hypotheses", "Assumptions"],
  ["dependencies", "Dependances", "Dependencies"],
  ["geographic_limits", "Limites geographiques", "Geographic limits"],
  ["time_limits", "Limites temporelles", "Time limits"],
  ["budget_limits", "Limites budgetaires", "Budget limits"],
];

export default function ScopeStatementForm({ projectId, initial }: { projectId: string; initial: ScopeStatement | null }) {
  const { en } = usePpmLocale();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = { project_id: projectId };
    for (const [key] of fields) payload[key] = String(form.get(key) || "").trim() || null;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = await supabase.from("ppm_scope_statements").upsert({ ...payload, created_by: initial?.created_by || user?.id }, { onConflict: "project_id" }).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setMessage(en ? "Project scope saved." : "Perimetre du projet enregistre.");
  }

  return <form onSubmit={submit} className="grid gap-5 rounded-2xl border bg-white p-6">
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map(([key, label, labelEn]) => <label key={key} className="grid gap-2 text-sm font-bold sm:col-span-2"><span>{en ? labelEn : label}</span><textarea name={key} rows={2} defaultValue={initial ? (initial as unknown as Record<string, string>)[key] || "" : ""} className="admin-input" /></label>)}
    </div>
    {message && <p className="rounded-xl bg-mint p-3 text-sm font-bold text-forest">{message}</p>}
    <div className="flex justify-end"><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save scope" : "Enregistrer le perimetre")}</button></div>
  </form>;
}
