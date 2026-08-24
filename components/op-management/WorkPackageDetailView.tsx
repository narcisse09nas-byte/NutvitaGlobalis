import Link from "next/link";
import { activityStatusLabels, activityStatusTones } from "@/components/op-management/ActivityFormModal";
import EvmSCurveChart from "@/components/op-management/EvmSCurveChart";
import { computeEac, computeEtc, computeEvm, computeMonthlySeries, computeVac, resolveWorkPackageBac } from "@/lib/ppm/evm";
import type { Locale } from "@/lib/i18n";
import type {
  Achievement, Activity, BudgetLine, Deliverable, EvmSettings, Expense, Issue,
  NonConformityReport, PmbWorkPackageSnapshot, ProcurementItem, QualityRequirement,
  ResourceAssignment, Risk, TimePhasedBudget, WBSNode,
} from "@/lib/ppm/types";

export default function WorkPackageDetailView({ projectId, workPackage, activities, budgetLines, expenses, procurementItems, qualityRequirements, ncrs, risks, issues, deliverables, resourceAssignments, achievements, timePhasedRows, evmSettings, pmbSnapshots, locale = "fr" }: {
  projectId: string; workPackage: WBSNode; activities: Activity[]; budgetLines: BudgetLine[]; expenses: Expense[];
  procurementItems: ProcurementItem[]; qualityRequirements: QualityRequirement[]; ncrs: NonConformityReport[];
  risks: Risk[]; issues: Issue[]; deliverables: Deliverable[]; resourceAssignments: ResourceAssignment[];
  achievements: Achievement[]; timePhasedRows: TimePhasedBudget[]; evmSettings: EvmSettings | null;
  pmbSnapshots: PmbWorkPackageSnapshot[]; locale?: Locale;
}) {
  const en = locale === "en";
  const physicalProgress = activities.length ? Math.round(activities.reduce((sum, item) => sum + Number(item.progress_percent || 0), 0) / activities.length) : 0;
  const approvedBudget = budgetLines.reduce((sum, item) => sum + Number(item.revised_budget ?? item.initial_budget ?? 0), 0);
  const committed = budgetLines.reduce((sum, item) => sum + Number(item.committed_amount || 0), 0);
  const postedExpenses = expenses.filter(item => item.status === "posted").reduce((sum, item) => sum + Number(item.converted_amount ?? item.amount_incl_tax), 0);
  const financialExecution = approvedBudget > 0 ? Math.round((postedExpenses / approvedBudget) * 100) : 0;

  const statusDate = evmSettings?.status_date || new Date().toISOString().slice(0, 10);
  const { bac: evmBac, source: evmBacSource } = resolveWorkPackageBac(workPackage.id, budgetLines, pmbSnapshots);
  const evm = evmSettings?.enabled && evmBac > 0
    ? computeEvm({ activities, achievements, expenses, timePhasedRows, bac: evmBac, bacSource: evmBacSource, asOfDate: statusDate })
    : null;
  const eac = evm ? computeEac(evm.bac, evm.ac, evm.ev, evm.cpi, evm.spi, "cpi") : null;
  const etc = evm ? computeEtc(eac, evm.ac) : null;
  const vac = evm ? computeVac(evm.bac, eac) : null;
  const seriesStart = activities.map(activity => activity.planned_start).filter((value): value is string => !!value).sort()[0] || statusDate;
  const monthlySeries = evm ? computeMonthlySeries({ activities, achievements, expenses, timePhasedRows, startDate: seriesStart, asOfDate: statusDate }) : [];

  return <div className="grid gap-5">
    <div>
      <p className="text-xs font-black uppercase tracking-widest text-orange">Work Package</p>
      <h1 className="mt-1 text-2xl font-black text-forest">{workPackage.title}</h1>
      {workPackage.description && <p className="mt-1 text-sm text-slate-500">{workPackage.description}</p>}
    </div>

    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">{en ? "Physical progress" : "Progression physique"}</p><b className="mt-2 block text-2xl text-forest">{physicalProgress}%</b></div>
      <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">{en ? "Financial execution" : "Execution financiere"}</p><b className="mt-2 block text-2xl text-forest">{financialExecution}%</b></div>
      <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">{en ? "Budget · committed · spent" : "Budget · engage · depense"}</p><b className="mt-2 block text-lg text-forest">{approvedBudget.toLocaleString(en ? "en-US" : "fr-FR")} · {committed.toLocaleString(en ? "en-US" : "fr-FR")} · {postedExpenses.toLocaleString(en ? "en-US" : "fr-FR")}</b></div>
    </div>

    <section className="rounded-2xl border bg-white p-6">
      <h2 className="text-sm font-black uppercase text-slate-400">{en ? "Activities" : "Activites"}</h2>
      <div className="mt-3 grid gap-2">
        {activities.map(item => <Link key={item.id} href={`/op-management/projets/${projectId}/activites/${item.id}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2 text-sm hover:bg-mint">
          <span>{item.title}</span>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${activityStatusTones[item.status]}`}>{activityStatusLabels[item.status][locale]}</span>
        </Link>)}
        {!activities.length && <p className="text-sm text-slate-400">{en ? "No attached activity." : "Aucune activite rattachee."}</p>}
      </div>
    </section>

    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border bg-white p-6"><h2 className="text-sm font-black uppercase text-slate-400">{en ? "Deliverables" : "Livrables"}</h2><div className="mt-3 grid gap-2 text-sm">{deliverables.map(item => <p key={item.id}>{item.title} — <b>{item.acceptance_status}</b></p>)}{!deliverables.length && <p className="text-slate-400">{en ? "None." : "Aucun."}</p>}</div></section>
      <section className="rounded-2xl border bg-white p-6"><h2 className="text-sm font-black uppercase text-slate-400">Procurements</h2><div className="mt-3 grid gap-2 text-sm">{procurementItems.map(item => <p key={item.id}>{item.title} — <b>{item.stage}</b></p>)}{!procurementItems.length && <p className="text-slate-400">{en ? "None." : "Aucun."}</p>}</div></section>
      <section className="rounded-2xl border bg-white p-6"><h2 className="text-sm font-black uppercase text-slate-400">{en ? "Quality" : "Qualite"}</h2><div className="mt-3 grid gap-2 text-sm">{qualityRequirements.map(item => <p key={item.id}>{item.title} — <b>{item.result}</b></p>)}{ncrs.map(item => <p key={item.id} className="text-red-600">NCR : {item.title}</p>)}{!qualityRequirements.length && !ncrs.length && <p className="text-slate-400">{en ? "None." : "Aucun."}</p>}</div></section>
      <section className="rounded-2xl border bg-white p-6"><h2 className="text-sm font-black uppercase text-slate-400">{en ? "Risks & Issues" : "Risques & Issues"}</h2><div className="mt-3 grid gap-2 text-sm">{risks.map(item => <p key={item.id} className="text-amber-700">{item.title}</p>)}{issues.map(item => <p key={item.id} className="text-red-600">{item.title}</p>)}{!risks.length && !issues.length && <p className="text-slate-400">{en ? "None." : "Aucun."}</p>}</div></section>
      <section className="rounded-2xl border bg-white p-6"><h2 className="text-sm font-black uppercase text-slate-400">{en ? "Resources" : "Ressources"}</h2><div className="mt-3 grid gap-2 text-sm">{resourceAssignments.map(item => <p key={item.id}>{en ? "Allocation" : "Allocation"} {item.allocation_percent ?? "—"}%</p>)}{!resourceAssignments.length && <p className="text-slate-400">{en ? "None." : "Aucune."}</p>}</div></section>
    </div>

    {evm && <section className="rounded-2xl border bg-white p-6">
      <h2 className="text-sm font-black uppercase text-slate-400">Earned Value Management</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 lg:grid-cols-8">
        <p>PV<br /><b className="text-forest">{evm.pv.toLocaleString(en ? "en-US" : "fr-FR", { maximumFractionDigits: 0 })}</b></p>
        <p>EV<br /><b className="text-forest">{evm.ev.toLocaleString(en ? "en-US" : "fr-FR", { maximumFractionDigits: 0 })}</b></p>
        <p>AC<br /><b className="text-forest">{evm.ac.toLocaleString(en ? "en-US" : "fr-FR", { maximumFractionDigits: 0 })}</b></p>
        <p>SV<br /><b className={evm.sv < 0 ? "text-red-600" : "text-forest"}>{evm.sv.toLocaleString(en ? "en-US" : "fr-FR", { maximumFractionDigits: 0 })}</b></p>
        <p>CV<br /><b className={evm.cv < 0 ? "text-red-600" : "text-forest"}>{evm.cv.toLocaleString(en ? "en-US" : "fr-FR", { maximumFractionDigits: 0 })}</b></p>
        <p>SPI<br /><b className="text-forest">{evm.spi != null ? evm.spi.toFixed(2) : "—"}</b></p>
        <p>CPI<br /><b className="text-forest">{evm.cpi != null ? evm.cpi.toFixed(2) : "—"}</b></p>
        <p>EAC<br /><b className="text-forest">{eac != null ? eac.toLocaleString(en ? "en-US" : "fr-FR", { maximumFractionDigits: 0 }) : "—"}</b></p>
      </div>
      {etc != null && vac != null && <p className="mt-2 text-xs text-slate-400">ETC : {etc.toLocaleString(en ? "en-US" : "fr-FR", { maximumFractionDigits: 0 })} · VAC : {vac.toLocaleString(en ? "en-US" : "fr-FR", { maximumFractionDigits: 0 })} · PV {evm.pvSource === "time_phased" ? (en ? "(monthly budget)" : "(budget mensualise)") : (en ? "(linear estimate)" : "(estimation lineaire)")} · BAC {evm.bacSource === "pmb" ? (en ? "(approved PMB)" : "(PMB approuvee)") : (en ? "(current budget)" : "(budget courant)")}</p>}
      <div className="mt-4"><EvmSCurveChart series={monthlySeries} size="mini" /></div>
      <Link href={`/op-management/projets/${projectId}/suivi-controle/performance`} className="mt-3 inline-block text-xs font-bold text-leaf">{en ? "View project EVM detail →" : "Voir le detail EVM du projet →"}</Link>
    </section>}

    <Link href={`/op-management/projets/${projectId}/planification/wbs`} className="text-sm font-bold text-leaf">{en ? "← Back to WBS" : "← Retour au WBS"}</Link>
  </div>;
}
