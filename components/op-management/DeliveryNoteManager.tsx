"use client";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowDownTrayIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import WorkflowStatusActions, { type WorkflowAction, type WorkflowHistoryEntry } from "@/components/op-management/WorkflowStatusActions";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import { generateRegistryCode, getOrgCodeForOperation, withUniqueRegistryCode } from "@/lib/ppm/ids";
import { notifyOpsPartnersForSite } from "@/lib/ppm/ops-notify-partners";
import type {
  AuditLogEntry, OpsDeliveryGeneratedBy, OpsDeliveryLine, OpsDeliveryNote, OpsDeliveryReceiver,
  OpsDeliveryStatus, OpsNeed, OpsNeedProduct, OpsNeedSite, OpsPoIngredientLine, OpsProduct,
  OpsPurchaseOrder, OpsSite, PPMResource,
} from "@/lib/ppm/types";

const statusLabels: Record<OpsDeliveryStatus, string> = {
  draft: "Brouillon", submitted: "Expediee", received_pending: "Reception soumise", received_confirmed: "Reception confirmee",
  approved: "Approuvee", returned: "Retournee", rejected: "Rejetee",
};
const statusTones: Record<OpsDeliveryStatus, string> = {
  draft: "bg-slate-100 text-slate-600", submitted: "bg-sky-50 text-sky-800", received_pending: "bg-amber-50 text-amber-800",
  received_confirmed: "bg-amber-50 text-amber-800", approved: "bg-mint text-forest", returned: "bg-orange/10 text-orange", rejected: "bg-red-50 text-red-700",
};
const NEXT_ACTIONS: Record<OpsDeliveryStatus, WorkflowAction[]> = {
  draft: [{ value: "submitted", label: "Expedier", tone: "primary" }],
  submitted: [], // handled via the dedicated "Record reception" form, not a plain status click
  received_pending: [
    { value: "approved", label: "Approuver la reception", tone: "primary" },
    { value: "returned", label: "Retourner", tone: "ghost", requireNote: true },
    { value: "rejected", label: "Rejeter", tone: "danger", requireNote: true },
  ],
  received_confirmed: [],
  returned: [{ value: "submitted", label: "Re-expedier", tone: "primary" }],
  approved: [],
  rejected: [],
};

export default function DeliveryNoteManager({ operationId, initial, needs, pos, sites, products, isSfHgsf, staff = [] }: {
  operationId: string; initial: OpsDeliveryNote[]; needs: OpsNeed[]; pos: OpsPurchaseOrder[]; sites: OpsSite[]; products: OpsProduct[]; isSfHgsf: boolean; staff?: PPMResource[];
}) {
  const { en } = usePpmLocale();
  const [rows, setRows] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [detailFor, setDetailFor] = useState<OpsDeliveryNote | null>(null);
  const siteName = (id: string) => sites.find(item => item.id === id)?.name || "—";

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">{en ? "Delivery notes" : "Bons de livraison"}</h2><button onClick={() => setCreating(true)} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New delivery" : "Nouvelle livraison"}</button></div>
    <div className="grid gap-3">
      {rows.map(row => <article key={row.id_pk} className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><span className="mr-2 rounded-full bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-500">{row.code}</span><b className="text-forest">{siteName(row.site_id)}</b><p className="mt-1 text-xs text-slate-400">{new Date(row.delivery_date).toLocaleDateString(en ? "en-US" : "fr-FR")} · {row.delivered_by_name}</p></div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTones[row.status]}`}>{statusLabels[row.status]}</span>
        </div>
        <button onClick={() => setDetailFor(row)} className="btn-secondary mt-3 px-3 py-1.5 text-xs">{en ? "Open" : "Ouvrir"}</button>
      </article>)}
      {!rows.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">{en ? "No delivery recorded yet." : "Aucune livraison enregistree pour le moment."}</p>}
    </div>

    {creating && <CreateDeliveryModal operationId={operationId} needs={needs} pos={pos} sites={sites} isSfHgsf={isSfHgsf} onClose={() => setCreating(false)} onCreated={created => { setRows(current => [created, ...current]); setCreating(false); }} />}

    {detailFor && <DeliveryDetailPanel delivery={detailFor} sites={sites} products={products} staff={staff} onStatusChanged={updated => setRows(current => current.map(row => row.id_pk === updated.id_pk ? updated : row))} onClose={() => setDetailFor(null)} />}
  </div>;
}

function CreateDeliveryModal({ operationId, needs, pos, sites, isSfHgsf, onClose, onCreated }: {
  operationId: string; needs: OpsNeed[]; pos: OpsPurchaseOrder[]; sites: OpsSite[]; isSfHgsf: boolean;
  onClose: () => void; onCreated: (delivery: OpsDeliveryNote) => void;
}) {
  const { en } = usePpmLocale();
  const [needId, setNeedId] = useState("");
  const [needSites, setNeedSites] = useState<OpsNeedSite[]>([]);
  const [needSiteId, setNeedSiteId] = useState("");
  const [poId, setPoId] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isSfHgsf || !needId) { setNeedSites([]); setNeedSiteId(""); return; }
    createClient().from("ppm_ops_need_sites").select("*").eq("need_id", needId).then(result => {
      const loaded = (result.data || []) as OpsNeedSite[];
      setNeedSites(loaded);
      setNeedSiteId(loaded[0]?.id || "");
    });
  }, [needId, isSfHgsf]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let siteId = "";
    let orderedLines: { product_id: string; quantity_ordered: number }[] = [];
    if (isSfHgsf) {
      const selectedPo = pos.find(item => item.id === poId);
      if (!selectedPo) { setSaving(false); setMessage(en ? "Select the parent purchase order." : "Selectionnez le bon de commande parent."); return; }
      siteId = selectedPo.site_id;
      const { data: ingredientLines } = await supabase.from("ppm_ops_po_ingredient_lines").select("*").eq("po_id", poId);
      orderedLines = ((ingredientLines || []) as OpsPoIngredientLine[]).map(item => ({ product_id: item.product_id, quantity_ordered: item.quantity_mt }));
    } else {
      const selectedNeedSite = needSites.find(item => item.id === needSiteId);
      if (!selectedNeedSite) { setSaving(false); setMessage(en ? "Select the parent need and its site." : "Selectionnez le besoin parent et son site."); return; }
      siteId = selectedNeedSite.site_id;
      const { data: needProducts } = await supabase.from("ppm_ops_need_products").select("*").eq("need_site_id", needSiteId);
      orderedLines = ((needProducts || []) as OpsNeedProduct[]).map(item => ({ product_id: item.product_id, quantity_ordered: item.quantity_needed }));
    }

    const payload = {
      site_id: siteId,
      need_id: isSfHgsf ? null : needId,
      po_id: isSfHgsf ? poId : null,
      delivery_date: String(form.get("delivery_date") || ""),
      delivered_by_name: String(form.get("delivered_by_name") || "").trim(),
      generated_by: String(form.get("generated_by") || "logistics_team") as OpsDeliveryGeneratedBy,
      status: "draft" as const,
    };
    if (!payload.delivery_date || !payload.delivered_by_name) { setSaving(false); setMessage(en ? "Delivery date and deliverer name are required." : "La date de livraison et le nom du livreur sont obligatoires."); return; }

    const orgCode = await getOrgCodeForOperation(supabase, operationId);
    const result = await withUniqueRegistryCode<OpsDeliveryNote>(
      async code => await supabase.from("ppm_ops_delivery_notes").insert({ ...payload, id: code, code, created_by: user?.id }).select("*").single(),
      () => generateRegistryCode(orgCode, "delivery_note"),
    );
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    const created = result.data as OpsDeliveryNote;
    if (orderedLines.length) await supabase.from("ppm_ops_delivery_lines").insert(orderedLines.map(line => ({ delivery_note_id: created.id_pk, product_id: line.product_id, quantity_ordered: line.quantity_ordered })));
    await supabase.from("ppm_history").insert({ entity_type: "delivery_note", entity_id: created.id_pk, actor_id: user?.id, action: "Bon de livraison cree", to_status: created.status });
    onCreated(created);
  }

  return <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
    <form onSubmit={submit} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
      <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{en ? "New delivery" : "Nouvelle livraison"}</h2><button type="button" onClick={onClose} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
      <div className="mt-5 grid gap-4">
        {isSfHgsf ? <label className="grid gap-2 text-sm font-bold">{en ? "Purchase order" : "Bon de commande"}<select value={poId} onChange={event => setPoId(event.target.value)} required className="admin-input"><option value="">{en ? "Select..." : "Selectionner..."}</option>{pos.map(item => <option key={item.id} value={item.id}>{item.id} — {sites.find(s => s.id === item.site_id)?.name}</option>)}</select></label>
        : <>
          <label className="grid gap-2 text-sm font-bold">{en ? "Need" : "Besoin"}<select value={needId} onChange={event => setNeedId(event.target.value)} required className="admin-input"><option value="">{en ? "Select..." : "Selectionner..."}</option>{needs.map(item => <option key={item.id} value={item.id}>{item.code}</option>)}</select></label>
          {needSites.length > 1 && <label className="grid gap-2 text-sm font-bold">{en ? "Site" : "Site"}<select value={needSiteId} onChange={event => setNeedSiteId(event.target.value)} className="admin-input">{needSites.map(item => <option key={item.id} value={item.id}>{sites.find(s => s.id === item.site_id)?.name}</option>)}</select></label>}
        </>}
        <label className="grid gap-2 text-sm font-bold">{en ? "Delivery date" : "Date de livraison"}<input name="delivery_date" type="date" required className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Delivered by" : "Livre par"}<input name="delivered_by_name" required className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Generated by" : "Genere par"}<select name="generated_by" defaultValue="logistics_team" className="admin-input"><option value="logistics_team">{en ? "Logistics team" : "Service logistique"}</option><option value="cooperative">{en ? "Cooperative" : "Cooperative"}</option></select></label>
        {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
        <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Creating..." : "Creation...") : (en ? "Create" : "Creer")}</button></div>
      </div>
    </form>
  </div>;
}

function DeliveryDetailPanel({ delivery, sites, products, staff, onStatusChanged, onClose }: {
  delivery: OpsDeliveryNote; sites: OpsSite[]; products: OpsProduct[]; staff: PPMResource[];
  onStatusChanged: (updated: OpsDeliveryNote) => void; onClose: () => void;
}) {
  const { en } = usePpmLocale();
  const [status, setStatus] = useState(delivery.status);
  const [lines, setLines] = useState<OpsDeliveryLine[]>([]);
  const [receivers, setReceivers] = useState<OpsDeliveryReceiver[]>([]);
  const [history, setHistory] = useState<AuditLogEntry[]>([]);
  const [receiving, setReceiving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const productName = (id: string) => products.find(item => item.id === id)?.name || "—";
  const site = sites.find(item => item.id === delivery.site_id);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("ppm_ops_delivery_lines").select("*").eq("delivery_note_id", delivery.id_pk),
      supabase.from("ppm_ops_delivery_receivers").select("*").eq("delivery_note_id", delivery.id_pk),
      supabase.from("ppm_history").select("*").eq("entity_type", "delivery_note").eq("entity_id", delivery.id_pk).order("created_at", { ascending: false }).limit(100),
    ]).then(([linesResult, receiversResult, historyResult]) => {
      setLines((linesResult.data || []) as OpsDeliveryLine[]);
      setReceivers((receiversResult.data || []) as OpsDeliveryReceiver[]);
      setHistory((historyResult.data || []) as AuditLogEntry[]);
    });
  }, [delivery.id_pk]);

  async function submitReception(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    for (const line of lines) {
      const received = Number(form.get(`received_${line.id}`) || 0);
      const rejected = Number(form.get(`rejected_${line.id}`) || 0);
      const reason = String(form.get(`reason_${line.id}`) || "").trim() || null;
      const conformity = rejected > 0 ? "non_conforme" : "conforme";
      await supabase.from("ppm_ops_delivery_lines").update({ quantity_received: received, rejected_quantity: rejected, rejection_reason: reason, conformity }).eq("id", line.id);
    }
    const receiverNames = form.getAll("receiver_name").map(String).filter(Boolean);
    if (receiverNames.length) await supabase.from("ppm_ops_delivery_receivers").insert(receiverNames.map(fullName => ({ delivery_note_id: delivery.id_pk, full_name: fullName })));

    const result = await supabase.from("ppm_ops_delivery_notes").update({ status: "received_pending" }).eq("id_pk", delivery.id_pk).select("*").single();
    if (result.error) return;
    const updated = result.data as OpsDeliveryNote;
    await supabase.from("ppm_history").insert({ entity_type: "delivery_note", entity_id: delivery.id_pk, actor_id: user?.id, action: "Reception de livraison soumise", from_status: status, to_status: "received_pending" });

    const [{ data: refreshedLines }, { data: refreshedReceivers }] = await Promise.all([
      supabase.from("ppm_ops_delivery_lines").select("*").eq("delivery_note_id", delivery.id_pk),
      supabase.from("ppm_ops_delivery_receivers").select("*").eq("delivery_note_id", delivery.id_pk),
    ]);
    setLines((refreshedLines || []) as OpsDeliveryLine[]);
    setReceivers((refreshedReceivers || []) as OpsDeliveryReceiver[]);
    setStatus(updated.status);
    onStatusChanged(updated);
    setReceiving(false);
  }

  async function downloadPdf() {
    setDownloading(true);
    const response = await fetch("/api/ppm/operations/deliveries/export-pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ delivery_id: delivery.id_pk }) });
    setDownloading(false);
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `bon-livraison-${delivery.code}.pdf`; link.click();
    URL.revokeObjectURL(url);
  }

  const historyEntries: WorkflowHistoryEntry[] = history.map(item => ({ status: item.to_status || item.action, at: item.created_at, note: item.note }));

  return <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
    <div className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
      <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{en ? "Delivery" : "Livraison"} {delivery.code}</h2><button type="button" onClick={onClose} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
      <p className="mt-2 text-sm text-slate-500">{site?.name} — {new Date(delivery.delivery_date).toLocaleDateString(en ? "en-US" : "fr-FR")}</p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <WorkflowStatusActions
          entityLabel={en ? "Delivery" : "Livraison"} itemTitle={delivery.code} status={status}
          statusLabels={statusLabels} statusTones={statusTones} actions={NEXT_ACTIONS[status]} staff={staff}
          history={historyEntries}
          onConfirm={async ({ nextStatus, reviewedByName, note }) => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            const result = await supabase.from("ppm_ops_delivery_notes").update({ status: nextStatus }).eq("id_pk", delivery.id_pk).select("*").single();
            if (result.error) return { error: result.error.message };
            const updated = result.data as OpsDeliveryNote;
            // Approving a reception feeds the site's stock ledger — this is what "stock sur
            // site" auto-fills from everywhere else in the module (Needs, Activity Reports).
            if (nextStatus === "approved") {
              for (const line of lines) {
                if (!line.quantity_received) continue;
                const { data: lastEntry } = await supabase.from("ppm_ops_site_stock_ledger").select("balance_after").eq("site_id", delivery.site_id).eq("product_id", line.product_id).order("recorded_at", { ascending: false }).limit(1).maybeSingle();
                const previousBalance = lastEntry?.balance_after || 0;
                await supabase.from("ppm_ops_site_stock_ledger").insert({
                  site_id: delivery.site_id, product_id: line.product_id, transaction_type: "received", quantity: line.quantity_received,
                  reference_type: "delivery_note", reference_id: delivery.id_pk, balance_after: previousBalance + line.quantity_received, created_by: user?.id,
                });
              }
            }
            await supabase.from("ppm_history").insert({ entity_type: "delivery_note", entity_id: delivery.id_pk, actor_id: user?.id, action: `Livraison ${statusLabels[nextStatus as OpsDeliveryStatus].toLowerCase()}${reviewedByName ? ` par ${reviewedByName}` : ""}`, from_status: status, to_status: nextStatus, note: note || undefined });
            setStatus(updated.status);
            onStatusChanged(updated);
            setHistory(current => [{ id: crypto.randomUUID(), entity_type: "delivery_note", entity_id: delivery.id_pk, action: nextStatus, to_status: nextStatus, from_status: status, note: note || undefined, created_at: new Date().toISOString() }, ...current]);

            // The school's COGES/distribution team only sees this from /partenaire-distribution —
            // let them know a delivery is on its way and needs a reception recorded.
            if (nextStatus === "submitted") {
              await notifyOpsPartnersForSite(delivery.site_id, "coges", {
                titleFr: "Livraison en route", titleEn: "Delivery on its way",
                messageFr: `La livraison ${delivery.code} est expediee — merci d'en enregistrer la reception.`,
                messageEn: `Delivery ${delivery.code} has been dispatched — please record its reception.`,
                link: `/partenaire-distribution/bons-de-livraison/${delivery.id_pk}`,
              });
            }
          }}
        />
        <div className="flex gap-2">
          {status === "submitted" && <button onClick={() => setReceiving(true)} className="btn-primary px-3 py-2 text-xs">{en ? "Record reception" : "Enregistrer la reception"}</button>}
          <button onClick={downloadPdf} disabled={downloading} className="btn-secondary px-3 py-2 text-xs"><ArrowDownTrayIcon className="mr-1 inline h-4" />{downloading ? (en ? "Preparing..." : "Preparation...") : (en ? "Download PDF" : "Telecharger le PDF")}</button>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">{en ? "Product" : "Produit"}</th><th className="p-3">{en ? "Ordered" : "Commande"}</th><th className="p-3">{en ? "Received" : "Recu"}</th><th className="p-3">{en ? "Rejected" : "Rejete"}</th><th className="p-3">{en ? "Conformity" : "Conformite"}</th></tr></thead>
          <tbody>{lines.map(row => <tr key={row.id} className="border-t"><td className="p-3">{productName(row.product_id)}</td><td className="p-3">{row.quantity_ordered}</td><td className="p-3">{row.quantity_received ?? "—"}</td><td className="p-3">{row.rejected_quantity}{row.rejection_reason ? ` (${row.rejection_reason})` : ""}</td><td className="p-3">{row.conformity || "—"}</td></tr>)}</tbody>
        </table>
      </div>

      {!!receivers.length && <p className="mt-3 text-sm text-slate-500">{en ? "Received by" : "Receptionne par"} : {receivers.map(item => item.full_name).join(", ")}</p>}
    </div>

    {receiving && <div className="fixed inset-0 z-[160] overflow-y-auto bg-forest/90 p-4">
      <form onSubmit={submitReception} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{en ? "Record reception" : "Enregistrer la reception"}</h2><button type="button" onClick={() => setReceiving(false)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          {lines.map(line => <div key={line.id} className="rounded-xl bg-slate-50 p-3">
            <b className="text-sm text-forest">{productName(line.product_id)}</b> <span className="text-xs text-slate-400">({en ? "ordered" : "commande"} : {line.quantity_ordered})</span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-xs font-bold">{en ? "Quantity received" : "Quantite recue"}<input name={`received_${line.id}`} type="number" min="0" step="0.0001" defaultValue={line.quantity_ordered} className="admin-input" /></label>
              <label className="grid gap-1 text-xs font-bold">{en ? "Rejected quantity" : "Quantite rejetee"}<input name={`rejected_${line.id}`} type="number" min="0" step="0.0001" defaultValue={0} className="admin-input" /></label>
              <label className="col-span-2 grid gap-1 text-xs font-bold">{en ? "Rejection reason (if any)" : "Motif du rejet (si applicable)"}<input name={`reason_${line.id}`} className="admin-input" /></label>
            </div>
          </div>)}
          <div className="grid gap-2">
            <h3 className="text-sm font-black uppercase text-slate-400">{en ? "Received by" : "Receptionne par"}</h3>
            <input name="receiver_name" placeholder={en ? "Receiver 1" : "Receptionneur 1"} className="admin-input" />
            <input name="receiver_name" placeholder={en ? "Receiver 2 (optional)" : "Receptionneur 2 (facultatif)"} className="admin-input" />
          </div>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setReceiving(false)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button className="btn-primary">{en ? "Submit for approval" : "Soumettre pour approbation"}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
