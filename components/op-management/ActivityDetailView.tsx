import Link from "next/link";
import { activityStatusLabels, activityStatusTones } from "@/components/op-management/ActivityFormModal";
import type {
  Achievement, Activity, Deliverable, Expense, Issue, NonConformityReport, ProcurementItem,
  QualityRequirement, ResultChainNode, Risk, WBSNode,
} from "@/lib/ppm/types";

export default function ActivityDetailView({ projectId, activity, workPackage, output, achievements, expenses, procurementItems, qualityRequirements, ncrs, risks, issues, deliverables }: {
  projectId: string; activity: Activity; workPackage?: WBSNode | null; output?: ResultChainNode | null;
  achievements: Achievement[]; expenses: Expense[]; procurementItems: ProcurementItem[]; qualityRequirements: QualityRequirement[];
  ncrs: NonConformityReport[]; risks: Risk[]; issues: Issue[]; deliverables: Deliverable[];
}) {
  const validated = achievements.filter(item => item.status === "validated");
  const latestValidated = validated[0];
  const totalExpense = expenses.filter(item => item.status === "posted").reduce((sum, item) => sum + Number(item.converted_amount ?? item.amount_incl_tax), 0);

  return <div className="grid gap-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-orange">{workPackage?.title || "Activite"}</p>
        <h1 className="mt-1 text-2xl font-black text-forest">{activity.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{activity.description}</p>
      </div>
      <span className={`rounded-full px-3 py-1 text-xs font-bold ${activityStatusTones[activity.status]}`}>{activityStatusLabels[activity.status]}</span>
    </div>

    <section className="rounded-2xl border bg-white p-6">
      <h2 className="text-sm font-black uppercase text-slate-400">General</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <p>Responsable<br /><b className="text-forest">{activity.responsible_name || "—"}</b></p>
        <p>Debut prevu<br /><b className="text-forest">{activity.planned_start ? new Date(activity.planned_start).toLocaleDateString("fr-FR") : "—"}</b></p>
        <p>Fin prevue<br /><b className="text-forest">{activity.planned_end ? new Date(activity.planned_end).toLocaleDateString("fr-FR") : "—"}</b></p>
        <p>Output<br /><b className="text-forest">{output?.title || "—"}</b></p>
      </div>
    </section>

    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-sm font-black uppercase text-slate-400">Plan</h2>
        <div className="mt-3 grid gap-2 text-sm">
          <p>Cible : <b>{activity.target_value || "—"}</b></p>
          <p>Beneficiaires prevus : <b>{activity.beneficiaries ?? "—"}</b></p>
          <p>Budget prevu : <b>{activity.planned_budget?.toLocaleString("fr-FR") ?? "—"}</b></p>
          <p>Livrable attendu : <b>{activity.deliverable || "—"}</b></p>
        </div>
      </section>
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-sm font-black uppercase text-slate-400">Actual (valide)</h2>
        <div className="mt-3 grid gap-2 text-sm">
          <p>Progression officielle : <b>{activity.progress_percent != null ? `${activity.progress_percent}%` : "—"}</b></p>
          <p>Beneficiaires cumules (derniere realisation validee) : <b>{latestValidated?.beneficiaries_cumulative ?? "—"}</b></p>
          <p>Depenses postees : <b>{totalExpense.toLocaleString("fr-FR")}</b></p>
          <p>Realisations validees : <b>{validated.length}</b> / {achievements.length} rapportee(s)</p>
        </div>
      </section>
    </div>

    <section className="rounded-2xl border bg-white p-6">
      <h2 className="text-sm font-black uppercase text-slate-400">Realisations rapportees</h2>
      <div className="mt-3 grid gap-2">
        {achievements.map(item => <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2 text-sm"><span><b className="text-forest">{item.title}</b> {item.period_label && `· ${item.period_label}`}</span><span className="text-xs font-bold text-slate-400">{item.status}</span></div>)}
        {!achievements.length && <p className="text-sm text-slate-400">Aucune realisation rapportee.</p>}
      </div>
    </section>

    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-sm font-black uppercase text-slate-400">Procurement</h2>
        <div className="mt-3 grid gap-2 text-sm">{procurementItems.map(item => <p key={item.id}>{item.title} — <b>{item.stage}</b></p>)}{!procurementItems.length && <p className="text-slate-400">Aucun achat lie.</p>}</div>
      </section>
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-sm font-black uppercase text-slate-400">Qualite</h2>
        <div className="mt-3 grid gap-2 text-sm">{qualityRequirements.map(item => <p key={item.id}>{item.title} — <b>{item.result}</b></p>)}{ncrs.map(item => <p key={item.id} className="text-red-600">NCR : {item.title} ({item.status})</p>)}{!qualityRequirements.length && !ncrs.length && <p className="text-slate-400">Aucun controle lie.</p>}</div>
      </section>
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-sm font-black uppercase text-slate-400">Risques &amp; Issues</h2>
        <div className="mt-3 grid gap-2 text-sm">{risks.map(item => <p key={item.id} className="text-amber-700">Risque : {item.title}</p>)}{issues.map(item => <p key={item.id} className="text-red-600">Issue : {item.title} ({item.status})</p>)}{!risks.length && !issues.length && <p className="text-slate-400">Aucun risque ni issue lie.</p>}</div>
      </section>
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-sm font-black uppercase text-slate-400">Livrables</h2>
        <div className="mt-3 grid gap-2 text-sm">{deliverables.map(item => <p key={item.id}>{item.title} — <b>{item.acceptance_status}</b></p>)}{!deliverables.length && <p className="text-slate-400">Aucun livrable lie.</p>}</div>
      </section>
    </div>

    <Link href={`/op-management/projets/${projectId}/mise-en-oeuvre/mes-activites`} className="text-sm font-bold text-leaf">← Retour a Mes activites</Link>
  </div>;
}
