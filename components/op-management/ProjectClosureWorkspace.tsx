"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Deliverable, Evaluation, LessonLearned, ProcurementItem, Project, ProjectClosure } from "@/lib/ppm/types";

export default function ProjectClosureWorkspace({ projectId, project, initial, deliverables, activitiesTotal, activitiesCompleted, procurementItems, budgetBalance, evaluations, lessonsLearnedCount }: {
  projectId: string; project: Project; initial: ProjectClosure | null; deliverables: Deliverable[]; activitiesTotal: number;
  activitiesCompleted: number; procurementItems: ProcurementItem[]; budgetBalance: number; evaluations: Evaluation[]; lessonsLearnedCount: number;
}) {
  const [closure, setClosure] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [closingProject, setClosingProject] = useState(false);

  const deliverablesAccepted = deliverables.filter(item => item.acceptance_status === "accepted").length;
  const procurementOpen = procurementItems.filter(item => item.stage !== "completed" && item.stage !== "cancelled").length;
  const finalEvaluations = evaluations.filter(item => item.type === "final" || item.type === "endline");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      scope_verified: form.get("scope_verified") === "on",
      scope_verification_note: String(form.get("scope_verification_note") || "").trim() || null,
      procurement_closed: form.get("procurement_closed") === "on",
      procurement_closure_note: String(form.get("procurement_closure_note") || "").trim() || null,
      financial_closed: form.get("financial_closed") === "on",
      financial_closure_note: String(form.get("financial_closure_note") || "").trim() || null,
      final_evaluation_id: String(form.get("final_evaluation_id") || "") || null,
      handover_to_name: String(form.get("handover_to_name") || "").trim() || null,
      handover_to_organization: String(form.get("handover_to_organization") || "").trim() || null,
      handover_date: String(form.get("handover_date") || "") || null,
      handover_notes: String(form.get("handover_notes") || "").trim() || null,
      archive_reference: String(form.get("archive_reference") || "").trim() || null,
      status: (closure?.status === "completed" ? "completed" : "in_progress") as ProjectClosure["status"],
    };
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = closure
      ? await supabase.from("ppm_project_closures").update(payload).eq("id", closure.id).select("*").single()
      : await supabase.from("ppm_project_closures").insert({ ...payload, created_by: user?.id }).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setClosure(result.data as ProjectClosure);
    setMessage("Checklist de cloture enregistree.");
  }

  const readyToClose = closure?.scope_verified && closure?.procurement_closed && closure?.financial_closed;

  async function closeProject() {
    if (!closure || !readyToClose) return;
    const closedByName = prompt("Votre nom (pour la signature de cloture) :");
    if (!closedByName) return;
    setClosingProject(true);
    setMessage("");
    const supabase = createClient();
    const now = new Date().toISOString();
    const closureResult = await supabase.from("ppm_project_closures").update({ status: "completed", closed_by_name: closedByName, closed_at: now }).eq("id", closure.id).select("*").single();
    if (closureResult.error) { setClosingProject(false); setMessage(closureResult.error.message); return; }
    await supabase.from("ppm_projects").update({ status: "closed" }).eq("id", projectId);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("ppm_history").insert({ entity_type: "project", entity_id: projectId, actor_id: user?.id, action: "Projet cloture", from_status: project.status, to_status: "closed", note: closedByName });
    setClosingProject(false);
    setClosure(closureResult.data as ProjectClosure);
    setMessage("Projet cloture avec succes.");
  }

  return <div className="grid gap-5">
    {closure?.status === "completed" && <div className="rounded-2xl border-2 border-leaf bg-mint p-5 text-forest">
      <p className="font-black">Projet cloture le {closure.closed_at ? new Date(closure.closed_at).toLocaleDateString("fr-FR") : "—"}{closure.closed_by_name ? ` par ${closure.closed_by_name}` : ""}.</p>
    </div>}

    <form onSubmit={submit} className="grid gap-5">
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-lg font-black text-forest">1. Verification du perimetre</h2>
        <p className="mt-1 text-sm text-slate-500">Livrables acceptes : {deliverablesAccepted} / {deliverables.length} · Activites terminees : {activitiesCompleted} / {activitiesTotal}</p>
        <label className="mt-3 flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="scope_verified" defaultChecked={closure?.scope_verified} className="h-4 w-4" />Le perimetre du projet est verifie et complet</label>
        <textarea name="scope_verification_note" rows={2} placeholder="Notes de verification" defaultValue={closure?.scope_verification_note || ""} className="admin-input mt-3" />
      </section>

      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-lg font-black text-forest">2. Cloture procurement &amp; contrats</h2>
        <p className="mt-1 text-sm text-slate-500">Achats non finalises : {procurementOpen} / {procurementItems.length}</p>
        <label className="mt-3 flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="procurement_closed" defaultChecked={closure?.procurement_closed} className="h-4 w-4" />Tous les contrats et achats sont clotures</label>
        <textarea name="procurement_closure_note" rows={2} placeholder="Notes de cloture procurement" defaultValue={closure?.procurement_closure_note || ""} className="admin-input mt-3" />
      </section>

      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-lg font-black text-forest">3. Cloture financiere</h2>
        <p className="mt-1 text-sm text-slate-500">Solde budgetaire restant : {budgetBalance.toLocaleString("fr-FR")} {project.currency || ""}</p>
        <label className="mt-3 flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="financial_closed" defaultChecked={closure?.financial_closed} className="h-4 w-4" />La reconciliation financiere est terminee</label>
        <textarea name="financial_closure_note" rows={2} placeholder="Notes de cloture financiere" defaultValue={closure?.financial_closure_note || ""} className="admin-input mt-3" />
      </section>

      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-lg font-black text-forest">4. Evaluation finale &amp; leçons apprises</h2>
        <label className="grid gap-2 text-sm font-bold">Evaluation finale de reference<select name="final_evaluation_id" defaultValue={closure?.final_evaluation_id || ""} className="admin-input"><option value="">Aucune</option>{finalEvaluations.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <p className="mt-3 text-sm text-slate-500">{lessonsLearnedCount} lecon(s) apprise(s) enregistree(s). <Link href={`/op-management/projets/${projectId}/suivi-controle/meal`} className="font-bold text-leaf">Ouvrir MEAL →</Link></p>
      </section>

      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-lg font-black text-forest">5. Transfert (handover)</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold">Transfere a<input name="handover_to_name" defaultValue={closure?.handover_to_name || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Organisation<input name="handover_to_organization" defaultValue={closure?.handover_to_organization || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Date de transfert<input name="handover_date" type="date" defaultValue={closure?.handover_date || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Notes de transfert<textarea name="handover_notes" rows={2} defaultValue={closure?.handover_notes || ""} className="admin-input" /></label>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-lg font-black text-forest">6. Archivage</h2>
        <label className="grid gap-2 text-sm font-bold">Reference d&apos;archivage<input name="archive_reference" defaultValue={closure?.archive_reference || ""} className="admin-input" /></label>
      </section>

      {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
      <div className="flex flex-wrap gap-3">
        <button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Enregistrer la checklist"}</button>
        <button type="button" onClick={closeProject} disabled={!readyToClose || closingProject || closure?.status === "completed"} className="btn-secondary disabled:cursor-not-allowed disabled:opacity-40">
          {closingProject ? "Cloture en cours..." : "Cloturer definitivement le projet"}
        </button>
      </div>
      {!readyToClose && closure?.status !== "completed" && <p className="text-xs text-slate-400">Les 3 premieres cases doivent etre cochees et enregistrees avant de pouvoir cloturer le projet.</p>}
    </form>
  </div>;
}
