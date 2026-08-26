"use client";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowDownTrayIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import WorkflowStatusActions, { type WorkflowAction, type WorkflowHistoryEntry } from "@/components/op-management/WorkflowStatusActions";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import { amountInWordsFr } from "@/lib/ppm/amount-in-words";
import { generateRegistryCode, getOrgCodeForOperation, withUniqueRegistryCode } from "@/lib/ppm/ids";
import type {
  AuditLogEntry, OpsActivityBeneficiary, OpsActivityReport, OpsActivityReportProduct, OpsActivityReportStatus,
  OpsAgeGroup, OpsDeliveryLine, OpsDeliveryNote, OpsProduct, OpsSite, PPMResource,
} from "@/lib/ppm/types";

const statusLabels: Record<OpsActivityReportStatus, string> = {
  draft: "Brouillon", submitted: "Soumis", verified: "Verifie", approved: "Approuve", returned: "Retourne", rejected: "Rejete",
};
const statusTones: Record<OpsActivityReportStatus, string> = {
  draft: "bg-slate-100 text-slate-600", submitted: "bg-sky-50 text-sky-800", verified: "bg-amber-50 text-amber-800",
  approved: "bg-mint text-forest", returned: "bg-orange/10 text-orange", rejected: "bg-red-50 text-red-700",
};
const NEXT_ACTIONS: Record<OpsActivityReportStatus, WorkflowAction[]> = {
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

export default function ActivityReportManager({ operationId, initial, deliveries, sites, products, ageGroups, staff = [] }: {
  operationId: string; initial: OpsActivityReport[]; deliveries: OpsDeliveryNote[]; sites: OpsSite[]; products: OpsProduct[]; ageGroups: OpsAgeGroup[]; staff?: PPMResource[];
}) {
  const { en } = usePpmLocale();
  const [rows, setRows] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [detailFor, setDetailFor] = useState<OpsActivityReport | null>(null);
  const siteName = (id: string) => sites.find(item => item.id === id)?.name || "—";
  const approvedDeliveries = deliveries.filter(item => item.status === "approved");

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">{en ? "Distribution activity reports" : "Rapports d'activite de distribution"}</h2><button onClick={() => setCreating(true)} disabled={!approvedDeliveries.length} className="btn-primary px-4 py-2 text-sm disabled:opacity-40"><PlusIcon className="mr-2 h-4" />{en ? "New report" : "Nouveau rapport"}</button></div>
    {!approvedDeliveries.length && <p className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900">{en ? "A report needs at least one approved delivery to be based on." : "Un rapport necessite au moins une livraison approuvee sur laquelle se baser."}</p>}
    <div className="grid gap-3">
      {rows.map(row => <article key={row.id_pk} className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><span className="mr-2 rounded-full bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-500">{row.id}</span><b className="text-forest">{siteName(row.site_id)}</b><p className="mt-1 text-xs text-slate-400">{new Date(row.period_start).toLocaleDateString(en ? "en-US" : "fr-FR")} → {new Date(row.period_end).toLocaleDateString(en ? "en-US" : "fr-FR")}</p></div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTones[row.status]}`}>{statusLabels[row.status]}</span>
        </div>
        <button onClick={() => setDetailFor(row)} className="btn-secondary mt-3 px-3 py-1.5 text-xs">{en ? "Open" : "Ouvrir"}</button>
      </article>)}
      {!rows.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">{en ? "No report created yet." : "Aucun rapport cree pour le moment."}</p>}
    </div>

    {creating && <CreateReportModal operationId={operationId} deliveries={approvedDeliveries} sites={sites} onClose={() => setCreating(false)} onCreated={created => { setRows(current => [created, ...current]); setCreating(false); }} />}

    {detailFor && <ReportDetailPanel report={detailFor} sites={sites} products={products} ageGroups={ageGroups} staff={staff} onStatusChanged={updated => setRows(current => current.map(row => row.id_pk === updated.id_pk ? updated : row))} onClose={() => setDetailFor(null)} />}
  </div>;
}

function CreateReportModal({ operationId, deliveries, sites, onClose, onCreated }: {
  operationId: string; deliveries: OpsDeliveryNote[]; sites: OpsSite[]; onClose: () => void; onCreated: (report: OpsActivityReport) => void;
}) {
  const { en } = usePpmLocale();
  const [deliveryId, setDeliveryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const delivery = deliveries.find(item => item.id_pk === deliveryId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!delivery) { setMessage(en ? "Select the source delivery." : "Selectionnez la livraison source."); return; }
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      site_id: delivery.site_id,
      delivery_note_id: delivery.id_pk,
      period_start: String(form.get("period_start") || ""),
      period_end: String(form.get("period_end") || ""),
      effective_distribution_start: String(form.get("effective_distribution_start") || "") || null,
      effective_distribution_end: String(form.get("effective_distribution_end") || "") || null,
      ration_days_provided: form.get("ration_days_provided") ? Number(form.get("ration_days_provided")) : null,
      status: "draft" as const,
    };
    if (!payload.period_start || !payload.period_end) { setSaving(false); setMessage(en ? "Start and end dates are required." : "Les dates de debut et de fin sont obligatoires."); return; }

    const orgCode = await getOrgCodeForOperation(supabase, operationId);
    const result = await withUniqueRegistryCode<OpsActivityReport>(
      async code => await supabase.from("ppm_ops_activity_reports").insert({ ...payload, id: code, created_by: user?.id }).select("*").single(),
      () => generateRegistryCode(orgCode, "distribution_report"),
    );
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    const created = result.data as OpsActivityReport;

    // Auto-fill "produits en debut de periode" / "produits recus" from this delivery's approved
    // reception and the stock-ledger entry it generated (balance_after - received = pre-delivery
    // stock), per the spec's "a renseigner automatiquement" requirement.
    const [{ data: deliveryLines }, { data: ledgerEntry }] = await Promise.all([
      supabase.from("ppm_ops_delivery_lines").select("*").eq("delivery_note_id", delivery.id_pk),
      supabase.from("ppm_ops_site_stock_ledger").select("*").eq("reference_type", "delivery_note").eq("reference_id", delivery.id_pk),
    ]);
    const typedLines = (deliveryLines || []) as OpsDeliveryLine[];
    const ledgerByProduct = new Map((ledgerEntry || []).map((row: { product_id: string; balance_after: number; quantity: number; recorded_at: string }) => [row.product_id, row]));
    if (typedLines.length) {
      await supabase.from("ppm_ops_activity_report_products").insert(typedLines.map(line => {
        const ledger = ledgerByProduct.get(line.product_id);
        return {
          report_id: created.id_pk,
          product_id: line.product_id,
          start_qty: ledger ? ledger.balance_after - ledger.quantity : 0,
          received_qty: line.quantity_received ?? 0,
          received_date: ledger?.recorded_at?.slice(0, 10) || delivery.delivery_date,
        };
      }));
    }
    await supabase.from("ppm_history").insert({ entity_type: "activity_report", entity_id: created.id_pk, actor_id: user?.id, action: "Rapport de distribution cree", to_status: created.status });
    onCreated(created);
  }

  return <div className="fixed inset-0 z-[150] overflow-y-auto bg-forest/90 p-4">
    <form onSubmit={submit} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
      <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{en ? "New report" : "Nouveau rapport"}</h2><button type="button" onClick={onClose} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
      <div className="mt-5 grid gap-4">
        <label className="grid gap-2 text-sm font-bold">{en ? "Source delivery" : "Livraison source"}<select value={deliveryId} onChange={event => setDeliveryId(event.target.value)} required className="admin-input"><option value="">{en ? "Select..." : "Selectionner..."}</option>{deliveries.map(item => <option key={item.id_pk} value={item.id_pk}>{item.code} — {sites.find(s => s.id === item.site_id)?.name}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-4">
          <label className="grid gap-2 text-sm font-bold">{en ? "Period start" : "Debut periode"}<input name="period_start" type="date" required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Period end" : "Fin periode"}<input name="period_end" type="date" required className="admin-input" /></label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="grid gap-2 text-sm font-bold">{en ? "Effective distribution start" : "Debut effectif distribution"}<input name="effective_distribution_start" type="date" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Effective distribution end" : "Fin effective distribution"}<input name="effective_distribution_end" type="date" className="admin-input" /></label>
        </div>
        <label className="grid gap-2 text-sm font-bold">{en ? "Ration days provided" : "Jours de ration fournis"}<input name="ration_days_provided" type="number" min="0" className="admin-input" /></label>
        {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
        <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Creating..." : "Creation...") : (en ? "Create" : "Creer")}</button></div>
      </div>
    </form>
  </div>;
}

function ReportDetailPanel({ report, sites, products, ageGroups, staff, onStatusChanged, onClose }: {
  report: OpsActivityReport; sites: OpsSite[]; products: OpsProduct[]; ageGroups: OpsAgeGroup[]; staff: PPMResource[];
  onStatusChanged: (updated: OpsActivityReport) => void; onClose: () => void;
}) {
  const { en } = usePpmLocale();
  const [status, setStatus] = useState(report.status);
  const [reportProducts, setReportProducts] = useState<OpsActivityReportProduct[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<OpsActivityBeneficiary[]>([]);
  const [history, setHistory] = useState<AuditLogEntry[]>([]);
  const [amountFigures, setAmountFigures] = useState(report.amount_distributed_figures ? String(report.amount_distributed_figures) : "");
  const [amountWords, setAmountWords] = useState(report.amount_distributed_words || "");
  const [comment, setComment] = useState(report.comment || "");
  const [downloading, setDownloading] = useState(false);
  const productName = (id: string) => products.find(item => item.id === id)?.name || "—";
  const ageGroupLabel = (id: string) => ageGroups.find(item => item.id === id)?.label || "—";
  const site = sites.find(item => item.id === report.site_id);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("ppm_ops_activity_report_products").select("*").eq("report_id", report.id_pk),
      supabase.from("ppm_ops_activity_beneficiaries").select("*").eq("report_id", report.id_pk),
      supabase.from("ppm_history").select("*").eq("entity_type", "activity_report").eq("entity_id", report.id_pk).order("created_at", { ascending: false }).limit(100),
    ]).then(([productsResult, beneficiariesResult, historyResult]) => {
      setReportProducts((productsResult.data || []) as OpsActivityReportProduct[]);
      setBeneficiaries((beneficiariesResult.data || []) as OpsActivityBeneficiary[]);
      setHistory((historyResult.data || []) as AuditLogEntry[]);
    });
  }, [report.id_pk]);

  async function updateProductLine(id: string, patch: Partial<OpsActivityReportProduct>) {
    const supabase = createClient();
    const current = reportProducts.find(item => item.id === id);
    if (!current) return;
    const distributed = patch.distributed_qty ?? current.distributed_qty ?? 0;
    const damaged = patch.damaged_qty ?? current.damaged_qty ?? 0;
    const returned = patch.returned_qty ?? current.returned_qty ?? 0;
    const remaining = (current.start_qty || 0) + (current.received_qty || 0) - distributed - damaged + returned;
    const result = await supabase.from("ppm_ops_activity_report_products").update({ ...patch, remaining_qty: remaining }).eq("id", id).select("*").single();
    if (!result.error) setReportProducts(rows => rows.map(row => row.id === id ? result.data as OpsActivityReportProduct : row));
  }

  async function setBeneficiaryCount(sex: "male" | "female", ageGroupId: string, count: number) {
    const supabase = createClient();
    const existing = beneficiaries.find(item => item.sex === sex && item.age_group_id === ageGroupId);
    const result = existing
      ? await supabase.from("ppm_ops_activity_beneficiaries").update({ count }).eq("id", existing.id).select("*").single()
      : await supabase.from("ppm_ops_activity_beneficiaries").insert({ report_id: report.id_pk, sex, age_group_id: ageGroupId, count }).select("*").single();
    if (!result.error) setBeneficiaries(current => existing ? current.map(item => item.id === existing.id ? result.data as OpsActivityBeneficiary : item) : [...current, result.data as OpsActivityBeneficiary]);
  }

  async function saveAmountAndComment() {
    const supabase = createClient();
    const figures = Number(amountFigures || 0);
    const currency = report.amount_distributed_currency || "XOF";
    const words = figures ? amountInWordsFr(figures, currency) : null;
    const result = await supabase.from("ppm_ops_activity_reports").update({ amount_distributed_figures: figures || null, amount_distributed_currency: figures ? currency : null, amount_distributed_words: words, comment: comment || null }).eq("id_pk", report.id_pk).select("*").single();
    if (!result.error) { setAmountWords(words || ""); onStatusChanged(result.data as OpsActivityReport); }
  }

  async function downloadPdf() {
    setDownloading(true);
    const response = await fetch("/api/ppm/operations/activity-reports/export-pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ report_id: report.id_pk }) });
    setDownloading(false);
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `rapport-distribution-${report.id}.pdf`; link.click();
    URL.revokeObjectURL(url);
  }

  const historyEntries: WorkflowHistoryEntry[] = history.map(item => ({ status: item.to_status || item.action, at: item.created_at, note: item.note }));

  return <div className="fixed inset-0 z-[150] overflow-y-auto bg-forest/90 p-4">
    <div className="mx-auto my-10 max-w-3xl rounded-[30px] bg-white p-7 shadow-2xl">
      <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{en ? "Distribution report" : "Rapport de distribution"} {report.id}</h2><button type="button" onClick={onClose} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
      <p className="mt-2 text-sm text-slate-500">{site?.name}</p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <WorkflowStatusActions
          entityLabel={en ? "Report" : "Rapport"} itemTitle={report.id} status={status}
          statusLabels={statusLabels} statusTones={statusTones} actions={NEXT_ACTIONS[status]} staff={staff}
          history={historyEntries}
          onConfirm={async ({ nextStatus, reviewedByName, note }) => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            const result = await supabase.from("ppm_ops_activity_reports").update({ status: nextStatus }).eq("id_pk", report.id_pk).select("*").single();
            if (result.error) return { error: result.error.message };
            const updated = result.data as OpsActivityReport;
            await supabase.from("ppm_history").insert({ entity_type: "activity_report", entity_id: report.id_pk, actor_id: user?.id, action: `Rapport ${statusLabels[nextStatus as OpsActivityReportStatus].toLowerCase()}${reviewedByName ? ` par ${reviewedByName}` : ""}`, from_status: status, to_status: nextStatus, note: note || undefined });
            setStatus(updated.status);
            onStatusChanged(updated);
            setHistory(current => [{ id: crypto.randomUUID(), entity_type: "activity_report", entity_id: report.id_pk, action: nextStatus, to_status: nextStatus, from_status: status, note: note || undefined, created_at: new Date().toISOString() }, ...current]);
          }}
        />
        <button onClick={downloadPdf} disabled={downloading} className="btn-secondary px-3 py-2 text-xs"><ArrowDownTrayIcon className="mr-1 inline h-4" />{downloading ? (en ? "Preparing..." : "Preparation...") : (en ? "Download PDF" : "Telecharger le PDF")}</button>
      </div>

      <h3 className="mt-5 text-sm font-black uppercase text-slate-400">{en ? "Products" : "Produits"}</h3>
      <div className="mt-2 overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-2">{en ? "Product" : "Produit"}</th><th className="p-2">{en ? "Start" : "Debut"}</th><th className="p-2">{en ? "Received" : "Recu"}</th><th className="p-2">{en ? "Distributed" : "Distribue"}</th><th className="p-2">{en ? "Damaged" : "Endommage"}</th><th className="p-2">{en ? "Returned" : "Retourne"}</th><th className="p-2">{en ? "Remaining" : "Restant"}</th></tr></thead>
          <tbody>{reportProducts.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-2"><b>{productName(row.product_id)}</b></td>
            <td className="p-2">{row.start_qty ?? "—"}</td>
            <td className="p-2">{row.received_qty ?? "—"}</td>
            <td className="p-2"><input type="number" min="0" step="0.0001" defaultValue={row.distributed_qty ?? ""} onBlur={event => updateProductLine(row.id, { distributed_qty: Number(event.target.value || 0) })} className="admin-input w-24" /></td>
            <td className="p-2"><input type="number" min="0" step="0.0001" defaultValue={row.damaged_qty ?? ""} onBlur={event => updateProductLine(row.id, { damaged_qty: Number(event.target.value || 0) })} className="admin-input w-24" /></td>
            <td className="p-2"><input type="number" min="0" step="0.0001" defaultValue={row.returned_qty ?? ""} onBlur={event => updateProductLine(row.id, { returned_qty: Number(event.target.value || 0) })} className="admin-input w-24" /></td>
            <td className="p-2">{row.remaining_qty ?? "—"}</td>
          </tr>)}</tbody>
        </table>
      </div>

      <h3 className="mt-5 text-sm font-black uppercase text-slate-400">{en ? "Beneficiaries covered" : "BNF couverts"}</h3>
      <div className="mt-2 overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-2">{en ? "Age group" : "Groupe d'age"}</th><th className="p-2">{en ? "Male" : "Homme"}</th><th className="p-2">{en ? "Female" : "Femme"}</th></tr></thead>
          <tbody>{ageGroups.map(group => <tr key={group.id} className="border-t"><td className="p-2">{group.label}</td>
            <td className="p-2"><input type="number" min="0" defaultValue={beneficiaries.find(b => b.sex === "male" && b.age_group_id === group.id)?.count ?? ""} onBlur={event => setBeneficiaryCount("male", group.id, Number(event.target.value || 0))} className="admin-input w-24" /></td>
            <td className="p-2"><input type="number" min="0" defaultValue={beneficiaries.find(b => b.sex === "female" && b.age_group_id === group.id)?.count ?? ""} onBlur={event => setBeneficiaryCount("female", group.id, Number(event.target.value || 0))} className="admin-input w-24" /></td>
          </tr>)}</tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold">{en ? "Amount distributed (figures)" : "Montant distribue (chiffres)"}<input type="number" min="0" step="0.01" value={amountFigures} onChange={event => setAmountFigures(event.target.value)} onBlur={saveAmountAndComment} className="admin-input" /></label>
        <p className="grid gap-2 text-sm font-bold">{en ? "Amount in words" : "Montant en lettres"}<span className="admin-input bg-slate-50 italic text-slate-600">{amountWords || "—"}</span></p>
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Comment" : "Commentaire"}<textarea rows={2} value={comment} onChange={event => setComment(event.target.value)} onBlur={saveAmountAndComment} className="admin-input" /></label>
      </div>
    </div>
  </div>;
}
