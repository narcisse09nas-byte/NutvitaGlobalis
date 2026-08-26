"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowDownTrayIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import WorkflowStatusActions, { type WorkflowAction, type WorkflowHistoryEntry } from "@/components/op-management/WorkflowStatusActions";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import { generatePoNumber } from "@/lib/ppm/ops-ids";
import { notifyOpsPartnersForCooperative, notifyOpsPartnersForSite } from "@/lib/ppm/ops-notify-partners";
import type {
  AuditLogEntry, OpsCooperative, OpsDistributionPlan, OpsDistributionPlanDaily, OpsDistributionPlanSite,
  OpsIngredientPrice, OpsMenu, OpsMenuIngredient, OpsPoDailyLine, OpsPoIngredientLine, OpsProduct,
  OpsPurchaseOrder, OpsPurchaseOrderStatus, OpsSite, PPMResource,
} from "@/lib/ppm/types";

const statusLabels: Record<OpsPurchaseOrderStatus, string> = {
  draft: "Brouillon", submitted: "Soumis", coges_approved: "Approuve (COGES)", endorsed_by_cooperative: "Endosse (cooperative)",
  returned: "Retourne", rejected: "Rejete", cancelled: "Annule",
};
const statusTones: Record<OpsPurchaseOrderStatus, string> = {
  draft: "bg-slate-100 text-slate-600", submitted: "bg-sky-50 text-sky-800", coges_approved: "bg-amber-50 text-amber-800",
  endorsed_by_cooperative: "bg-mint text-forest", returned: "bg-orange/10 text-orange", rejected: "bg-red-50 text-red-700", cancelled: "bg-slate-200 text-slate-500",
};
// "endorsed_by_cooperative" is performed by staff on the cooperative's behalf until Wave 7's
// external partner portal lands — the cooperative will then endorse it themselves from their own
// session, and this action will move there.
const NEXT_ACTIONS: Record<OpsPurchaseOrderStatus, WorkflowAction[]> = {
  draft: [{ value: "submitted", label: "Soumettre (membre COGES)", tone: "primary" }],
  submitted: [
    { value: "coges_approved", label: "Approuver (president COGES)", tone: "primary" },
    { value: "returned", label: "Retourner", tone: "ghost", requireNote: true },
    { value: "rejected", label: "Rejeter", tone: "danger", requireNote: true },
  ],
  coges_approved: [{ value: "endorsed_by_cooperative", label: "Endosser (au nom de la cooperative)", tone: "primary" }],
  returned: [{ value: "submitted", label: "Re-soumettre", tone: "primary" }],
  endorsed_by_cooperative: [],
  rejected: [],
  cancelled: [],
};

export default function PurchaseOrderManager({ operationId, initial, plans, sites, cooperatives, products, menus, menuIngredients, ingredientPrices, staff = [] }: {
  operationId: string; initial: OpsPurchaseOrder[]; plans: OpsDistributionPlan[]; sites: OpsSite[]; cooperatives: OpsCooperative[];
  products: OpsProduct[]; menus: OpsMenu[]; menuIngredients: OpsMenuIngredient[]; ingredientPrices: OpsIngredientPrice[]; staff?: PPMResource[];
}) {
  const { en } = usePpmLocale();
  const [rows, setRows] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [detailFor, setDetailFor] = useState<OpsPurchaseOrder | null>(null);
  const siteName = (id: string) => sites.find(item => item.id === id)?.name || "—";
  const cooperativeName = (id: string) => cooperatives.find(item => item.id === id)?.name || "—";

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">{en ? "Purchase orders" : "Bons de commande"}</h2><button onClick={() => setCreating(true)} disabled={!plans.length} className="btn-primary px-4 py-2 text-sm disabled:opacity-40"><PlusIcon className="mr-2 h-4" />{en ? "New purchase order" : "Nouveau bon de commande"}</button></div>
    {!plans.length && <p className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900">{en ? "Create a distribution plan first (Planification)." : "Creez d'abord un plan de distribution (Planification)."}</p>}
    <div className="grid gap-3">
      {rows.map(row => <article key={row.id} className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><span className="mr-2 rounded-full bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-500">{row.id}</span><b className="text-forest">{siteName(row.site_id)}</b><p className="mt-1 text-xs text-slate-400">{en ? "Cooperative" : "Cooperative"} : {cooperativeName(row.cooperative_id)}</p></div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTones[row.status]}`}>{statusLabels[row.status]}</span>
        </div>
        <button onClick={() => setDetailFor(row)} className="btn-secondary mt-3 px-3 py-1.5 text-xs">{en ? "Open" : "Ouvrir"}</button>
      </article>)}
      {!rows.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">{en ? "No purchase order created yet." : "Aucun bon de commande cree pour le moment."}</p>}
    </div>

    {creating && <CreatePoModal
      operationId={operationId} plans={plans} sites={sites} cooperatives={cooperatives} menus={menus} menuIngredients={menuIngredients} ingredientPrices={ingredientPrices}
      onClose={() => setCreating(false)}
      onCreated={created => { setRows(current => [created, ...current]); setCreating(false); }}
    />}

    {detailFor && <PoDetailPanel
      po={detailFor} sites={sites} cooperatives={cooperatives} products={products} menus={menus} staff={staff}
      onStatusChanged={updated => setRows(current => current.map(row => row.id === updated.id ? updated : row))}
      onClose={() => setDetailFor(null)}
    />}
  </div>;
}

function CreatePoModal({ operationId, plans, sites, cooperatives, menus, menuIngredients, ingredientPrices, onClose, onCreated }: {
  operationId: string; plans: OpsDistributionPlan[]; sites: OpsSite[]; cooperatives: OpsCooperative[]; menus: OpsMenu[];
  menuIngredients: OpsMenuIngredient[]; ingredientPrices: OpsIngredientPrice[];
  onClose: () => void; onCreated: (po: OpsPurchaseOrder) => void;
}) {
  const { en } = usePpmLocale();
  const [planId, setPlanId] = useState(plans[0]?.id || "");
  const [planSites, setPlanSites] = useState<OpsDistributionPlanSite[]>([]);
  const [planSiteId, setPlanSiteId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [dailyPlan, setDailyPlan] = useState<Record<string, OpsDistributionPlanDaily>>({});
  const [selectedDates, setSelectedDates] = useState<Record<string, { menuId: string; studentCount: number }>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const currentPlanSite = planSites.find(item => item.id === planSiteId);
  const site = currentPlanSite ? sites.find(item => item.id === currentPlanSite.site_id) : undefined;
  const cooperative = site?.cooperative_id ? cooperatives.find(item => item.id === site.cooperative_id) : undefined;

  useEffect(() => {
    if (!planId) { setPlanSites([]); setPlanSiteId(""); return; }
    createClient().from("ppm_ops_distribution_plan_sites").select("*").eq("plan_id", planId).then(result => {
      const loaded = (result.data || []) as OpsDistributionPlanSite[];
      setPlanSites(loaded);
      setPlanSiteId(loaded[0]?.id || "");
    });
  }, [planId]);

  useEffect(() => {
    if (!currentPlanSite) { setDailyPlan({}); setSelectedDates({}); setPeriodStart(""); setPeriodEnd(""); return; }
    setPeriodStart(currentPlanSite.period_start);
    setPeriodEnd(currentPlanSite.period_end);
    createClient().from("ppm_ops_distribution_plan_daily").select("*").eq("plan_site_id", currentPlanSite.id).then(result => {
      const map: Record<string, OpsDistributionPlanDaily> = {};
      for (const row of (result.data || []) as OpsDistributionPlanDaily[]) map[row.ration_date] = row;
      setDailyPlan(map);
      setSelectedDates({});
    });
  }, [currentPlanSite?.id]);

  const dates = useMemo(() => Object.keys(dailyPlan).sort(), [dailyPlan]);

  function toggleDate(date: string, checked: boolean) {
    setSelectedDates(current => {
      const next = { ...current };
      if (checked) next[date] = { menuId: dailyPlan[date].menu_id, studentCount: dailyPlan[date].target_children };
      else delete next[date];
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!site || !cooperative) { setMessage(en ? "This site has no assigned cooperative yet (see Cadrage)." : "Ce site n'a pas encore de cooperative assignee (voir Cadrage)."); return; }
    const chosenDates = Object.entries(selectedDates);
    if (!chosenDates.length) { setMessage(en ? "Select at least one date to cover." : "Selectionnez au moins une date a couvrir."); return; }
    setSaving(true);
    setMessage("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Compute the generated ingredient table: sum(menu ingredient qty/child/day x student count)
    // across every selected date, per product. Menu ingredient quantities are entered in grams
    // (see MenuManager.tsx's default unit) — converted here to metric tons (MT, for the quantity
    // column) and to kg (to price against the per-Kg approved ingredient price).
    const gramsByProduct: Record<string, number> = {};
    for (const [, choice] of chosenDates) {
      const ingredientsForMenu = menuIngredients.filter(item => item.menu_id === choice.menuId);
      for (const ingredient of ingredientsForMenu) {
        gramsByProduct[ingredient.product_id] = (gramsByProduct[ingredient.product_id] || 0) + ingredient.quantity_per_child_per_day * choice.studentCount;
      }
    }

    const poNumber = await generatePoNumber(supabase, site.id, site.short_initials);
    const poResult = await supabase.from("ppm_ops_purchase_orders").insert({
      id: poNumber, plan_id: planId, site_id: site.id, cooperative_id: cooperative.id,
      cooperative_address_snapshot: cooperative.address || null, cooperative_phone_snapshot: cooperative.phone || null, cooperative_email_snapshot: cooperative.email || null,
      period_start: periodStart, period_end: periodEnd, status: "draft", created_by: user?.id,
    }).select("*").single();
    if (poResult.error) { setSaving(false); setMessage(poResult.error.message); return; }
    const created = poResult.data as OpsPurchaseOrder;

    await supabase.from("ppm_ops_po_daily_lines").insert(chosenDates.map(([date, choice]) => ({ po_id: created.id, ration_date: date, menu_id: choice.menuId, student_count: choice.studentCount })));

    const ingredientLines = Object.entries(gramsByProduct).map(([productId, grams]) => {
      const quantityMt = grams / 1_000_000;
      const quantityKg = grams / 1000;
      const approvedPrice = ingredientPrices.find(item => item.product_id === productId);
      const unitPrice = approvedPrice?.unit_price || 0;
      return { po_id: created.id, product_id: productId, quantity_mt: quantityMt, unit_price: unitPrice, total_price: quantityKg * unitPrice };
    });
    if (ingredientLines.length) await supabase.from("ppm_ops_po_ingredient_lines").insert(ingredientLines);

    await supabase.from("ppm_history").insert({ entity_type: "purchase_order", entity_id: created.id, actor_id: user?.id, action: "Bon de commande cree", to_status: created.status });
    setSaving(false);
    onCreated(created);
  }

  return <div className="fixed inset-0 z-[150] overflow-y-auto bg-forest/90 p-4">
    <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
      <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{en ? "New purchase order" : "Nouveau bon de commande"}</h2><button type="button" onClick={onClose} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
      <div className="mt-6 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold">{en ? "Plan" : "Plan"}<select value={planId} onChange={event => setPlanId(event.target.value)} className="admin-input">{plans.map(item => <option key={item.id} value={item.id}>{item.code}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "School" : "Ecole"}<select value={planSiteId} onChange={event => setPlanSiteId(event.target.value)} className="admin-input"><option value="">{en ? "Select..." : "Selectionner..."}</option>{planSites.map(item => <option key={item.id} value={item.id}>{sites.find(s => s.id === item.site_id)?.name || "—"}</option>)}</select></label>
        </div>

        {site && <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
          {cooperative ? <p><b>{cooperative.name}</b>{cooperative.address ? ` · ${cooperative.address}` : ""}{cooperative.phone ? ` · ${cooperative.phone}` : ""}{cooperative.email ? ` · ${cooperative.email}` : ""}</p> : <p className="font-bold text-orange">{en ? "No cooperative assigned to this school yet." : "Aucune cooperative assignee a cette ecole pour le moment."}</p>}
        </div>}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold">{en ? "Period start" : "Debut periode"}<input type="date" value={periodStart} onChange={event => setPeriodStart(event.target.value)} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Period end" : "Fin periode"}<input type="date" value={periodEnd} onChange={event => setPeriodEnd(event.target.value)} className="admin-input" /></label>
        </div>

        {!!dates.length && <div>
          <h3 className="text-sm font-black uppercase text-slate-400">{en ? "Days to cover" : "Jours a couvrir"}</h3>
          <div className="mt-2 grid max-h-64 gap-2 overflow-y-auto rounded-xl border p-3">
            {dates.map(date => {
              const checked = date in selectedDates;
              const choice = selectedDates[date];
              return <div key={date} className="grid grid-cols-[auto_1fr_1fr_100px] items-center gap-2 text-sm">
                <input type="checkbox" checked={checked} onChange={event => toggleDate(date, event.target.checked)} className="h-4 w-4" />
                <span>{new Date(date).toLocaleDateString(en ? "en-US" : "fr-FR")}</span>
                <select disabled={!checked} value={choice?.menuId || dailyPlan[date].menu_id} onChange={event => setSelectedDates(current => ({ ...current, [date]: { menuId: event.target.value, studentCount: current[date]?.studentCount || dailyPlan[date].target_children } }))} className="admin-input disabled:opacity-50">
                  {menus.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <input type="number" min="0" disabled={!checked} defaultValue={dailyPlan[date].target_children} onChange={event => setSelectedDates(current => checked ? { ...current, [date]: { menuId: current[date]?.menuId || dailyPlan[date].menu_id, studentCount: Number(event.target.value || 0) } } : current)} className="admin-input disabled:opacity-50" />
              </div>;
            })}
          </div>
        </div>}
        {!dates.length && currentPlanSite && <p className="text-sm text-slate-400">{en ? "No daily menu plan found for this school yet (see Planification → Daily plan)." : "Aucun plan journalier trouve pour cette ecole (voir Planification → Plan journalier)."}</p>}

        {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
        <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Creating..." : "Creation...") : (en ? "Create" : "Creer")}</button></div>
      </div>
    </form>
  </div>;
}

function PoDetailPanel({ po, sites, cooperatives, products, menus, staff, onStatusChanged, onClose }: {
  po: OpsPurchaseOrder; sites: OpsSite[]; cooperatives: OpsCooperative[]; products: OpsProduct[]; menus: OpsMenu[]; staff: PPMResource[];
  onStatusChanged: (updated: OpsPurchaseOrder) => void; onClose: () => void;
}) {
  const { en } = usePpmLocale();
  const [status, setStatus] = useState(po.status);
  const [dailyLines, setDailyLines] = useState<OpsPoDailyLine[]>([]);
  const [ingredientLines, setIngredientLines] = useState<OpsPoIngredientLine[]>([]);
  const [history, setHistory] = useState<AuditLogEntry[]>([]);
  const [downloading, setDownloading] = useState(false);
  const siteName = (id: string) => sites.find(item => item.id === id)?.name || "—";
  const cooperativeName = (id: string) => cooperatives.find(item => item.id === id)?.name || "—";
  const productName = (id: string) => products.find(item => item.id === id)?.name || "—";
  const menuName = (id: string) => menus.find(item => item.id === id)?.name || "—";
  const totalPrice = ingredientLines.reduce((sum, item) => sum + item.total_price, 0);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("ppm_ops_po_daily_lines").select("*").eq("po_id", po.id).order("ration_date"),
      supabase.from("ppm_ops_po_ingredient_lines").select("*").eq("po_id", po.id),
      supabase.from("ppm_history").select("*").eq("entity_type", "purchase_order").eq("entity_id", po.id).order("created_at", { ascending: false }).limit(100),
    ]).then(([dailyResult, ingredientResult, historyResult]) => {
      setDailyLines((dailyResult.data || []) as OpsPoDailyLine[]);
      setIngredientLines((ingredientResult.data || []) as OpsPoIngredientLine[]);
      setHistory((historyResult.data || []) as AuditLogEntry[]);
    });
  }, [po.id]);

  async function downloadPdf() {
    setDownloading(true);
    const response = await fetch("/api/ppm/operations/purchase-orders/export-pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ po_id: po.id }) });
    setDownloading(false);
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `bon-commande-${po.id.replace(/\//g, "-")}.pdf`; link.click();
    URL.revokeObjectURL(url);
  }

  const historyEntries: WorkflowHistoryEntry[] = history.map(item => ({ status: item.to_status || item.action, at: item.created_at, note: item.note }));

  return <div className="fixed inset-0 z-[150] overflow-y-auto bg-forest/90 p-4">
    <div className="mx-auto my-10 max-w-3xl rounded-[30px] bg-white p-7 shadow-2xl">
      <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{en ? "Purchase order" : "Bon de commande"} {po.id}</h2><button type="button" onClick={onClose} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
      <p className="mt-2 text-sm text-slate-500">{siteName(po.site_id)} → {cooperativeName(po.cooperative_id)}</p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <WorkflowStatusActions
          entityLabel={en ? "Purchase order" : "Bon de commande"} itemTitle={po.id} status={status}
          statusLabels={statusLabels} statusTones={statusTones} actions={NEXT_ACTIONS[status]} staff={staff}
          history={historyEntries}
          onConfirm={async ({ nextStatus, reviewedByName, note }) => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            const extra: Record<string, unknown> = {};
            if (nextStatus === "endorsed_by_cooperative") extra.endorsed_at = new Date().toISOString();
            const result = await supabase.from("ppm_ops_purchase_orders").update({ status: nextStatus, ...extra }).eq("id", po.id).select("*").single();
            if (result.error) return { error: result.error.message };
            const updated = result.data as OpsPurchaseOrder;
            await supabase.from("ppm_history").insert({ entity_type: "purchase_order", entity_id: po.id, actor_id: user?.id, action: `Bon de commande ${statusLabels[nextStatus as OpsPurchaseOrderStatus].toLowerCase()}${reviewedByName ? ` par ${reviewedByName}` : ""}`, from_status: status, to_status: nextStatus, note: note || undefined });
            setStatus(updated.status);
            onStatusChanged(updated);
            setHistory(current => [{ id: crypto.randomUUID(), entity_type: "purchase_order", entity_id: po.id, action: nextStatus, to_status: nextStatus, from_status: status, note: note || undefined, created_at: new Date().toISOString() }, ...current]);

            // Ping the external portal side of the handoff — internal staff already watch this
            // same screen, but the COGES/cooperative contact only sees this from /partenaire-distribution.
            if (nextStatus === "submitted") {
              await notifyOpsPartnersForSite(po.site_id, "coges", {
                titleFr: "Bon de commande a approuver", titleEn: "Purchase order awaiting approval",
                messageFr: `Le bon de commande ${po.id} attend l'approbation du COGES.`,
                messageEn: `Purchase order ${po.id} is awaiting COGES approval.`,
                link: `/partenaire-distribution/bons-de-commande/${po.id}`,
              });
            } else if (nextStatus === "coges_approved") {
              await notifyOpsPartnersForCooperative(po.cooperative_id, {
                titleFr: "Bon de commande a endosser", titleEn: "Purchase order awaiting endorsement",
                messageFr: `Le bon de commande ${po.id} est approuve par le COGES et attend votre endossement.`,
                messageEn: `Purchase order ${po.id} was approved by the COGES and is awaiting your endorsement.`,
                link: `/partenaire-distribution/bons-de-commande/${po.id}`,
              });
            }
          }}
        />
        <button onClick={downloadPdf} disabled={downloading} className="btn-secondary px-3 py-2 text-xs"><ArrowDownTrayIcon className="mr-1 inline h-4" />{downloading ? (en ? "Preparing..." : "Preparation...") : (en ? "Download PDF" : "Telecharger le PDF")}</button>
      </div>

      <h3 className="mt-5 text-sm font-black uppercase text-slate-400">{en ? "Days covered" : "Jours couverts"}</h3>
      <div className="mt-2 overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">{en ? "Date" : "Date"}</th><th className="p-3">{en ? "Menu" : "Menu"}</th><th className="p-3">{en ? "Students" : "Eleves"}</th></tr></thead>
          <tbody>{dailyLines.map(row => <tr key={row.id} className="border-t"><td className="p-3">{new Date(row.ration_date).toLocaleDateString(en ? "en-US" : "fr-FR")}</td><td className="p-3">{menuName(row.menu_id)}</td><td className="p-3">{row.student_count}</td></tr>)}</tbody>
        </table>
      </div>

      <h3 className="mt-5 text-sm font-black uppercase text-slate-400">{en ? "Ingredients" : "Ingredients"}</h3>
      <div className="mt-2 overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">{en ? "Ingredient" : "Ingredient"}</th><th className="p-3">{en ? "Quantity (MT)" : "Quantite (MT)"}</th><th className="p-3">{en ? "Price / Kg" : "Prix au Kg"}</th><th className="p-3">{en ? "Total price" : "Prix total"}</th></tr></thead>
          <tbody>
            {ingredientLines.map(row => <tr key={row.id} className="border-t"><td className="p-3">{productName(row.product_id)}</td><td className="p-3">{row.quantity_mt.toFixed(4)}</td><td className="p-3">{row.unit_price.toLocaleString(en ? "en-US" : "fr-FR")}</td><td className="p-3">{row.total_price.toLocaleString(en ? "en-US" : "fr-FR")}</td></tr>)}
            <tr className="border-t bg-slate-50 font-black"><td className="p-3" colSpan={3}>{en ? "Total" : "Total"}</td><td className="p-3">{totalPrice.toLocaleString(en ? "en-US" : "fr-FR")}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>;
}
