"use client";
import Link from "next/link";
import type { OpsInvoice, OpsSite } from "@/lib/ppm/types";

const statusLabels: Record<string, string> = {
  draft: "Brouillon", submitted: "Soumise", distribution_manager_endorsed: "Validee (resp. distribution)",
  school_endorsed: "Endossee (ecole)", in_synthesis: "Dans le fichier de synthese", paid_to_school: "Payee a l'ecole",
  paid_to_cooperative: "Payee a la cooperative", rejected: "Rejetee",
};

export default function PartnerInvoiceList({ invoices, sites }: { invoices: OpsInvoice[]; sites: OpsSite[] }) {
  const siteName = (id: string) => sites.find(item => item.id === id)?.name || "—";
  return <div className="grid gap-6">
    <h1 className="text-3xl font-black text-forest">Factures</h1>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[600px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">N°</th><th className="p-4">Ecole</th><th className="p-4">Montant</th><th className="p-4">Statut</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {invoices.map(row => <tr key={row.id} className="border-t"><td className="p-4 font-mono text-xs font-bold">{row.id}</td><td className="p-4">{siteName(row.site_id)}</td><td className="p-4">{row.amount_figures.toLocaleString("fr-FR")} {row.currency}</td><td className="p-4">{statusLabels[row.status] || row.status}</td><td className="p-4"><Link href={`/partenaire-distribution/factures/${encodeURIComponent(row.id)}`} className="btn-secondary px-3 py-2 text-xs">Ouvrir</Link></td></tr>)}
          {!invoices.length && <tr><td colSpan={5} className="p-10 text-center text-slate-400">Aucune facture.</td></tr>}
        </tbody>
      </table>
    </div>
  </div>;
}
