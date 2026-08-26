"use client";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import type { EquipmentCheckout, EquipmentCheckoutStatus, PPMResource } from "@/lib/ppm/types";

const statusLabels: Record<EquipmentCheckoutStatus, string> = {
  pending_endorsement: "En attente d'endossement", checked_out: "En votre possession",
  return_requested: "Retour demande", returned: "Retourne", lost: "Perdu", damaged: "Endommage",
};
const statusTones: Record<EquipmentCheckoutStatus, string> = {
  pending_endorsement: "bg-sky-50 text-sky-800", checked_out: "bg-amber-50 text-amber-800",
  return_requested: "bg-orange/10 text-orange", returned: "bg-mint text-forest",
  lost: "bg-red-50 text-red-700", damaged: "bg-red-50 text-red-700",
};

export default function MyAssetsPanel({ initial, assets }: { initial: EquipmentCheckout[]; assets: PPMResource[] }) {
  const [rows, setRows] = useState(initial);
  const [requesting, setRequesting] = useState<EquipmentCheckout | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const assetName = (id: string) => { const asset = assets.find(item => item.id === id); return asset ? `${asset.asset_code ? `${asset.asset_code} — ` : ""}${asset.name}` : "—"; };

  async function endorse(row: EquipmentCheckout) {
    setBusy(row.id);
    setMessage("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = await supabase.from("ppm_equipment_checkouts").update({ status: "checked_out", endorsed_at: new Date().toISOString() }).eq("id", row.id).select("*").single();
    setBusy(null);
    if (result.error) { setMessage(result.error.message); return; }
    const updated = result.data as EquipmentCheckout;
    await supabase.from("ppm_history").insert({ entity_type: "asset_assignment", entity_id: row.id, actor_id: user?.id, action: "Reception endossee par le staff", from_status: row.status, to_status: "checked_out" });
    setRows(current => current.map(item => item.id === row.id ? updated : item));
  }

  async function submitReturnRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requesting) return;
    setBusy(requesting.id);
    setMessage("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = await supabase.from("ppm_equipment_checkouts").update({ status: "return_requested", return_requested_at: new Date().toISOString(), return_requested_note: note.trim() || null }).eq("id", requesting.id).select("*").single();
    setBusy(null);
    if (result.error) { setMessage(result.error.message); return; }
    const updated = result.data as EquipmentCheckout;
    await supabase.from("ppm_history").insert({ entity_type: "asset_assignment", entity_id: requesting.id, actor_id: user?.id, action: "Retour demande par le staff", from_status: requesting.status, to_status: "return_requested", note: note.trim() || undefined });
    setRows(current => current.map(item => item.id === requesting.id ? updated : item));
    setRequesting(null);
    setNote("");
  }

  return <div className="grid gap-5">
    <div><h1 className="text-2xl font-black text-forest">Mes actifs</h1><p className="mt-1 text-sm text-slate-500">Actifs qui vous sont attribues — endossez leur reception, ou demandez leur retour.</p></div>
    {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
    <div className="grid gap-3">
      {rows.map(row => <article key={row.id} className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><b className="text-forest">{assetName(row.resource_id)}</b><p className="mt-1 text-xs text-slate-400">Sortie : {row.checkout_date ? new Date(row.checkout_date).toLocaleDateString("fr-FR") : "—"}{row.expected_return_date ? ` · Retour prevu : ${new Date(row.expected_return_date).toLocaleDateString("fr-FR")}` : ""}</p></div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTones[row.status]}`}>{statusLabels[row.status]}</span>
        </div>
        {row.status === "pending_endorsement" && <button onClick={() => endorse(row)} disabled={busy === row.id} className="btn-primary mt-3 px-3 py-1.5 text-xs">{busy === row.id ? "Endossement..." : "Endosser la reception"}</button>}
        {row.status === "checked_out" && <button onClick={() => { setRequesting(row); setNote(""); }} className="btn-secondary mt-3 px-3 py-1.5 text-xs">Demander le retour</button>}
      </article>)}
      {!rows.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">Aucun actif ne vous est attribue pour le moment.</p>}
    </div>

    {requesting && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submitReturnRequest} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <h2 className="text-xl font-black text-forest">Demander le retour — {assetName(requesting.resource_id)}</h2>
        <label className="mt-4 grid gap-2 text-sm font-bold">Motif / note (facultatif)<textarea value={note} onChange={event => setNote(event.target.value)} rows={3} className="admin-input" /></label>
        <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setRequesting(null)} className="btn-secondary">Annuler</button><button disabled={busy === requesting.id} className="btn-primary">{busy === requesting.id ? "Envoi..." : "Confirmer la demande"}</button></div>
      </form>
    </div>}
  </div>;
}
