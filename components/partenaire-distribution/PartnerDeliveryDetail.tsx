"use client";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OpsDeliveryLine, OpsDeliveryNote, OpsDeliveryStatus, OpsPartnerType } from "@/lib/ppm/types";

const statusLabels: Record<OpsDeliveryStatus, string> = {
  draft: "Brouillon", submitted: "Expediee", received_pending: "Reception soumise", received_confirmed: "Reception confirmee",
  approved: "Approuvee", returned: "Retournee", rejected: "Rejetee",
};

export default function PartnerDeliveryDetail({ delivery: initialDelivery, siteName, lines: initialLines, productName, partnerType }: {
  delivery: OpsDeliveryNote; siteName: string; lines: OpsDeliveryLine[]; productName: (id: string) => string; partnerType: OpsPartnerType;
}) {
  const [delivery, setDelivery] = useState(initialDelivery);
  const [lines, setLines] = useState(initialLines);
  const [receiving, setReceiving] = useState(false);
  const [saving, setSaving] = useState(false);

  async function insertHistory(action: string, fromStatus: string, toStatus: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("ppm_history").insert({ entity_type: "delivery_note", entity_id: delivery.id_pk, actor_id: user?.id, action, from_status: fromStatus, to_status: toStatus });
  }

  async function submitDispatch() {
    setSaving(true);
    const supabase = createClient();
    const result = await supabase.from("ppm_ops_delivery_notes").update({ status: "submitted" }).eq("id_pk", delivery.id_pk).select("*").single();
    setSaving(false);
    if (result.error) return;
    setDelivery(result.data as OpsDeliveryNote);
    await insertHistory("Livraison expediee (cooperative)", delivery.status, "submitted");
  }

  async function submitReception(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    for (const line of lines) {
      const received = Number(form.get(`received_${line.id}`) || 0);
      const rejected = Number(form.get(`rejected_${line.id}`) || 0);
      const reason = String(form.get(`reason_${line.id}`) || "").trim() || null;
      await supabase.from("ppm_ops_delivery_lines").update({ quantity_received: received, rejected_quantity: rejected, rejection_reason: reason, conformity: rejected > 0 ? "non_conforme" : "conforme" }).eq("id", line.id);
    }
    const receiverNames = form.getAll("receiver_name").map(String).filter(Boolean);
    if (receiverNames.length) await supabase.from("ppm_ops_delivery_receivers").insert(receiverNames.map(fullName => ({ delivery_note_id: delivery.id_pk, full_name: fullName })));
    const result = await supabase.from("ppm_ops_delivery_notes").update({ status: "received_pending" }).eq("id_pk", delivery.id_pk).select("*").single();
    setSaving(false);
    if (result.error) return;
    setDelivery(result.data as OpsDeliveryNote);
    const { data: refreshed } = await supabase.from("ppm_ops_delivery_lines").select("*").eq("delivery_note_id", delivery.id_pk);
    setLines((refreshed || []) as OpsDeliveryLine[]);
    setReceiving(false);
    await insertHistory("Reception de livraison soumise (COGES)", "submitted", "received_pending");
  }

  async function approveReception() {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = await supabase.from("ppm_ops_delivery_notes").update({ status: "approved" }).eq("id_pk", delivery.id_pk).select("*").single();
    if (!result.error) {
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
    setSaving(false);
    if (result.error) return;
    setDelivery(result.data as OpsDeliveryNote);
    await insertHistory("Reception approuvee (president COGES)", "received_pending", "approved");
  }

  const canDispatch = partnerType === "cooperative" && delivery.generated_by === "cooperative" && delivery.status === "draft";
  const canRecordReception = partnerType === "coges" && delivery.status === "submitted";
  const canApprove = partnerType === "coges" && delivery.status === "received_pending";

  return <div className="grid gap-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-black text-forest">{delivery.code}</h1><p className="mt-1 text-sm text-slate-500">{siteName} — {new Date(delivery.delivery_date).toLocaleDateString("fr-FR")}</p></div>
      <span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-forest">{statusLabels[delivery.status]}</span>
    </div>

    <div className="flex flex-wrap gap-3">
      {canDispatch && <button onClick={submitDispatch} disabled={saving} className="btn-primary px-4 py-2 text-sm">Expedier la livraison</button>}
      {canRecordReception && <button onClick={() => setReceiving(true)} className="btn-primary px-4 py-2 text-sm">Enregistrer la reception</button>}
      {canApprove && <button onClick={approveReception} disabled={saving} className="btn-primary px-4 py-2 text-sm">Approuver la reception</button>}
    </div>

    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[600px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Produit</th><th className="p-3">Commande</th><th className="p-3">Recu</th><th className="p-3">Rejete</th><th className="p-3">Conformite</th></tr></thead>
        <tbody>{lines.map(row => <tr key={row.id} className="border-t"><td className="p-3">{productName(row.product_id)}</td><td className="p-3">{row.quantity_ordered}</td><td className="p-3">{row.quantity_received ?? "—"}</td><td className="p-3">{row.rejected_quantity}{row.rejection_reason ? ` (${row.rejection_reason})` : ""}</td><td className="p-3">{row.conformity || "—"}</td></tr>)}</tbody>
      </table>
    </div>

    {receiving && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submitReception} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <h2 className="text-xl font-black text-forest">Enregistrer la reception</h2>
        <div className="mt-5 grid gap-4">
          {lines.map(line => <div key={line.id} className="rounded-xl bg-slate-50 p-3">
            <b className="text-sm text-forest">{productName(line.product_id)}</b> <span className="text-xs text-slate-400">(commande : {line.quantity_ordered})</span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-xs font-bold">Quantite recue<input name={`received_${line.id}`} type="number" min="0" step="0.0001" defaultValue={line.quantity_ordered} className="admin-input" /></label>
              <label className="grid gap-1 text-xs font-bold">Quantite rejetee<input name={`rejected_${line.id}`} type="number" min="0" step="0.0001" defaultValue={0} className="admin-input" /></label>
              <label className="col-span-2 grid gap-1 text-xs font-bold">Motif du rejet (si applicable)<input name={`reason_${line.id}`} className="admin-input" /></label>
            </div>
          </div>)}
          <div className="grid gap-2">
            <h3 className="text-sm font-black uppercase text-slate-400">Receptionne par</h3>
            <input name="receiver_name" placeholder="Receptionneur 1" className="admin-input" />
            <input name="receiver_name" placeholder="Receptionneur 2 (facultatif)" className="admin-input" />
          </div>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setReceiving(false)} className="btn-secondary">Annuler</button><button disabled={saving} className="btn-primary">Soumettre pour approbation</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
