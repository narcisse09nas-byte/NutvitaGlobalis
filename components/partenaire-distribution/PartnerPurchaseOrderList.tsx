"use client";
import Link from "next/link";
import type { OpsPurchaseOrder, OpsSite } from "@/lib/ppm/types";

const statusLabels: Record<string, string> = {
  draft: "Brouillon", submitted: "Soumis", coges_approved: "Approuve (COGES)", endorsed_by_cooperative: "Endosse (cooperative)",
  returned: "Retourne", rejected: "Rejete", cancelled: "Annule",
};

export default function PartnerPurchaseOrderList({ purchaseOrders, sites }: { purchaseOrders: OpsPurchaseOrder[]; sites: OpsSite[] }) {
  const siteName = (id: string) => sites.find(item => item.id === id)?.name || "—";
  return <div className="grid gap-6">
    <h1 className="text-3xl font-black text-forest">Bons de commande</h1>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[600px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">N°</th><th className="p-4">Ecole</th><th className="p-4">Statut</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {purchaseOrders.map(row => <tr key={row.id} className="border-t"><td className="p-4 font-mono text-xs font-bold">{row.id}</td><td className="p-4">{siteName(row.site_id)}</td><td className="p-4">{statusLabels[row.status] || row.status}</td><td className="p-4"><Link href={`/partenaire-distribution/bons-de-commande/${encodeURIComponent(row.id)}`} className="btn-secondary px-3 py-2 text-xs">Ouvrir</Link></td></tr>)}
          {!purchaseOrders.length && <tr><td colSpan={4} className="p-10 text-center text-slate-400">Aucun bon de commande.</td></tr>}
        </tbody>
      </table>
    </div>
  </div>;
}
