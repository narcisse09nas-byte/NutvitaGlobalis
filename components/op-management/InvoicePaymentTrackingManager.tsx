"use client";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { OpsInvoice, OpsInvoicePaymentTracking, OpsInvoiceStatus, OpsSite } from "@/lib/ppm/types";

const TRACKABLE_STATUSES: OpsInvoiceStatus[] = ["distribution_manager_endorsed", "school_endorsed", "in_synthesis", "paid_to_school", "paid_to_cooperative"];

export default function InvoicePaymentTrackingManager({ invoices, sites, initialTracking }: {
  invoices: OpsInvoice[]; sites: OpsSite[]; initialTracking: OpsInvoicePaymentTracking[];
}) {
  const { en } = usePpmLocale();
  const [tracking, setTracking] = useState<Record<string, OpsInvoicePaymentTracking>>(() => {
    const map: Record<string, OpsInvoicePaymentTracking> = {};
    for (const item of initialTracking) map[item.invoice_id] = item;
    return map;
  });
  const [invoiceRows, setInvoiceRows] = useState(invoices);
  const [saving, setSaving] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const siteName = (id: string) => sites.find(item => item.id === id)?.name || "—";
  const eligible = invoiceRows.filter(item => TRACKABLE_STATUSES.includes(item.status));

  async function save(invoice: OpsInvoice, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(invoice.id);
    setMessages(current => ({ ...current, [invoice.id]: "" }));
    const form = new FormData(event.currentTarget);
    const payload = {
      invoice_id: invoice.id,
      cooperative_submitted_at: String(form.get("cooperative_submitted_at") || "") || null,
      submitted_for_payment_at: String(form.get("submitted_for_payment_at") || "") || null,
      paid_to_school_at: String(form.get("paid_to_school_at") || "") || null,
      paid_to_cooperative_at: String(form.get("paid_to_cooperative_at") || "") || null,
    };
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = await supabase.from("ppm_ops_invoice_payment_tracking").upsert({ ...payload, updated_by: user?.id }, { onConflict: "invoice_id" }).select("*").single();
    if (result.error) { setSaving(null); setMessages(current => ({ ...current, [invoice.id]: result.error.message })); return; }
    setTracking(current => ({ ...current, [invoice.id]: result.data as OpsInvoicePaymentTracking }));

    let nextStatus: OpsInvoiceStatus | null = null;
    if (payload.paid_to_cooperative_at && invoice.status !== "paid_to_cooperative") nextStatus = "paid_to_cooperative";
    else if (payload.paid_to_school_at && invoice.status !== "paid_to_school" && invoice.status !== "paid_to_cooperative") nextStatus = "paid_to_school";
    if (nextStatus) {
      const statusResult = await supabase.from("ppm_ops_invoices").update({ status: nextStatus }).eq("id", invoice.id).select("*").single();
      if (!statusResult.error) {
        const updated = statusResult.data as OpsInvoice;
        setInvoiceRows(current => current.map(row => row.id === updated.id ? updated : row));
        await supabase.from("ppm_history").insert({
          entity_type: "invoice", entity_id: invoice.id, actor_id: user?.id,
          action: nextStatus === "paid_to_cooperative" ? "Facture payee a la cooperative" : "Facture payee a l'ecole",
          from_status: invoice.status, to_status: nextStatus,
        });
      }
    }
    setSaving(null);
    setMessages(current => ({ ...current, [invoice.id]: en ? "Saved." : "Enregistre." }));
  }

  return <div className="grid gap-4">
    <h2 className="text-xl font-black text-forest">{en ? "Invoice payment tracking" : "Suivi des paiements de factures"}</h2>
    <div className="grid gap-3">
      {eligible.map(invoice => {
        const track = tracking[invoice.id];
        return <form key={invoice.id} onSubmit={event => save(invoice, event)} className="grid gap-3 rounded-2xl border bg-white p-5 sm:grid-cols-4">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-4">
            <div><span className="mr-2 rounded-full bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-500">{invoice.id}</span><b className="text-forest">{siteName(invoice.site_id)}</b></div>
            <span className="text-xs text-slate-400">{invoice.amount_figures.toLocaleString(en ? "en-US" : "fr-FR")} {invoice.currency}</span>
          </div>
          <label className="grid gap-1 text-xs font-bold text-slate-500">{en ? "Cooperative submitted" : "Soumise par la cooperative"}<input type="date" name="cooperative_submitted_at" defaultValue={track?.cooperative_submitted_at?.slice(0, 10) || ""} className="admin-input" /></label>
          <label className="grid gap-1 text-xs font-bold text-slate-500">{en ? "Submitted for payment" : "Soumise au paiement"}<input type="date" name="submitted_for_payment_at" defaultValue={track?.submitted_for_payment_at?.slice(0, 10) || ""} className="admin-input" /></label>
          <label className="grid gap-1 text-xs font-bold text-slate-500">{en ? "Paid to school" : "Payee a l'ecole"}<input type="date" name="paid_to_school_at" defaultValue={track?.paid_to_school_at?.slice(0, 10) || ""} className="admin-input" /></label>
          {invoice.is_sf_hgsf && <label className="grid gap-1 text-xs font-bold text-slate-500">{en ? "Paid to cooperative" : "Payee a la cooperative"}<input type="date" name="paid_to_cooperative_at" defaultValue={track?.paid_to_cooperative_at?.slice(0, 10) || ""} className="admin-input" /></label>}
          {messages[invoice.id] && <p className="text-xs font-bold text-amber-700 sm:col-span-4">{messages[invoice.id]}</p>}
          <div className="sm:col-span-4"><button disabled={saving === invoice.id} className="btn-secondary px-4 py-2 text-xs">{saving === invoice.id ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
        </form>;
      })}
      {!eligible.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">{en ? "No endorsed invoice yet." : "Aucune facture endossee pour le moment."}</p>}
    </div>
  </div>;
}
