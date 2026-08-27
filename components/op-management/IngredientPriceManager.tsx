"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { OpsIngredientPrice, OpsProduct } from "@/lib/ppm/types";

export default function IngredientPriceManager({ operationId, currency, initial, initialProducts }: {
  operationId: string; currency: string; initial: OpsIngredientPrice[]; initialProducts: OpsProduct[];
}) {
  const { en } = usePpmLocale();
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<"new" | null>(null);
  const [historyFor, setHistoryFor] = useState<OpsProduct | null>(null);
  const [history, setHistory] = useState<OpsIngredientPrice[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const products = initialProducts;
  const productName = (id: string) => products.find(item => item.id === id)?.name || "—";

  async function openHistory(product: OpsProduct) {
    setHistoryFor(product);
    const { data } = await createClient().from("ppm_ops_ingredient_prices").select("*").eq("operation_id", operationId).eq("product_id", product.id).order("created_at", { ascending: false });
    setHistory((data || []) as OpsIngredientPrice[]);
  }

  // An update never mutates an approved row — it supersedes it and inserts a new approved row,
  // so the full price history stays intact (see the append-only convention on
  // ppm_ops_ingredient_prices in supabase/ppm-ops-cadrage.sql).
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const productId = String(form.get("product_id") || "");
    const unitPrice = Number(form.get("unit_price") || 0);
    const effectiveFrom = String(form.get("effective_from") || new Date().toISOString().slice(0, 10));
    if (!productId || !unitPrice) { setSaving(false); setMessage(en ? "Product and unit price are required." : "Le produit et le prix unitaire sont obligatoires."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const now = new Date().toISOString();
    const existing = rows.find(item => item.product_id === productId);
    const result = await supabase.from("ppm_ops_ingredient_prices").insert({
      operation_id: operationId, product_id: productId, unit_price: unitPrice, currency,
      status: "approved", approved_by: user?.id, approved_at: now, effective_from: effectiveFrom, created_by: user?.id,
    }).select("*").single();
    if (result.error) { setSaving(false); setMessage(result.error.message); return; }
    const created = result.data as OpsIngredientPrice;
    if (existing) {
      await supabase.from("ppm_ops_ingredient_prices").update({ status: "superseded", superseded_at: now, superseded_by_price_id: created.id }).eq("id", existing.id);
    }
    setSaving(false);
    setRows(current => [...current.filter(item => item.product_id !== productId), created]);
    setEditing(null);
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">{en ? "Ingredient prices" : "Prix des ingredients"}</h2><button onClick={() => setEditing("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "Set a price" : "Definir un prix"}</button></div>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[700px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">{en ? "Product" : "Produit"}</th><th className="p-4">{en ? "Approved unit price" : "Prix unitaire approuve"}</th><th className="p-4">{en ? "Effective from" : "Effectif depuis"}</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4"><b className="text-forest">{productName(row.product_id)}</b></td>
            <td className="p-4">{row.unit_price.toLocaleString(en ? "en-US" : "fr-FR")} {row.currency}</td>
            <td className="p-4">{new Date(row.effective_from).toLocaleDateString(en ? "en-US" : "fr-FR")}</td>
            <td className="p-4"><button onClick={() => { const product = products.find(item => item.id === row.product_id); if (product) openHistory(product); }} className="text-xs font-bold text-slate-400 underline">{en ? "History" : "Historique"}</button></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={4} className="p-10 text-center text-slate-400">{en ? "No approved price yet." : "Aucun prix approuve pour le moment."}</td></tr>}
        </tbody>
      </table>
    </div>

    {editing && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{en ? "Set a price" : "Definir un prix"}</h2><button type="button" onClick={() => setEditing(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">{en ? "Product" : "Produit"}<select name="product_id" required className="admin-input"><option value="">{en ? "Select..." : "Selectionner..."}</option>{products.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? `Unit price (${currency})` : `Prix unitaire (${currency})`}<input name="unit_price" type="number" min="0" step="0.01" required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Effective from" : "Effectif depuis"}<input name="effective_from" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
        </div>
      </form>
    </div>}

    {historyFor && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <div className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{en ? "Price history" : "Historique des prix"} — {historyFor.name}</h2><button onClick={() => setHistoryFor(null)} className="text-2xl">×</button></div>
        <div className="mt-4 grid gap-2">
          {history.map(item => <div key={item.id} className="rounded-xl bg-slate-50 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2"><b className="text-forest">{item.unit_price.toLocaleString(en ? "en-US" : "fr-FR")} {item.currency}</b><span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">{item.status}</span></div>
            <p className="mt-1 text-xs text-slate-400">{en ? "Effective from" : "Effectif depuis"} {new Date(item.effective_from).toLocaleDateString(en ? "en-US" : "fr-FR")}</p>
          </div>)}
          {!history.length && <p className="text-sm text-slate-400">{en ? "No history." : "Aucun historique."}</p>}
        </div>
      </div>
    </div>}
  </div>;
}
