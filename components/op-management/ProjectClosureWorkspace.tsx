"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import HandoverRegister from "@/components/op-management/HandoverRegister";
import ArchiveRegister from "@/components/op-management/ArchiveRegister";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { ArchiveItem, Deliverable, Evaluation, HandoverItem, LessonLearned, PPMDocument, PPMResource, ProcurementItem, Project, ProjectClosure, Stakeholder } from "@/lib/ppm/types";

export default function ProjectClosureWorkspace({
  projectId, project, initial, deliverables, activitiesTotal, activitiesCompleted, procurementItems, budgetBalance,
  evaluations, lessonsLearnedCount, initialHandoverItems, initialArchiveItems, documents, staff = [], stakeholders = [],
}: {
  projectId: string; project: Project; initial: ProjectClosure | null; deliverables: Deliverable[]; activitiesTotal: number;
  activitiesCompleted: number; procurementItems: ProcurementItem[]; budgetBalance: number; evaluations: Evaluation[]; lessonsLearnedCount: number;
  initialHandoverItems: HandoverItem[]; initialArchiveItems: ArchiveItem[]; documents: PPMDocument[]; staff?: PPMResource[]; stakeholders?: Stakeholder[];
}) {
  const { en } = usePpmLocale();
  const staffOptions = staff.map(item => ({ value: item.name, label: item.name, hint: item.role_title }));
  const [closure, setClosure] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [closingProject, setClosingProject] = useState(false);
  const [closingByName, setClosingByName] = useState(false);

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
      // Refinement program, Wave 8 (items 48-49): handover_to_*/archive_reference on this single
      // closure record are superseded by the HandoverRegister/ArchiveRegister components below —
      // no longer collected here, so they must not be overwritten with null on every save.
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
    setMessage(en ? "Closure checklist saved." : "Checklist de cloture enregistree.");
  }

  const readyToClose = closure?.scope_verified && closure?.procurement_closed && closure?.financial_closed;

  async function submitClosure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!closure || !readyToClose) return;
    const form = new FormData(event.currentTarget);
    const closedByName = String(form.get("closed_by_name") || "").trim();
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
    setClosingByName(false);
    setClosure(closureResult.data as ProjectClosure);
    setMessage(en ? "Project closed successfully." : "Projet cloture avec succes.");
  }

  return <div className="grid gap-5">
    {closure?.status === "completed" && <div className="rounded-2xl border-2 border-leaf bg-mint p-5 text-forest">
      <p className="font-black">{en ? "Project closed on" : "Projet cloture le"} {closure.closed_at ? new Date(closure.closed_at).toLocaleDateString(en ? "en-US" : "fr-FR") : "—"}{closure.closed_by_name ? ` ${en ? "by" : "par"} ${closure.closed_by_name}` : ""}.</p>
    </div>}

    <form onSubmit={submit} className="grid gap-5">
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-lg font-black text-forest">1. {en ? "Scope verification" : "Verification du perimetre"}</h2>
        <p className="mt-1 text-sm text-slate-500">{en ? "Accepted deliverables" : "Livrables acceptes"} : {deliverablesAccepted} / {deliverables.length} · {en ? "Completed activities" : "Activites terminees"} : {activitiesCompleted} / {activitiesTotal}</p>
        <label className="mt-3 flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="scope_verified" defaultChecked={closure?.scope_verified} className="h-4 w-4" />{en ? "The project scope is verified and complete" : "Le perimetre du projet est verifie et complet"}</label>
        <textarea name="scope_verification_note" rows={2} placeholder={en ? "Verification notes" : "Notes de verification"} defaultValue={closure?.scope_verification_note || ""} className="admin-input mt-3" />
      </section>

      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-lg font-black text-forest">2. {en ? "Procurement & contract closure" : "Cloture procurement & contrats"}</h2>
        <p className="mt-1 text-sm text-slate-500">{en ? "Not-yet-finalized purchases" : "Achats non finalises"} : {procurementOpen} / {procurementItems.length}</p>
        <label className="mt-3 flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="procurement_closed" defaultChecked={closure?.procurement_closed} className="h-4 w-4" />{en ? "All contracts and purchases are closed" : "Tous les contrats et achats sont clotures"}</label>
        <textarea name="procurement_closure_note" rows={2} placeholder={en ? "Procurement closure notes" : "Notes de cloture procurement"} defaultValue={closure?.procurement_closure_note || ""} className="admin-input mt-3" />
      </section>

      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-lg font-black text-forest">3. {en ? "Financial closure" : "Cloture financiere"}</h2>
        <p className="mt-1 text-sm text-slate-500">{en ? "Remaining budget balance" : "Solde budgetaire restant"} : {budgetBalance.toLocaleString(en ? "en-US" : "fr-FR")} {project.currency || ""}</p>
        <label className="mt-3 flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="financial_closed" defaultChecked={closure?.financial_closed} className="h-4 w-4" />{en ? "Financial reconciliation is complete" : "La reconciliation financiere est terminee"}</label>
        <textarea name="financial_closure_note" rows={2} placeholder={en ? "Financial closure notes" : "Notes de cloture financiere"} defaultValue={closure?.financial_closure_note || ""} className="admin-input mt-3" />
      </section>

      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-lg font-black text-forest">4. {en ? "Final evaluation & lessons learned" : "Evaluation finale & leçons apprises"}</h2>
        <label className="grid gap-2 text-sm font-bold">{en ? "Reference final evaluation" : "Evaluation finale de reference"}<select name="final_evaluation_id" defaultValue={closure?.final_evaluation_id || ""} className="admin-input"><option value="">{en ? "None" : "Aucune"}</option>{finalEvaluations.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <p className="mt-3 text-sm text-slate-500">{lessonsLearnedCount} {en ? "lesson(s) learned recorded." : "lecon(s) apprise(s) enregistree(s)."} <Link href={`/op-management/projets/${projectId}/suivi-controle/meal`} className="font-bold text-leaf">{en ? "Open MEAL →" : "Ouvrir MEAL →"}</Link></p>
      </section>

      {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
      <div className="flex flex-wrap gap-3">
        <button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save the checklist" : "Enregistrer la checklist")}</button>
        <button type="button" onClick={() => setClosingByName(true)} disabled={!readyToClose || closingProject || closure?.status === "completed"} className="btn-secondary disabled:cursor-not-allowed disabled:opacity-40">
          {closingProject ? (en ? "Closing..." : "Cloture en cours...") : (en ? "Definitively close the project" : "Cloturer definitivement le projet")}
        </button>
      </div>
      {!readyToClose && closure?.status !== "completed" && <p className="text-xs text-slate-400">{en ? "The first 3 boxes must be checked and saved before the project can be closed." : "Les 3 premieres cases doivent etre cochees et enregistrees avant de pouvoir cloturer le projet."}</p>}
    </form>

    <section className="rounded-2xl border bg-white p-6"><HandoverRegister projectId={projectId} initial={initialHandoverItems} staff={staff} stakeholders={stakeholders} /></section>
    <section className="rounded-2xl border bg-white p-6"><ArchiveRegister projectId={projectId} initial={initialArchiveItems} deliverables={deliverables} documents={documents} /></section>

    {closingByName && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submitClosure} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{en ? "Closure signature" : "Signature de cloture"}</h2><button type="button" onClick={() => setClosingByName(false)} className="text-2xl">×</button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">{en ? "Your name" : "Votre nom"}<SearchableSelect name="closed_by_name" options={staffOptions} allowOther otherLabel={en ? "Name" : "Nom"} placeholder={en ? "Select a staff member..." : "Selectionner un membre du staff..."} /></label>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setClosingByName(false)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={closingProject} className="btn-primary">{closingProject ? (en ? "Closing..." : "Cloture en cours...") : (en ? "Close" : "Cloturer")}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
