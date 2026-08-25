"use client";
import Link from "next/link";
import type { OpsDeliveryNote, OpsSite } from "@/lib/ppm/types";

const statusLabels: Record<string, string> = {
  draft: "Brouillon", submitted: "Expediee", received_pending: "Reception soumise", received_confirmed: "Reception confirmee",
  approved: "Approuvee", returned: "Retournee", rejected: "Rejetee",
};

export default function PartnerDeliveryList({ deliveries, sites }: { deliveries: OpsDeliveryNote[]; sites: OpsSite[] }) {
  const siteName = (id: string) => sites.find(item => item.id === id)?.name || "—";
  return <div className="grid gap-6">
    <h1 className="text-3xl font-black text-forest">Bons de livraison</h1>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[600px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">N°</th><th className="p-4">Ecole</th><th className="p-4">Date</th><th className="p-4">Statut</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {deliveries.map(row => <tr key={row.id_pk} className="border-t"><td className="p-4 font-mono text-xs font-bold">{row.code}</td><td className="p-4">{siteName(row.site_id)}</td><td className="p-4">{new Date(row.delivery_date).toLocaleDateString("fr-FR")}</td><td className="p-4">{statusLabels[row.status] || row.status}</td><td className="p-4"><Link href={`/partenaire-distribution/bons-de-livraison/${row.id_pk}`} className="btn-secondary px-3 py-2 text-xs">Ouvrir</Link></td></tr>)}
          {!deliveries.length && <tr><td colSpan={5} className="p-10 text-center text-slate-400">Aucune livraison.</td></tr>}
        </tbody>
      </table>
    </div>
  </div>;
}
