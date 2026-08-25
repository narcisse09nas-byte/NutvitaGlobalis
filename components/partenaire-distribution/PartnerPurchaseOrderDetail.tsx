"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OpsPartnerType, OpsPoDailyLine, OpsPoIngredientLine, OpsPurchaseOrder, OpsPurchaseOrderStatus } from "@/lib/ppm/types";

const statusLabels: Record<OpsPurchaseOrderStatus, string> = {
  draft: "Brouillon", submitted: "Soumis", coges_approved: "Approuve (COGES)", endorsed_by_cooperative: "Endosse (cooperative)",
  returned: "Retourne", rejected: "Rejete", cancelled: "Annule",
};

export default function PartnerPurchaseOrderDetail({ po: initialPo, siteName, cooperativeName, dailyLines, ingredientLines, productName, menuName, partnerType }: {
  po: OpsPurchaseOrder; siteName: string; cooperativeName: string; dailyLines: OpsPoDailyLine[]; ingredientLines: OpsPoIngredientLine[];
  productName: (id: string) => string; menuName: (id: string) => string; partnerType: OpsPartnerType;
}) {
  const [po, setPo] = useState(initialPo);
  const [saving, setSaving] = useState(false);
  const totalPrice = ingredientLines.reduce((sum, item) => sum + item.total_price, 0);

  async function advance(nextStatus: OpsPurchaseOrderStatus) {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const extra: Record<string, unknown> = {};
    if (nextStatus === "endorsed_by_cooperative") extra.endorsed_at = new Date().toISOString();
    const result = await supabase.from("ppm_ops_purchase_orders").update({ status: nextStatus, ...extra }).eq("id", po.id).select("*").single();
    setSaving(false);
    if (result.error) return;
    setPo(result.data as OpsPurchaseOrder);
    await supabase.from("ppm_history").insert({ entity_type: "purchase_order", entity_id: po.id, actor_id: user?.id, action: `Bon de commande ${statusLabels[nextStatus].toLowerCase()}`, from_status: po.status, to_status: nextStatus });
  }

  const canCogesSubmit = partnerType === "coges" && po.status === "draft";
  const canCogesApprove = partnerType === "coges" && po.status === "submitted";
  const canCooperativeEndorse = partnerType === "cooperative" && po.status === "coges_approved";

  return <div className="grid gap-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-black text-forest">{po.id}</h1><p className="mt-1 text-sm text-slate-500">{siteName} → {cooperativeName}</p></div>
      <span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-forest">{statusLabels[po.status]}</span>
    </div>

    <div className="flex flex-wrap gap-3">
      {canCogesSubmit && <button onClick={() => advance("submitted")} disabled={saving} className="btn-primary px-4 py-2 text-sm">Soumettre</button>}
      {canCogesApprove && <button onClick={() => advance("coges_approved")} disabled={saving} className="btn-primary px-4 py-2 text-sm">Approuver (president COGES)</button>}
      {canCooperativeEndorse && <button onClick={() => advance("endorsed_by_cooperative")} disabled={saving} className="btn-primary px-4 py-2 text-sm">Endosser ce bon</button>}
    </div>

    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[500px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Date</th><th className="p-3">Menu</th><th className="p-3">Eleves</th></tr></thead>
        <tbody>{dailyLines.map(row => <tr key={row.id} className="border-t"><td className="p-3">{new Date(row.ration_date).toLocaleDateString("fr-FR")}</td><td className="p-3">{menuName(row.menu_id)}</td><td className="p-3">{row.student_count}</td></tr>)}</tbody>
      </table>
    </div>

    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[500px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Ingredient</th><th className="p-3">Qte (MT)</th><th className="p-3">Prix/Kg</th><th className="p-3">Prix total</th></tr></thead>
        <tbody>
          {ingredientLines.map(row => <tr key={row.id} className="border-t"><td className="p-3">{productName(row.product_id)}</td><td className="p-3">{row.quantity_mt.toFixed(4)}</td><td className="p-3">{row.unit_price.toLocaleString("fr-FR")}</td><td className="p-3">{row.total_price.toLocaleString("fr-FR")}</td></tr>)}
          <tr className="border-t bg-slate-50 font-black"><td className="p-3" colSpan={3}>Total</td><td className="p-3">{totalPrice.toLocaleString("fr-FR")}</td></tr>
        </tbody>
      </table>
    </div>
  </div>;
}
