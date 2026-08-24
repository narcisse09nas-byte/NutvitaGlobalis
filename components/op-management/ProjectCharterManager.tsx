"use client";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ProjectCharter, ProjectCharterStatus } from "@/lib/ppm/types";

const statusLabels: Record<ProjectCharterStatus, string> = { draft: "Brouillon", under_review: "En revue", approved: "Approuvee" };
const statusTones: Record<ProjectCharterStatus, string> = { draft: "bg-slate-100 text-slate-600", under_review: "bg-amber-50 text-amber-800", approved: "bg-mint text-forest" };
const splitList = (value: string) => value.split(",").map(item => item.trim()).filter(Boolean);

const textFields: Array<[string, string]> = [
  ["purpose", "Raison d'etre du projet"],
  ["overall_objective", "Objectif general"],
  ["expected_results", "Resultats attendus"],
  ["high_level_scope", "Perimetre de haut niveau"],
  ["timeline_summary", "Calendrier"],
  ["initial_risks", "Risques initiaux"],
  ["assumptions", "Hypotheses"],
  ["constraints", "Contraintes"],
  ["key_stakeholders", "Parties prenantes principales"],
  ["project_manager_authority", "Pouvoirs du Project Manager"],
  ["governance", "Gouvernance"],
  ["success_criteria", "Criteres de succes"],
];

export default function ProjectCharterManager({ projectId, initial, projectBudget }: { projectId: string; initial: ProjectCharter[]; projectBudget?: number }) {
  const [versions, setVersions] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const latest = versions[0] || null;
  const locked = latest?.status === "approved";

  async function createCharter() {
    setSaving(true);
    setMessage("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const nextVersion = (latest?.version || 0) + 1;
    const carryForward = latest ? {
      purpose: latest.purpose, overall_objective: latest.overall_objective, specific_objectives: latest.specific_objectives,
      expected_results: latest.expected_results, key_deliverables: latest.key_deliverables, high_level_scope: latest.high_level_scope,
      indicative_budget: latest.indicative_budget, timeline_summary: latest.timeline_summary, initial_risks: latest.initial_risks,
      assumptions: latest.assumptions, constraints: latest.constraints, key_stakeholders: latest.key_stakeholders,
      project_manager_authority: latest.project_manager_authority, governance: latest.governance, success_criteria: latest.success_criteria,
    } : {};
    const result = await supabase.from("ppm_project_charters").insert({ project_id: projectId, version: nextVersion, status: "draft", created_by: user?.id, ...carryForward }).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setVersions(current => [result.data as ProjectCharter, ...current]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!latest) return;
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {
      specific_objectives: splitList(String(form.get("specific_objectives") || "")),
      key_deliverables: splitList(String(form.get("key_deliverables") || "")),
      indicative_budget: form.get("indicative_budget") ? Number(form.get("indicative_budget")) : null,
      prepared_by_name: String(form.get("prepared_by_name") || "").trim() || null,
      reviewed_by_name: String(form.get("reviewed_by_name") || "").trim() || null,
    };
    for (const [key] of textFields) payload[key] = String(form.get(key) || "").trim() || null;
    const supabase = createClient();
    const result = await supabase.from("ppm_project_charters").update(payload).eq("id", latest.id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setVersions(current => current.map(item => item.id === latest.id ? result.data as ProjectCharter : item));
    setMessage("Charte enregistree.");
  }

  async function transition(nextStatus: ProjectCharterStatus) {
    if (!latest) return;
    setSaving(true);
    setMessage("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const extra: Record<string, unknown> = nextStatus === "approved" ? { approved_at: new Date().toISOString(), approved_by_name: user?.user_metadata?.full_name || user?.email } : {};
    const result = await supabase.from("ppm_project_charters").update({ status: nextStatus, ...extra }).eq("id", latest.id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    await supabase.from("ppm_history").insert({ entity_type: "project", entity_id: projectId, actor_id: user?.id, action: `Charte v${latest.version} — ${statusLabels[nextStatus]}`, from_status: latest.status, to_status: nextStatus });
    setVersions(current => current.map(item => item.id === latest.id ? result.data as ProjectCharter : item));
  }

  if (!latest) return <div className="rounded-2xl border bg-white p-8 text-center">
    <p className="text-slate-500">Aucune charte de projet n&apos;a encore ete initiee.</p>
    <button onClick={createCharter} disabled={saving} className="btn-primary mt-4">Initier la charte de projet</button>
  </div>;

  return <div className="grid gap-5">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4">
      <div className="flex items-center gap-3"><b className="text-forest">Version {latest.version}</b><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTones[latest.status]}`}>{statusLabels[latest.status]}</span></div>
      <div className="flex flex-wrap gap-2">
        {latest.status === "draft" && <button onClick={() => transition("under_review")} disabled={saving} className="btn-secondary px-4 py-2 text-xs">Soumettre pour revue</button>}
        {latest.status === "under_review" && <button onClick={() => transition("draft")} disabled={saving} className="btn-secondary px-4 py-2 text-xs">Renvoyer en brouillon</button>}
        {latest.status === "under_review" && <button onClick={() => transition("approved")} disabled={saving} className="btn-primary px-4 py-2 text-xs">Approuver</button>}
        {locked && <button onClick={createCharter} disabled={saving} className="btn-primary px-4 py-2 text-xs">Nouvelle version</button>}
      </div>
    </div>

    {versions.length > 1 && <div className="flex flex-wrap gap-2 text-xs text-slate-400">Historique : {versions.map(item => `v${item.version} (${statusLabels[item.status]})`).join(" · ")}</div>}

    <fieldset disabled={locked}>
      <form onSubmit={submit} className="grid gap-5 rounded-2xl border bg-white p-6 disabled:opacity-70">
        <div className="grid gap-4 sm:grid-cols-2">
          {textFields.map(([key, label]) => <label key={key} className="grid gap-2 text-sm font-bold sm:col-span-2"><span>{label}</span><textarea name={key} rows={2} defaultValue={(latest as unknown as Record<string, string>)[key] || ""} className="admin-input" /></label>)}
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Objectifs specifiques (separes par des virgules)<input name="specific_objectives" defaultValue={(latest.specific_objectives || []).join(", ")} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Principaux livrables (separes par des virgules)<input name="key_deliverables" defaultValue={(latest.key_deliverables || []).join(", ")} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Budget indicatif{latest.indicative_budget == null && projectBudget ? " (pre-rempli depuis le budget global)" : ""}<input name="indicative_budget" type="number" min="0" step="0.01" defaultValue={latest.indicative_budget ?? projectBudget ?? ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Prepare par<input name="prepared_by_name" defaultValue={latest.prepared_by_name || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Revu par<input name="reviewed_by_name" defaultValue={latest.reviewed_by_name || ""} className="admin-input" /></label>
          {latest.approved_by_name && <label className="grid gap-2 text-sm font-bold">Approuve par<input disabled defaultValue={`${latest.approved_by_name}${latest.approved_at ? " — " + new Date(latest.approved_at).toLocaleDateString("fr-FR") : ""}`} className="admin-input" /></label>}
        </div>
        {message && <p className="rounded-xl bg-mint p-3 text-sm font-bold text-forest">{message}</p>}
        {!locked && <div className="flex justify-end"><button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Enregistrer la charte"}</button></div>}
      </form>
    </fieldset>
    {locked && <p className="rounded-xl bg-amber-50 p-4 text-sm font-bold text-amber-900">Cette charte est approuvee et verrouillee. Creez une nouvelle version pour la modifier.</p>}
  </div>;
}
