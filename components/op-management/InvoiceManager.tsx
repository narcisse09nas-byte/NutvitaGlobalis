"use client";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowDownTrayIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import WorkflowStatusActions, { type WorkflowAction, type WorkflowHistoryEntry } from "@/components/op-management/WorkflowStatusActions";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import { amountInWordsFr } from "@/lib/ppm/amount-in-words";
import { generateInvoiceNumber } from "@/lib/ppm/ops-ids";
import { notifyOpsPartnersForCooperative, notifyOpsPartnersForSite } from "@/lib/ppm/ops-notify-partners";
import type {
  AuditLogEntry, OpsCooperative, OpsDeliveryLine, OpsDeliveryNote, OpsIngredientPrice, OpsInvoice,
  OpsInvoiceStatus, OpsSite, OpsSitePaymentAccount, OpsSitePaymentAccountType, PPMResource,
} from "@/lib/ppm/types";

const statusLabels: Record<OpsInvoiceStatus, string> = {
  draft: "Brouillon", submitted: "Soumise", distribution_manager_endorsed: "Validee (resp. distribution)",
  school_endorsed: "Endossee (ecole)", in_synthesis: "Dans le fichier de synthese", paid_to_school: "Payee a l'ecole",
  paid_to_cooperative: "Payee a la cooperative", rejected: "Rejetee",
};
const statusTones: Record<OpsInvoiceStatus, string> = {
  draft: "bg-slate-100 text-slate-600", submitted: "bg-sky-50 text-sky-800", distribution_manager_endorsed: "bg-amber-50 text-amber-800",
  school_endorsed: "bg-mint text-forest", in_synthesis: "bg-mint text-forest", paid_to_school: "bg-mint text-forest",
  paid_to_cooperative: "bg-mint text-forest", rejected: "bg-red-50 text-red-700",
};
const NEXT_ACTIONS: Record<OpsInvoiceStatus, WorkflowAction[]> = {
  draft: [{ value: "submitted", label: "Soumettre", tone: "primary" }],
  submitted: [
    { value: "distribution_manager_endorsed", label: "Valider (responsable distribution)", tone: "primary" },
    { value: "rejected", label: "Rejeter", tone: "danger", requireNote: true },
  ],
  distribution_manager_endorsed: [{ value: "school_endorsed", label: "Endosser (au nom de l'ecole)", tone: "primary" }],
  school_endorsed: [{ value: "in_synthesis", label: "Inclure dans le fichier de synthese", tone: "primary" }],
  in_synthesis: [], paid_to_school: [], paid_to_cooperative: [], rejected: [],
};

export default function InvoiceManager({ operationId, initial, deliveries, sites, cooperatives, ingredientPrices, currency, staff = [] }: {
  operationId: string; initial: OpsInvoice[]; deliveries: OpsDeliveryNote[]; sites: OpsSite[]; cooperatives: OpsCooperative[]; ingredientPrices: OpsIngredientPrice[]; currency: string; staff?: PPMResource[];
}) {
  const { en } = usePpmLocale();
  const [rows, setRows] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [detailFor, setDetailFor] = useState<OpsInvoice | null>(null);
  const siteName = (id: string) => sites.find(item => item.id === id)?.name || "—";
  const approvedDeliveries = deliveries.filter(item => item.status === "approved" && !initial.some(invoice => invoice.delivery_note_id === item.id_pk));

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">{en ? "Invoices" : "Factures"}</h2><button onClick={() => setCreating(true)} disabled={!approvedDeliveries.length} className="btn-primary px-4 py-2 text-sm disabled:opacity-40"><PlusIcon className="mr-2 h-4" />{en ? "New invoice" : "Nouvelle facture"}</button></div>
    {!approvedDeliveries.length && <p className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900">{en ? "An invoice needs an approved delivery without an invoice yet." : "Une facture necessite une livraison approuvee sans facture existante."}</p>}
    <div className="grid gap-3">
      {rows.map(row => <article key={row.id} className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><span className="mr-2 rounded-full bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-500">{row.id}</span><b className="text-forest">{siteName(row.site_id)}</b><p className="mt-1 text-xs text-slate-400">{row.amount_figures.toLocaleString(en ? "en-US" : "fr-FR")} {row.currency}</p></div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTones[row.status]}`}>{statusLabels[row.status]}</span>
        </div>
        <button onClick={() => setDetailFor(row)} className="btn-secondary mt-3 px-3 py-1.5 text-xs">{en ? "Open" : "Ouvrir"}</button>
      </article>)}
      {!rows.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">{en ? "No invoice generated yet." : "Aucune facture generee pour le moment."}</p>}
    </div>

    {creating && <CreateInvoiceModal operationId={operationId} deliveries={approvedDeliveries} sites={sites} cooperatives={cooperatives} ingredientPrices={ingredientPrices} currency={currency} onClose={() => setCreating(false)} onCreated={created => { setRows(current => [created, ...current]); setCreating(false); }} />}

    {detailFor && <InvoiceDetailPanel invoice={detailFor} sites={sites} cooperatives={cooperatives} staff={staff} onStatusChanged={updated => setRows(current => current.map(row => row.id === updated.id ? updated : row))} onClose={() => setDetailFor(null)} />}
  </div>;
}

function CreateInvoiceModal({ operationId, deliveries, sites, cooperatives, ingredientPrices, currency, onClose, onCreated }: {
  operationId: string; deliveries: OpsDeliveryNote[]; sites: OpsSite[]; cooperatives: OpsCooperative[]; ingredientPrices: OpsIngredientPrice[]; currency: string;
  onClose: () => void; onCreated: (invoice: OpsInvoice) => void;
}) {
  const { en } = usePpmLocale();
  const [deliveryId, setDeliveryId] = useState("");
  const [lines, setLines] = useState<OpsDeliveryLine[]>([]);
  const [costPerTonne, setCostPerTonne] = useState("");
  const [paymentAccounts, setPaymentAccounts] = useState<OpsSitePaymentAccount[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const delivery = deliveries.find(item => item.id_pk === deliveryId);
  const site = delivery ? sites.find(item => item.id === delivery.site_id) : undefined;
  const isSfHgsf = !!delivery?.po_id;
  const cooperative = isSfHgsf && site?.cooperative_id ? cooperatives.find(item => item.id === site.cooperative_id) : undefined;

  useEffect(() => {
    if (!deliveryId) { setLines([]); return; }
    createClient().from("ppm_ops_delivery_lines").select("*").eq("delivery_note_id", deliveryId).then(result => setLines((result.data || []) as OpsDeliveryLine[]));
  }, [deliveryId]);

  useEffect(() => {
    if (!site) { setPaymentAccounts([]); return; }
    createClient().from("ppm_ops_site_payment_accounts").select("*").eq("site_id", site.id).order("is_default", { ascending: false }).then(result => setPaymentAccounts((result.data || []) as OpsSitePaymentAccount[]));
  }, [site?.id]);

  const totalTonnage = lines.reduce((sum, line) => sum + (line.quantity_received || 0), 0);
  const sfAmount = lines.reduce((sum, line) => {
    const price = ingredientPrices.find(item => item.product_id === line.product_id);
    return sum + (line.quantity_received || 0) * (price?.unit_price || 0);
  }, 0);
  const nonSfAmount = totalTonnage * Number(costPerTonne || 0);
  const amountFigures = isSfHgsf ? sfAmount : nonSfAmount;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!delivery || !site) { setMessage(en ? "Select the source delivery." : "Selectionnez la livraison source."); return; }
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      delivery_note_id: delivery.id_pk,
      site_id: site.id,
      cooperative_id: cooperative?.id || null,
      is_sf_hgsf: isSfHgsf,
      cost_per_tonne: isSfHgsf ? null : Number(costPerTonne || 0),
      total_tonnage: totalTonnage,
      amount_figures: amountFigures,
      amount_words: amountInWordsFr(amountFigures, currency),
      currency,
      payment_account_type: String(form.get("payment_account_type") || "") as OpsSitePaymentAccountType || null,
      payment_account_number: String(form.get("payment_account_number") || "").trim() || null,
      payment_account_name: String(form.get("payment_account_name") || "").trim() || null,
      status: "draft" as const,
      created_by: user?.id,
    };

    const invoiceNumber = await generateInvoiceNumber(supabase, site.id, site.short_initials);
    const result = await supabase.from("ppm_ops_invoices").insert({ ...payload, id: invoiceNumber }).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    const created = result.data as OpsInvoice;
    await supabase.from("ppm_history").insert({ entity_type: "invoice", entity_id: created.id, actor_id: user?.id, action: "Facture creee", to_status: created.status });
    onCreated(created);
  }

  return <div className="fixed inset-0 z-[150] overflow-y-auto bg-forest/90 p-4">
    <form onSubmit={submit} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
      <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{en ? "New invoice" : "Nouvelle facture"}</h2><button type="button" onClick={onClose} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
      <div className="mt-5 grid gap-4">
        <label className="grid gap-2 text-sm font-bold">{en ? "Source delivery (approved)" : "Livraison source (approuvee)"}<select value={deliveryId} onChange={event => setDeliveryId(event.target.value)} required className="admin-input"><option value="">{en ? "Select..." : "Selectionner..."}</option>{deliveries.map(item => <option key={item.id_pk} value={item.id_pk}>{item.code} — {sites.find(s => s.id === item.site_id)?.name}</option>)}</select></label>
        {delivery && <p className="text-xs text-slate-500">{en ? "Total tonnage delivered" : "Tonnage total livre"} : <b>{totalTonnage}</b>{cooperative && <> · {en ? "Cooperative" : "Cooperative"} : <b>{cooperative.name}</b></>}</p>}
        {!isSfHgsf && delivery && <label className="grid gap-2 text-sm font-bold">{en ? "Cost per tonne" : "Cout a la tonne"}<input value={costPerTonne} onChange={event => setCostPerTonne(event.target.value)} type="number" min="0" step="0.01" className="admin-input" /></label>}
        {delivery && <p className="rounded-xl bg-mint/30 p-3 text-sm font-bold text-forest">{en ? "Computed amount" : "Montant calcule"} : {amountFigures.toLocaleString(en ? "en-US" : "fr-FR")} {currency}</p>}
        <label className="grid gap-2 text-sm font-bold">{en ? "Payment account type" : "Type de compte de paiement"}<select name="payment_account_type" defaultValue={paymentAccounts[0]?.account_type || ""} className="admin-input"><option value="">—</option><option value="mobile_money">Mobile money</option><option value="bank">{en ? "Bank" : "Banque"}</option><option value="other">{en ? "Other" : "Autre"}</option></select></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Account holder" : "Titulaire du compte"}<input name="payment_account_name" defaultValue={paymentAccounts[0]?.account_name || ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Account number" : "Numero de compte"}<input name="payment_account_number" defaultValue={paymentAccounts[0]?.account_number || ""} className="admin-input" /></label>
        {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
        <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Creating..." : "Creation...") : (en ? "Create" : "Creer")}</button></div>
      </div>
    </form>
  </div>;
}

function InvoiceDetailPanel({ invoice, sites, cooperatives, staff, onStatusChanged, onClose }: {
  invoice: OpsInvoice; sites: OpsSite[]; cooperatives: OpsCooperative[]; staff: PPMResource[]; onStatusChanged: (updated: OpsInvoice) => void; onClose: () => void;
}) {
  const { en } = usePpmLocale();
  const [status, setStatus] = useState(invoice.status);
  const [history, setHistory] = useState<AuditLogEntry[]>([]);
  const [downloading, setDownloading] = useState(false);
  const site = sites.find(item => item.id === invoice.site_id);
  const cooperative = invoice.cooperative_id ? cooperatives.find(item => item.id === invoice.cooperative_id) : undefined;

  useEffect(() => {
    createClient().from("ppm_history").select("*").eq("entity_type", "invoice").eq("entity_id", invoice.id).order("created_at", { ascending: false }).limit(100)
      .then(result => setHistory((result.data || []) as AuditLogEntry[]));
  }, [invoice.id]);

  async function downloadPdf() {
    setDownloading(true);
    const response = await fetch("/api/ppm/operations/invoices/export-pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoice_id: invoice.id }) });
    setDownloading(false);
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `facture-${invoice.id.replace(/[/ °]/g, "-")}.pdf`; link.click();
    URL.revokeObjectURL(url);
  }

  const historyEntries: WorkflowHistoryEntry[] = history.map(item => ({ status: item.to_status || item.action, at: item.created_at, note: item.note }));

  return <div className="fixed inset-0 z-[150] overflow-y-auto bg-forest/90 p-4">
    <div className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
      <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{invoice.id}</h2><button type="button" onClick={onClose} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
      <p className="mt-2 text-sm text-slate-500">{site?.name}{cooperative ? ` — ${cooperative.name}` : ""}</p>
      <p className="mt-3 rounded-xl bg-mint/30 p-3 text-sm font-bold text-forest">{invoice.amount_figures.toLocaleString(en ? "en-US" : "fr-FR")} {invoice.currency}<br /><span className="font-normal italic text-slate-600">{invoice.amount_words}</span></p>
      {invoice.payment_account_number && <p className="mt-2 text-sm text-slate-500">{en ? "Payment account" : "Compte de paiement"} : {invoice.payment_account_name} — {invoice.payment_account_number}</p>}

      <div className="mt-4">
        <WorkflowStatusActions
          entityLabel={en ? "Invoice" : "Facture"} itemTitle={invoice.id} status={status}
          statusLabels={statusLabels} statusTones={statusTones} actions={NEXT_ACTIONS[status]} staff={staff}
          history={historyEntries}
          onConfirm={async ({ nextStatus, reviewedByName, note }) => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            const result = await supabase.from("ppm_ops_invoices").update({ status: nextStatus }).eq("id", invoice.id).select("*").single();
            if (result.error) return { error: result.error.message };
            const updated = result.data as OpsInvoice;
            await supabase.from("ppm_history").insert({ entity_type: "invoice", entity_id: invoice.id, actor_id: user?.id, action: `Facture ${statusLabels[nextStatus as OpsInvoiceStatus].toLowerCase()}${reviewedByName ? ` par ${reviewedByName}` : ""}`, from_status: status, to_status: nextStatus, note: note || undefined });
            setStatus(updated.status);
            onStatusChanged(updated);
            setHistory(current => [{ id: crypto.randomUUID(), entity_type: "invoice", entity_id: invoice.id, action: nextStatus, to_status: nextStatus, from_status: status, note: note || undefined, created_at: new Date().toISOString() }, ...current]);

            // The school (COGES) and the cooperative each only see this from /partenaire-distribution.
            if (nextStatus === "distribution_manager_endorsed") {
              await notifyOpsPartnersForSite(invoice.site_id, "coges", {
                titleFr: "Facture a endosser", titleEn: "Invoice awaiting endorsement",
                messageFr: `La facture ${invoice.id} est validee par le responsable distribution et attend l'endossement de l'ecole.`,
                messageEn: `Invoice ${invoice.id} was validated by the distribution manager and is awaiting the school's endorsement.`,
                link: `/partenaire-distribution/factures/${invoice.id}`,
              });
            } else if (nextStatus === "school_endorsed" && invoice.cooperative_id) {
              await notifyOpsPartnersForCooperative(invoice.cooperative_id, {
                titleFr: "Facture endossee", titleEn: "Invoice endorsed",
                messageFr: `La facture ${invoice.id} est endossee par l'ecole et sera incluse dans la prochaine synthese.`,
                messageEn: `Invoice ${invoice.id} was endorsed by the school and will be included in the next synthesis.`,
                link: `/partenaire-distribution/factures/${invoice.id}`,
              });
            }
          }}
        />
      </div>
      <button onClick={downloadPdf} disabled={downloading} className="btn-secondary mt-3 px-3 py-2 text-xs"><ArrowDownTrayIcon className="mr-1 inline h-4" />{downloading ? (en ? "Preparing..." : "Preparation...") : (en ? "Download PDF" : "Telecharger le PDF")}</button>
    </div>
  </div>;
}
