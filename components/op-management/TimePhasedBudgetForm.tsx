"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { Activity, BudgetLine, Project, TimePhasedBudget, WBSNode } from "@/lib/ppm/types";

function monthKey(date: Date) { return date.toISOString().slice(0, 7); }
function addMonths(key: string, delta: number) {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return monthKey(date);
}

export default function TimePhasedBudgetForm({ projectId, project, workPackages, budgetLines, activities, initial }: {
  projectId: string; project: Project; workPackages: WBSNode[]; budgetLines: BudgetLine[]; activities: Activity[]; initial: TimePhasedBudget[];
}) {
  const { en } = usePpmLocale();
  const [rows, setRows] = useState(initial);
  const [selectedWpId, setSelectedWpId] = useState(workPackages[0]?.id || "");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [months, setMonths] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const selectedWp = workPackages.find(wp => wp.id === selectedWpId);
  const bac = useMemo(() => budgetLines.filter(line => line.wbs_node_id === selectedWpId).reduce((sum, line) => sum + Number(line.revised_budget ?? line.initial_budget ?? 0), 0), [budgetLines, selectedWpId]);

  function loadWp(wpId: string) {
    setSelectedWpId(wpId);
    setMessage("");
    const wpActivities = activities.filter(activity => activity.work_package_id === wpId && activity.planned_start && activity.planned_end);
    const starts = wpActivities.map(activity => activity.planned_start!).concat(project.start_date ? [project.start_date] : []);
    const ends = wpActivities.map(activity => activity.planned_end!).concat(project.end_date ? [project.end_date] : []);
    const rangeStart = starts.length ? starts.reduce((a, b) => a < b ? a : b) : new Date().toISOString().slice(0, 10);
    const rangeEnd = ends.length ? ends.reduce((a, b) => a > b ? a : b) : new Date().toISOString().slice(0, 10);
    const startKey = monthKey(new Date(rangeStart));
    const endKey = monthKey(new Date(rangeEnd));
    const list: string[] = [];
    let cursor = startKey;
    let guard = 0;
    while (cursor <= endKey && guard < 60) { list.push(cursor); cursor = addMonths(cursor, 1); guard += 1; }
    if (!list.length) list.push(monthKey(new Date()));
    setMonths(list);
    const existing = rows.filter(row => row.work_package_id === wpId);
    const seeded: Record<string, string> = {};
    for (const month of list) {
      const found = existing.find(row => row.period_date.slice(0, 7) === month);
      seeded[month] = found ? String(found.planned_amount) : "0";
    }
    setAmounts(seeded);
  }

  useEffect(() => { if (selectedWpId && !months.length) loadWp(selectedWpId); }, []);

  function extendRange(direction: "before" | "after") {
    setMonths(current => {
      if (!current.length) return current;
      const next = direction === "before" ? addMonths(current[0], -1) : addMonths(current[current.length - 1], 1);
      setAmounts(existing => ({ ...existing, [next]: existing[next] || "0" }));
      return direction === "before" ? [next, ...current] : [...current, next];
    });
  }

  const total = months.reduce((sum, month) => sum + Number(amounts[month] || 0), 0);
  const matches = Math.abs(total - bac) < 1;

  async function save() {
    if (!selectedWpId) return;
    setSaving(true);
    setMessage("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const payload = months.map(month => ({
      project_id: projectId, work_package_id: selectedWpId, period_date: `${month}-01`,
      planned_amount: Number(amounts[month] || 0), created_by: user?.id,
    }));
    const result = await supabase.from("ppm_time_phased_budgets").upsert(payload, { onConflict: "work_package_id,period_date" }).select("*");
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => [...current.filter(row => row.work_package_id !== selectedWpId), ...(result.data as TimePhasedBudget[])]);
    setMessage(en ? "Time-phased budget saved." : "Budget mensualise enregistre.");
  }

  return <div className="grid gap-4 rounded-2xl border bg-white p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-black text-forest">{en ? "Time-Phased Budget" : "Budget mensualise (Time-Phased Budget)"}</h2>
      <select value={selectedWpId} onChange={event => loadWp(event.target.value)} className="admin-input w-auto"><option value="">{en ? "Select a Work Package" : "Selectionner un Work Package"}</option>{workPackages.map(wp => <option key={wp.id} value={wp.id}>{wp.title}</option>)}</select>
    </div>
    {!workPackages.length && <p className="text-sm text-slate-400">{en ? "No Work Package (WBS level 4) exists yet for this project." : "Aucun Work Package (niveau 4 du WBS) n'existe encore pour ce projet."}</p>}
    {selectedWp && <>
      <p className="text-sm text-slate-500">{en ? "BAC (approved budget) for" : "BAC (budget approuve) pour"} <b>{selectedWp.title}</b> : <b>{bac.toLocaleString(en ? "en-US" : "fr-FR")}</b></p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => extendRange("before")} className="btn-secondary px-3 py-1.5 text-xs">+ {en ? "Month before" : "Mois avant"}</button>
        <button type="button" onClick={() => extendRange("after")} className="btn-secondary px-3 py-1.5 text-xs">+ {en ? "Month after" : "Mois apres"}</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{months.map(month => <th key={month} className="p-3">{month}</th>)}</tr></thead>
          <tbody><tr>{months.map(month => <td key={month} className="p-2"><input type="number" step="0.01" value={amounts[month] || ""} onChange={event => setAmounts(current => ({ ...current, [month]: event.target.value }))} className="admin-input" /></td>)}</tr></tbody>
        </table>
      </div>
      <div className={`rounded-xl p-3 text-sm font-bold ${matches ? "bg-mint text-forest" : "bg-red-50 text-red-700"}`}>
        {en ? "Total entered" : "Total saisi"} : {total.toLocaleString(en ? "en-US" : "fr-FR")} {matches ? (en ? "— matches the BAC ✓" : "— correspond au BAC ✓") : (en ? `— gap of ${(total - bac).toLocaleString("en-US")} vs. the BAC` : `— ecart de ${(total - bac).toLocaleString("fr-FR")} par rapport au BAC`)}
      </div>
      {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
      <div><button onClick={save} disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save the breakdown" : "Enregistrer la repartition")}</button></div>
    </>}
  </div>;
}
