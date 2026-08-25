"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { OpsDistributionPlan, OpsDistributionPlanDaily, OpsDistributionPlanSite, OpsMenu, OpsSite } from "@/lib/ppm/types";

function datesBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  let cursor = new Date(start);
  const last = new Date(end);
  let guard = 0;
  while (cursor <= last && guard < 400) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(cursor); cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return dates;
}

export default function DailyMenuPlanManager({ operationId, plans, sites, menus }: {
  operationId: string; plans: OpsDistributionPlan[]; sites: OpsSite[]; menus: OpsMenu[];
}) {
  const { en } = usePpmLocale();
  const [planId, setPlanId] = useState(plans[0]?.id || "");
  const [planSites, setPlanSites] = useState<OpsDistributionPlanSite[]>([]);
  const [planSiteId, setPlanSiteId] = useState("");
  const [daily, setDaily] = useState<Record<string, OpsDistributionPlanDaily>>({});
  const [sameForPeriod, setSameForPeriod] = useState(false);
  const [bulkMenuId, setBulkMenuId] = useState("");
  const [bulkTarget, setBulkTarget] = useState("");
  const [saving, setSaving] = useState(false);
  const siteName = (id: string) => sites.find(item => item.id === id)?.name || "—";

  useEffect(() => {
    if (!planId) { setPlanSites([]); setPlanSiteId(""); return; }
    createClient().from("ppm_ops_distribution_plan_sites").select("*").eq("plan_id", planId).then(result => {
      const rows = (result.data || []) as OpsDistributionPlanSite[];
      setPlanSites(rows);
      setPlanSiteId(rows[0]?.id || "");
    });
  }, [planId]);

  useEffect(() => {
    if (!planSiteId) { setDaily({}); return; }
    createClient().from("ppm_ops_distribution_plan_daily").select("*").eq("plan_site_id", planSiteId).then(result => {
      const map: Record<string, OpsDistributionPlanDaily> = {};
      for (const row of (result.data || []) as OpsDistributionPlanDaily[]) map[row.ration_date] = row;
      setDaily(map);
    });
  }, [planSiteId]);

  const currentPlanSite = planSites.find(item => item.id === planSiteId);
  const dates = useMemo(() => currentPlanSite ? datesBetween(currentPlanSite.period_start, currentPlanSite.period_end) : [], [currentPlanSite]);

  async function upsertDay(date: string, menuId: string, targetChildren: number, sameForPeriod: boolean) {
    if (!planSiteId || !menuId || !targetChildren) return;
    const supabase = createClient();
    const existing = daily[date];
    const payload = { plan_site_id: planSiteId, ration_date: date, menu_id: menuId, target_children: targetChildren, same_for_period: sameForPeriod };
    const result = existing
      ? await supabase.from("ppm_ops_distribution_plan_daily").update(payload).eq("id", existing.id).select("*").single()
      : await supabase.from("ppm_ops_distribution_plan_daily").insert(payload).select("*").single();
    if (!result.error) setDaily(current => ({ ...current, [date]: result.data as OpsDistributionPlanDaily }));
  }

  async function applyToPeriod() {
    if (!bulkMenuId || !bulkTarget) return;
    setSaving(true);
    for (const date of dates) await upsertDay(date, bulkMenuId, Number(bulkTarget), true);
    setSaving(false);
  }

  async function downloadPdf() {
    if (!planSiteId) return;
    const response = await fetch("/api/ppm/operations/plans/daily-export-pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan_site_id: planSiteId }) });
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `plan-journalier-${planSiteId}.pdf`; link.click();
    URL.revokeObjectURL(url);
  }

  return <div className="grid gap-4">
    <h2 className="text-xl font-black text-forest">{en ? "Daily plan (menus)" : "Plan journalier (menus)"}</h2>

    <div className="grid gap-3 rounded-2xl border bg-white p-5 sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-bold">{en ? "Plan" : "Plan"}<select value={planId} onChange={event => setPlanId(event.target.value)} className="admin-input">{plans.map(item => <option key={item.id} value={item.id}>{item.code}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-bold">{en ? "School" : "Ecole"}<select value={planSiteId} onChange={event => setPlanSiteId(event.target.value)} className="admin-input"><option value="">{en ? "Select..." : "Selectionner..."}</option>{planSites.map(item => <option key={item.id} value={item.id}>{siteName(item.site_id)}</option>)}</select></label>
    </div>

    {currentPlanSite && <>
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border bg-mint/20 p-4">
        <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={sameForPeriod} onChange={event => setSameForPeriod(event.target.checked)} className="h-4 w-4" />{en ? "Same number of children for the whole period" : "Meme nombre d'enfants sur toute la periode"}</label>
        {sameForPeriod && <>
          <label className="grid gap-1 text-xs font-bold">{en ? "Menu" : "Menu"}<select value={bulkMenuId} onChange={event => setBulkMenuId(event.target.value)} className="admin-input"><option value="">—</option>{menus.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="grid gap-1 text-xs font-bold">{en ? "Target children" : "Enfants cibles"}<input type="number" min="0" value={bulkTarget} onChange={event => setBulkTarget(event.target.value)} className="admin-input w-32" /></label>
          <button onClick={applyToPeriod} disabled={saving} className="btn-primary px-4 py-2 text-sm">{saving ? (en ? "Applying..." : "Application...") : (en ? "Apply to every date" : "Appliquer a toutes les dates")}</button>
        </>}
        <button onClick={downloadPdf} className="btn-secondary px-3 py-2 text-xs"><ArrowDownTrayIcon className="mr-1 inline h-4" />{en ? "Download PDF" : "Telecharger le PDF"}</button>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">{en ? "Date" : "Date"}</th><th className="p-3">{en ? "Menu" : "Menu"}</th><th className="p-3">{en ? "Target children" : "Enfants cibles"}</th></tr></thead>
          <tbody>
            {dates.map(date => {
              const row = daily[date];
              return <tr key={date} className="border-t">
                <td className="p-3">{new Date(date).toLocaleDateString(en ? "en-US" : "fr-FR")}</td>
                <td className="p-3"><select defaultValue={row?.menu_id || ""} onChange={event => upsertDay(date, event.target.value, row?.target_children || Number(bulkTarget) || 0, false)} className="admin-input"><option value="">—</option>{menus.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></td>
                <td className="p-3"><input type="number" min="0" defaultValue={row?.target_children ?? ""} onBlur={event => { if (row?.menu_id) upsertDay(date, row.menu_id, Number(event.target.value || 0), false); }} className="admin-input w-32" /></td>
              </tr>;
            })}
            {!dates.length && <tr><td colSpan={3} className="p-8 text-center text-slate-400">{en ? "Select a school with a defined period." : "Selectionnez une ecole avec une periode definie."}</td></tr>}
          </tbody>
        </table>
      </div>
    </>}
  </div>;
}
