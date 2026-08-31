"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { createClient } from "@/lib/supabase/client";
import EvmSCurveChart from "@/components/op-management/EvmSCurveChart";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import {
  budgetLineForecast, checkEvmDataSufficiency, computeEac, computeEtc, computeEvm, computeMonthlySeries,
  computeTcpiBac, computeTcpiEac, computeVac, evmStatusColor, resolveWorkPackageBac, rollupEvm,
} from "@/lib/ppm/evm";
import type {
  Achievement, Activity, BudgetLine, EacMethod, EvmMetrics, EvmSettings, EvmSnapshot, Expense,
  Issue, PmbWorkPackageSnapshot, Project, Risk, TimePhasedBudget, WBSNode,
} from "@/lib/ppm/types";

const eacMethodLabels: Record<EacMethod, { fr: string; en: string }> = {
  cpi: { fr: "BAC / CPI (performance actuelle maintenue)", en: "BAC / CPI (current performance maintained)" },
  budgeted_rate: { fr: "AC + (BAC - EV) (reste au taux budgete)", en: "AC + (BAC - EV) (remainder at budgeted rate)" },
  cpi_spi: { fr: "AC + (BAC - EV) / (CPI × SPI) (couts et delais continuent d'affecter la performance)", en: "AC + (BAC - EV) / (CPI × SPI) (cost and schedule continue to affect performance)" },
};
const toneClasses: Record<string, string> = {
  green: "bg-mint text-forest", orange: "bg-amber-50 text-amber-800", red: "bg-red-50 text-red-700", unknown: "bg-slate-100 text-slate-500",
};

export default function EvmDashboard({ projectId, project, settings, workPackages, budgetLines, activities, achievements, expenses, timePhasedRows, risks, issues, initialSnapshots, pmbSnapshots }: {
  projectId: string; project: Project; settings: EvmSettings | null; workPackages: WBSNode[]; budgetLines: BudgetLine[];
  activities: Activity[]; achievements: Achievement[]; expenses: Expense[]; timePhasedRows: TimePhasedBudget[];
  risks: Risk[]; issues: Issue[]; initialSnapshots: EvmSnapshot[]; pmbSnapshots: PmbWorkPackageSnapshot[];
}) {
  const { locale, en } = usePpmLocale();
  const fmt = (value: number | null) => value == null ? "—" : value.toLocaleString(en ? "en-US" : "fr-FR", { maximumFractionDigits: 0 });
  const fmtRatio = (value: number | null) => value == null ? "—" : value.toFixed(2);
  const [eacMethod, setEacMethod] = useState<EacMethod>("cpi");
  const [snapshots, setSnapshots] = useState(initialSnapshots);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const statusDate = settings?.status_date || new Date().toISOString().slice(0, 10);
  const gaps = useMemo(() => checkEvmDataSufficiency({ settings, workPackages, budgetLines, activities }), [settings, workPackages, budgetLines, activities]);

  const wpMetrics = useMemo(() => workPackages.map(wp => {
    const wpActivities = activities.filter(activity => activity.work_package_id === wp.id);
    const activityIds = new Set(wpActivities.map(activity => activity.id));
    const wpExpenses = expenses.filter(item => item.work_package_id === wp.id || (item.activity_id && activityIds.has(item.activity_id)));
    const wpTimePhased = timePhasedRows.filter(row => row.work_package_id === wp.id);
    const { bac, source } = resolveWorkPackageBac(wp.id, budgetLines, pmbSnapshots);
    const metrics = computeEvm({ activities: wpActivities, achievements, expenses: wpExpenses, timePhasedRows: wpTimePhased, bac, bacSource: source, asOfDate: statusDate });
    return { wp, metrics };
  }), [workPackages, activities, achievements, expenses, timePhasedRows, budgetLines, pmbSnapshots, statusDate]);

  const unassignedActivities = activities.filter(activity => !activity.work_package_id);
  const unassignedMetrics: EvmMetrics | null = unassignedActivities.length ? computeEvm({
    activities: unassignedActivities, achievements,
    expenses: expenses.filter(item => !item.work_package_id && (!item.activity_id || unassignedActivities.some(a => a.id === item.activity_id))),
    timePhasedRows: [], bac: budgetLines.filter(line => !line.wbs_node_id && !(line.wbs_allocations || []).length).reduce((sum, line) => sum + budgetLineForecast(line), 0),
    asOfDate: statusDate,
  }) : null;

  const project_metrics = useMemo(() => rollupEvm([...wpMetrics.map(item => item.metrics), ...(unassignedMetrics ? [unassignedMetrics] : [])]), [wpMetrics, unassignedMetrics]);

  const eac = computeEac(project_metrics.bac, project_metrics.ac, project_metrics.ev, project_metrics.cpi, project_metrics.spi, eacMethod);
  const etc = computeEtc(eac, project_metrics.ac);
  const vac = computeVac(project_metrics.bac, eac);
  const tcpiBac = computeTcpiBac(project_metrics.bac, project_metrics.ev, project_metrics.ac);
  const tcpiEac = computeTcpiEac(project_metrics.bac, project_metrics.ev, project_metrics.ac, eac);

  const monthlySeries = useMemo(() => {
    const start = project.start_date || activities.map(a => a.planned_start).filter(Boolean).sort()[0] || statusDate;
    return computeMonthlySeries({ activities, achievements, expenses, timePhasedRows, startDate: start, asOfDate: statusDate });
  }, [activities, achievements, expenses, timePhasedRows, project.start_date, statusDate]);

  const spiColor = settings ? evmStatusColor(project_metrics.spi, settings.spi_threshold_green, settings.spi_threshold_orange) : "unknown";
  const cpiColor = settings ? evmStatusColor(project_metrics.cpi, settings.cpi_threshold_green, settings.cpi_threshold_orange) : "unknown";

  const exceptions = settings ? wpMetrics.filter(({ metrics }) => {
    const spiTone = evmStatusColor(metrics.spi, settings.spi_threshold_green, settings.spi_threshold_orange);
    const cpiTone = evmStatusColor(metrics.cpi, settings.cpi_threshold_green, settings.cpi_threshold_orange);
    return spiTone !== "green" && (metrics.spi != null || metrics.cpi != null) && (spiTone === "red" || cpiTone === "red" || spiTone === "orange" || cpiTone === "orange");
  }) : [];

  async function saveSnapshot() {
    setSaving(true);
    setMessage("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = await supabase.from("ppm_evm_snapshots").insert({
      project_id: projectId, scope: "project", scope_id: null, status_date: statusDate,
      bac: project_metrics.bac, pv: project_metrics.pv, ev: project_metrics.ev, ac: project_metrics.ac,
      sv: project_metrics.sv, cv: project_metrics.cv, spi: project_metrics.spi, cpi: project_metrics.cpi,
      eac, eac_method: eacMethod, etc, vac, tcpi: tcpiBac, created_by: user?.id,
    }).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setSnapshots(current => [...current, result.data as EvmSnapshot]);
    setMessage(en ? "Snapshot saved." : "Instantane enregistre.");
  }

  async function analyzeWithAi() {
    setAiLoading(true);
    setAiInsight("");
    const response = await fetch("/api/ppm/evm/insights", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project_id: projectId }) });
    const payload = await response.json();
    setAiLoading(false);
    if (!response.ok) { setMessage(payload.message || (en ? "AI analysis unavailable." : "Analyse IA indisponible.")); return; }
    setAiInsight(payload.insight);
  }

  function exportRows(): (string | number)[][] {
    const header = ["Work Package", "BAC", "PV", "EV", "AC", "SV", "CV", "SPI", "CPI"];
    const rows = wpMetrics.map(({ wp, metrics }) => [wp.title, metrics.bac, metrics.pv, metrics.ev, metrics.ac, metrics.sv, metrics.cv, metrics.spi ?? "", metrics.cpi ?? ""]);
    rows.push([en ? "PROJECT TOTAL" : "TOTAL PROJET", project_metrics.bac, project_metrics.pv, project_metrics.ev, project_metrics.ac, project_metrics.sv, project_metrics.cv, project_metrics.spi ?? "", project_metrics.cpi ?? ""]);
    return [header, ...rows];
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    const csv = exportRows().map(row => row.join(";")).join("\n");
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `evm-${project.name.replace(/[^a-z0-9]+/gi, "-")}-${statusDate}.csv`);
  }

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.aoa_to_sheet(exportRows());
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "EVM");
    XLSX.writeFile(workbook, `evm-${project.name.replace(/[^a-z0-9]+/gi, "-")}-${statusDate}.xlsx`);
  }

  async function exportPdf() {
    setMessage("");
    const response = await fetch("/api/ppm/evm/export-pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project_id: projectId }) });
    if (!response.ok) { const payload = await response.json().catch(() => ({})); setMessage(payload.message || (en ? "PDF export failed." : "Export PDF impossible.")); return; }
    downloadBlob(await response.blob(), `evm-${project.name.replace(/[^a-z0-9]+/gi, "-")}-${statusDate}.pdf`);
  }

  if (gaps.length) return <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-6">
    <h2 className="text-lg font-black text-amber-900">{en ? "EVM unavailable" : "EVM non disponible"}</h2>
    <ul className="mt-3 list-disc pl-5 text-sm text-amber-900">{gaps.map(gap => <li key={gap}>{gap}</li>)}</ul>
  </div>;

  return <div className="grid gap-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-black text-forest">Earned Value Performance</h2><p className="text-sm text-slate-500">Status Date : {new Date(statusDate).toLocaleDateString(en ? "en-US" : "fr-FR")}</p></div>
      <div className="flex flex-wrap gap-2">
        <button onClick={exportCsv} className="btn-secondary px-4 py-2 text-sm">{en ? "Export CSV" : "Exporter CSV"}</button>
        <button onClick={exportExcel} className="btn-secondary px-4 py-2 text-sm">{en ? "Export Excel" : "Exporter Excel"}</button>
        <button onClick={exportPdf} className="btn-secondary px-4 py-2 text-sm">{en ? "Export PDF" : "Exporter PDF"}</button>
        <button onClick={saveSnapshot} disabled={saving} className="btn-primary px-4 py-2 text-sm">{saving ? "..." : (en ? "Save a snapshot" : "Enregistrer un instantane")}</button>
      </div>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">BAC ({project_metrics.bacSource === "pmb" ? (en ? "approved PMB" : "PMB approuvee") : (en ? "current budget" : "budget courant")})</p><b className="mt-2 block text-xl text-forest">{fmt(project_metrics.bac)}</b></div>
      <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">PV ({project_metrics.pvSource === "time_phased" ? (en ? "time-phased budget" : "budget mensualise") : project_metrics.pvSource === "mixed" ? (en ? "partially estimated" : "partiellement estime") : (en ? "linear estimate" : "estimation lineaire")})</p><b className="mt-2 block text-xl text-forest">{fmt(project_metrics.pv)}</b></div>
      <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">EV</p><b className="mt-2 block text-xl text-forest">{fmt(project_metrics.ev)}</b></div>
      <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">AC</p><b className="mt-2 block text-xl text-forest">{fmt(project_metrics.ac)}</b></div>
      <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">SV</p><b className={`mt-2 block text-xl ${project_metrics.sv < 0 ? "text-red-600" : "text-forest"}`}>{fmt(project_metrics.sv)}</b></div>
      <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">CV</p><b className={`mt-2 block text-xl ${project_metrics.cv < 0 ? "text-red-600" : "text-forest"}`}>{fmt(project_metrics.cv)}</b></div>
      <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">SPI</p><span className={`mt-2 inline-block rounded-full px-3 py-1 text-lg font-bold ${toneClasses[spiColor]}`}>{fmtRatio(project_metrics.spi)}</span></div>
      <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">CPI</p><span className={`mt-2 inline-block rounded-full px-3 py-1 text-lg font-bold ${toneClasses[cpiColor]}`}>{fmtRatio(project_metrics.cpi)}</span></div>
    </div>

    <div className="rounded-2xl border bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-black uppercase text-slate-500">{en ? "Forecast (EAC)" : "Previsions (EAC)"}</h3>
        <select value={eacMethod} onChange={event => setEacMethod(event.target.value as EacMethod)} className="admin-input w-auto text-xs">{Object.entries(eacMethodLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-4">
        <p>EAC<br /><b className="text-lg text-forest">{fmt(eac)}</b></p>
        <p>ETC<br /><b className="text-lg text-forest">{fmt(etc)}</b></p>
        <p>VAC<br /><b className={`text-lg ${vac != null && vac < 0 ? "text-red-600" : "text-forest"}`}>{fmt(vac)}</b></p>
        <p>TCPI (BAC / EAC)<br /><b className="text-lg text-forest">{fmtRatio(tcpiBac)} / {fmtRatio(tcpiEac)}</b></p>
      </div>
    </div>

    <div className="rounded-2xl border bg-white p-5">
      <h3 className="text-sm font-black uppercase text-slate-500">{en ? "S-Curve (PV / EV / AC)" : "Courbe en S (PV / EV / AC)"}</h3>
      <div className="mt-3"><EvmSCurveChart series={monthlySeries} /></div>
    </div>

    <div className="rounded-2xl border bg-white p-5">
      <h3 className="text-sm font-black uppercase text-slate-500">{en ? "Work Packages requiring attention" : "Work Packages necessitant une attention"}</h3>
      <div className="mt-3 grid gap-3">
        {exceptions.map(({ wp, metrics }) => {
          const wpRisks = risks.filter(risk => risk.work_package_id === wp.id && risk.status !== "closed");
          const wpIssues = issues.filter(issue => issue.work_package_id === wp.id && issue.status !== "closed" && issue.status !== "resolved");
          return <div key={wp.id} className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><b className="text-forest">{wp.title}</b><span className="text-xs font-bold text-red-700">SPI {fmtRatio(metrics.spi)} · CPI {fmtRatio(metrics.cpi)}</span></div>
            <p className="mt-1 text-xs text-slate-500">{en ? "Responsible" : "Responsable"} : {wp.responsible_name || "—"} · {en ? "Budget" : "Budget"} : {fmt(metrics.bac)} · {wpRisks.length} {en ? "risk(s)" : "risque(s)"} · {wpIssues.length} {en ? "open issue(s)" : "issue(s) ouverte(s)"}</p>
            <Link href={`/op-management/projets/${projectId}/work-packages/${wp.id}`} className="mt-2 inline-block text-xs font-bold text-leaf">{en ? "View details →" : "Voir le detail →"}</Link>
          </div>;
        })}
        {!exceptions.length && <p className="text-sm text-slate-400">{en ? "No Work Package below the configured thresholds." : "Aucun Work Package en dessous des seuils configures."}</p>}
      </div>
    </div>

    {snapshots.length > 1 && <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-2xl border bg-white p-5">
        <h3 className="text-sm font-black uppercase text-slate-500">{en ? "SPI / CPI trend" : "Tendance SPI / CPI"}</h3>
        <div className="mt-3 h-56"><ResponsiveContainer width="100%" height="100%">
          <LineChart data={snapshots}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="status_date" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="spi" stroke="#1f7a55" dot={false} /><Line type="monotone" dataKey="cpi" stroke="#e87d3e" dot={false} /></LineChart>
        </ResponsiveContainer></div>
      </div>
      <div className="rounded-2xl border bg-white p-5">
        <h3 className="text-sm font-black uppercase text-slate-500">{en ? "EAC / VAC trend" : "Tendance EAC / VAC"}</h3>
        <div className="mt-3 h-56"><ResponsiveContainer width="100%" height="100%">
          <LineChart data={snapshots}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="status_date" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="eac" stroke="#123c2f" dot={false} /><Line type="monotone" dataKey="vac" stroke="#dc2626" dot={false} /></LineChart>
        </ResponsiveContainer></div>
      </div>
    </div>}

    <div className="rounded-2xl border bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-black uppercase text-slate-500">{en ? "AI analysis" : "Analyse IA"}</h3><button onClick={analyzeWithAi} disabled={aiLoading} className="btn-secondary px-4 py-2 text-sm">{aiLoading ? (en ? "Analyzing..." : "Analyse...") : (en ? "Analyze with AI" : "Analyser avec l'IA")}</button></div>
      {aiInsight && <p className="mt-3 whitespace-pre-line text-sm text-slate-600">{aiInsight}</p>}
    </div>

    {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
  </div>;
}
