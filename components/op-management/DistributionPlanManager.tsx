"use client";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowDownTrayIcon, PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import EntityStatusBadge from "@/components/op-management/EntityStatusBadge";
import WorkflowStatusActions, { type WorkflowAction, type WorkflowHistoryEntry } from "@/components/op-management/WorkflowStatusActions";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import { generateRegistryCode, getOrgCodeForOperation, withUniqueRegistryCode } from "@/lib/ppm/ids";
import type {
  AuditLogEntry, OpsDistributionPlan, OpsDistributionPlanProduct, OpsDistributionPlanSite,
  OpsDistributionPlanStatus, OpsProduct, OpsSite, PPMResource,
} from "@/lib/ppm/types";

const statusLabels: Record<OpsDistributionPlanStatus, string> = {
  draft: "Brouillon", submitted: "Soumis", verified: "Verifie", approved: "Approuve", returned: "Retourne", rejected: "Rejete",
};
const statusTones: Record<OpsDistributionPlanStatus, string> = {
  draft: "bg-slate-100 text-slate-600", submitted: "bg-sky-50 text-sky-800", verified: "bg-amber-50 text-amber-800",
  approved: "bg-mint text-forest", returned: "bg-orange/10 text-orange", rejected: "bg-red-50 text-red-700",
};
const NEXT_ACTIONS: Record<OpsDistributionPlanStatus, WorkflowAction[]> = {
  draft: [{ value: "submitted", label: "Soumettre", tone: "primary" }],
  submitted: [{ value: "verified", label: "Verifier", tone: "primary" }],
  verified: [
    { value: "approved", label: "Approuver", tone: "primary" },
    { value: "returned", label: "Retourner", tone: "ghost", requireNote: true },
    { value: "rejected", label: "Rejeter", tone: "danger", requireNote: true },
  ],
  returned: [{ value: "submitted", label: "Re-soumettre", tone: "primary" }],
  approved: [],
  rejected: [],
};

export default function DistributionPlanManager({ operationId, initial, sites, products, staff = [] }: {
  operationId: string; initial: OpsDistributionPlan[]; sites: OpsSite[]; products: OpsProduct[]; staff?: PPMResource[];
}) {
  const { en } = usePpmLocale();
  const [rows, setRows] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [detailFor, setDetailFor] = useState<OpsDistributionPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function createPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = { operation_id: operationId, period_start: String(form.get("period_start") || ""), period_end: String(form.get("period_end") || ""), status: "draft" as const };
    if (!payload.period_start || !payload.period_end) { setSaving(false); setMessage(en ? "Start and end dates are required." : "Les dates de debut et de fin sont obligatoires."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const orgCode = await getOrgCodeForOperation(supabase, operationId);
    const result = await withUniqueRegistryCode<OpsDistributionPlan>(
      async code => await supabase.from("ppm_ops_distribution_plans").insert({ ...payload, code, created_by: user?.id }).select("*").single(),
      () => generateRegistryCode(orgCode, "distribution_plan"),
    );
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    const created = result.data as OpsDistributionPlan;
    await supabase.from("ppm_history").insert({ entity_type: "distribution_plan", entity_id: created.id, actor_id: user?.id, action: "Plan de distribution cree", to_status: created.status });
    setRows(current => [created, ...current]);
    setCreating(false);
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">{en ? "Distribution plan" : "Plan de distribution"}</h2><button onClick={() => setCreating(true)} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New plan" : "Nouveau plan"}</button></div>
    <div className="grid gap-3">
      {rows.map(row => <article key={row.id} className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><span className="mr-2 rounded-full bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-500">{row.code}</span><b className="text-forest">{new Date(row.period_start).toLocaleDateString(en ? "en-US" : "fr-FR")} → {new Date(row.period_end).toLocaleDateString(en ? "en-US" : "fr-FR")}</b></div>
          <EntityStatusBadge status={row.status === "returned" || row.status === "rejected" || row.status === "submitted" || row.status === "verified" ? "on_hold" : row.status === "approved" ? "active" : "draft"} />
        </div>
        <button onClick={() => setDetailFor(row)} className="btn-secondary mt-3 px-3 py-1.5 text-xs">{en ? "Open plan" : "Ouvrir le plan"}</button>
      </article>)}
      {!rows.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">{en ? "No plan created yet." : "Aucun plan cree pour le moment."}</p>}
    </div>

    {creating && <div className="fixed inset-0 z-[150] overflow-y-auto bg-forest/90 p-4">
      <form onSubmit={createPlan} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{en ? "New plan" : "Nouveau plan"}</h2><button type="button" onClick={() => setCreating(false)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold">{en ? "Start date" : "Date de debut"}<input name="period_start" type="date" required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "End date" : "Date de fin"}<input name="period_end" type="date" required className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setCreating(false)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Creating..." : "Creation...") : (en ? "Create" : "Creer")}</button></div>
        </div>
      </form>
    </div>}

    {detailFor && <PlanDetailPanel
      plan={detailFor} sites={sites} products={products} staff={staff}
      onStatusChanged={updated => setRows(current => current.map(row => row.id === updated.id ? updated : row))}
      onClose={() => setDetailFor(null)}
    />}
  </div>;
}

function PlanDetailPanel({ plan, sites, products, staff, onStatusChanged, onClose }: {
  plan: OpsDistributionPlan; sites: OpsSite[]; products: OpsProduct[]; staff: PPMResource[];
  onStatusChanged: (updated: OpsDistributionPlan) => void; onClose: () => void;
}) {
  const { en } = usePpmLocale();
  const [status, setStatus] = useState(plan.status);
  const [planSites, setPlanSites] = useState<OpsDistributionPlanSite[]>([]);
  const [planProducts, setPlanProducts] = useState<Record<string, OpsDistributionPlanProduct[]>>({});
  const [history, setHistory] = useState<AuditLogEntry[]>([]);
  const [addingSite, setAddingSite] = useState(false);
  const [addingProductFor, setAddingProductFor] = useState<OpsDistributionPlanSite | null>(null);
  const [downloading, setDownloading] = useState(false);
  const siteName = (id: string) => sites.find(item => item.id === id)?.name || "—";
  const productName = (id: string) => products.find(item => item.id === id)?.name || "—";

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("ppm_ops_distribution_plan_sites").select("*").eq("plan_id", plan.id),
      supabase.from("ppm_history").select("*").eq("entity_type", "distribution_plan").eq("entity_id", plan.id).order("created_at", { ascending: false }).limit(100),
    ]).then(async ([sitesResult, historyResult]) => {
      const loadedSites = (sitesResult.data || []) as OpsDistributionPlanSite[];
      setPlanSites(loadedSites);
      setHistory((historyResult.data || []) as AuditLogEntry[]);
      if (loadedSites.length) {
        const productsResult = await supabase.from("ppm_ops_distribution_plan_products").select("*").in("plan_site_id", loadedSites.map(item => item.id));
        const grouped: Record<string, OpsDistributionPlanProduct[]> = {};
        for (const row of (productsResult.data || []) as OpsDistributionPlanProduct[]) { (grouped[row.plan_site_id] ||= []).push(row); }
        setPlanProducts(grouped);
      }
    });
  }, [plan.id]);

  async function addSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      plan_id: plan.id,
      site_id: String(form.get("site_id") || ""),
      target_beneficiaries: Number(form.get("target_beneficiaries") || 0),
      ration_days: Number(form.get("ration_days") || 0),
      period_start: String(form.get("period_start") || ""),
      period_end: String(form.get("period_end") || ""),
      distribution_start: String(form.get("distribution_start") || "") || null,
      distribution_end: String(form.get("distribution_end") || "") || null,
    };
    if (!payload.site_id || !payload.period_start || !payload.period_end) return;
    const result = await createClient().from("ppm_ops_distribution_plan_sites").insert(payload).select("*").single();
    if (!result.error) { setPlanSites(current => [...current, result.data as OpsDistributionPlanSite]); setAddingSite(false); }
  }

  async function removeSite(id: string) {
    const result = await createClient().from("ppm_ops_distribution_plan_sites").delete().eq("id", id);
    if (!result.error) setPlanSites(current => current.filter(item => item.id !== id));
  }

  async function addProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!addingProductFor) return;
    const form = new FormData(event.currentTarget);
    const payload = {
      plan_site_id: addingProductFor.id,
      product_id: String(form.get("product_id") || ""),
      quantity_needed: Number(form.get("quantity_needed") || 0),
      unit: String(form.get("unit") || "kg").trim() || "kg",
    };
    if (!payload.product_id) return;
    const result = await createClient().from("ppm_ops_distribution_plan_products").insert(payload).select("*").single();
    if (!result.error) {
      setPlanProducts(current => ({ ...current, [addingProductFor.id]: [...(current[addingProductFor.id] || []), result.data as OpsDistributionPlanProduct] }));
      setAddingProductFor(null);
    }
  }

  async function downloadPdf() {
    setDownloading(true);
    const response = await fetch("/api/ppm/operations/plans/export-pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan_id: plan.id }) });
    setDownloading(false);
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `plan-${plan.code}.pdf`; link.click();
    URL.revokeObjectURL(url);
  }

  const historyEntries: WorkflowHistoryEntry[] = history.map(item => ({ status: item.to_status || item.action, at: item.created_at, note: item.note }));

  return <div className="fixed inset-0 z-[150] overflow-y-auto bg-forest/90 p-4">
    <div className="mx-auto my-10 max-w-3xl rounded-[30px] bg-white p-7 shadow-2xl">
      <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{en ? "Plan" : "Plan"} {plan.code}</h2><button type="button" onClick={onClose} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <WorkflowStatusActions
          entityLabel={en ? "Plan" : "Plan"} itemTitle={plan.code} status={status}
          statusLabels={statusLabels} statusTones={statusTones} actions={NEXT_ACTIONS[status]} staff={staff}
          history={historyEntries}
          onConfirm={async ({ nextStatus, reviewedByName, note }) => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            const result = await supabase.from("ppm_ops_distribution_plans").update({ status: nextStatus }).eq("id", plan.id).select("*").single();
            if (result.error) return { error: result.error.message };
            const updated = result.data as OpsDistributionPlan;
            await supabase.from("ppm_history").insert({ entity_type: "distribution_plan", entity_id: plan.id, actor_id: user?.id, action: `Plan ${statusLabels[nextStatus as OpsDistributionPlanStatus].toLowerCase()}${reviewedByName ? ` par ${reviewedByName}` : ""}`, from_status: status, to_status: nextStatus, note: note || undefined });
            setStatus(updated.status);
            onStatusChanged(updated);
            setHistory(current => [{ id: crypto.randomUUID(), entity_type: "distribution_plan", entity_id: plan.id, action: nextStatus, to_status: nextStatus, from_status: status, note: note || undefined, created_at: new Date().toISOString() }, ...current]);
          }}
        />
        <button onClick={downloadPdf} disabled={downloading} className="btn-secondary px-3 py-2 text-xs"><ArrowDownTrayIcon className="mr-1 inline h-4" />{downloading ? (en ? "Preparing..." : "Preparation...") : (en ? "Download PDF" : "Telecharger le PDF")}</button>
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">{en ? "Site" : "Site"}</th><th className="p-3">{en ? "Target BNF" : "BNF cible"}</th><th className="p-3">{en ? "Ration days" : "Jours de ration"}</th><th className="p-3">{en ? "Period" : "Periode"}</th><th className="p-3">{en ? "Products" : "Produits"}</th><th className="p-3"></th></tr></thead>
          <tbody>
            {planSites.map(row => <tr key={row.id} className="border-t align-top">
              <td className="p-3"><b className="text-forest">{siteName(row.site_id)}</b></td>
              <td className="p-3">{row.target_beneficiaries}</td>
              <td className="p-3">{row.ration_days}</td>
              <td className="p-3">{new Date(row.period_start).toLocaleDateString(en ? "en-US" : "fr-FR")} → {new Date(row.period_end).toLocaleDateString(en ? "en-US" : "fr-FR")}</td>
              <td className="p-3">
                <div className="grid gap-1">{(planProducts[row.id] || []).map(item => <span key={item.id} className="text-xs">{productName(item.product_id)} : {item.quantity_needed} {item.unit}</span>)}</div>
                <button onClick={() => setAddingProductFor(row)} className="mt-1 text-xs font-bold text-leaf underline">+ {en ? "product" : "produit"}</button>
              </td>
              <td className="p-3"><button onClick={() => removeSite(row.id)} aria-label={en ? "Remove" : "Retirer"}><TrashIcon className="h-4 text-red-600" /></button></td>
            </tr>)}
            {!planSites.length && <tr><td colSpan={6} className="p-8 text-center text-slate-400">{en ? "No site added yet." : "Aucun site ajoute pour le moment."}</td></tr>}
          </tbody>
        </table>
      </div>
      <button onClick={() => setAddingSite(true)} className="btn-secondary mt-3 px-4 py-2 text-sm"><PlusIcon className="mr-2 inline h-4" />{en ? "Add a site" : "Ajouter un site"}</button>
    </div>

    {addingSite && <div className="fixed inset-0 z-[160] overflow-y-auto bg-forest/90 p-4">
      <form onSubmit={addSite} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{en ? "Add a site" : "Ajouter un site"}</h2><button type="button" onClick={() => setAddingSite(false)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">{en ? "Site" : "Site"}<select name="site_id" required className="admin-input"><option value="">{en ? "Select..." : "Selectionner..."}</option>{sites.filter(item => !planSites.some(ps => ps.site_id === item.id)).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-2 text-sm font-bold">{en ? "Target beneficiaries" : "BNF cible"}<input name="target_beneficiaries" type="number" min="0" required className="admin-input" /></label>
            <label className="grid gap-2 text-sm font-bold">{en ? "Ration days" : "Jours de ration"}<input name="ration_days" type="number" min="0" required className="admin-input" /></label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-2 text-sm font-bold">{en ? "Period start" : "Debut periode"}<input name="period_start" type="date" required className="admin-input" /></label>
            <label className="grid gap-2 text-sm font-bold">{en ? "Period end" : "Fin periode"}<input name="period_end" type="date" required className="admin-input" /></label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-2 text-sm font-bold">{en ? "Distribution start" : "Debut distribution"}<input name="distribution_start" type="date" className="admin-input" /></label>
            <label className="grid gap-2 text-sm font-bold">{en ? "Distribution end" : "Fin distribution"}<input name="distribution_end" type="date" className="admin-input" /></label>
          </div>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setAddingSite(false)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button className="btn-primary">{en ? "Add" : "Ajouter"}</button></div>
        </div>
      </form>
    </div>}

    {addingProductFor && <div className="fixed inset-0 z-[160] overflow-y-auto bg-forest/90 p-4">
      <form onSubmit={addProduct} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{en ? "Product need" : "Besoin en produit"} — {siteName(addingProductFor.site_id)}</h2><button type="button" onClick={() => setAddingProductFor(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">{en ? "Product" : "Produit"}<select name="product_id" required className="admin-input"><option value="">{en ? "Select..." : "Selectionner..."}</option>{products.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-2 text-sm font-bold">{en ? "Quantity needed" : "Quantite necessaire"}<input name="quantity_needed" type="number" min="0" step="0.0001" required className="admin-input" /></label>
            <label className="grid gap-2 text-sm font-bold">{en ? "Unit" : "Unite"}<input name="unit" defaultValue="kg" className="admin-input" /></label>
          </div>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setAddingProductFor(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button className="btn-primary">{en ? "Add" : "Ajouter"}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
