import Link from "next/link";
import { requireDistributionPartner } from "@/lib/ppm/require-distribution-partner";
import DistributionPartnerShell from "@/components/partenaire-distribution/DistributionPartnerShell";
import { getOpsSitesByIds, listOpsDeliveryNotesForSites, listOpsInvoicesForSites, listOpsPurchaseOrdersForSites } from "@/lib/ppm/queries";

export const metadata = { title: "Tableau de bord | Partenaire distribution" };

export default async function DistributionPartnerDashboard() {
  const { supabase, profile, siteIds } = await requireDistributionPartner();
  const [sites, purchaseOrders, deliveries, invoices] = await Promise.all([
    getOpsSitesByIds(supabase, siteIds), listOpsPurchaseOrdersForSites(supabase, siteIds),
    listOpsDeliveryNotesForSites(supabase, siteIds), listOpsInvoicesForSites(supabase, siteIds),
  ]);
  const pendingPos = purchaseOrders.filter(item => ["submitted", "coges_approved"].includes(item.status)).length;
  const pendingDeliveries = deliveries.filter(item => item.status === "submitted").length;
  const pendingInvoices = invoices.filter(item => item.status === "draft" || item.status === "submitted").length;

  return <DistributionPartnerShell name={profile.full_name} siteNames={sites.map(item => item.name)}>
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-black text-forest">Bienvenue, {profile.full_name}</h1>
        <p className="mt-1 text-sm text-slate-500">{profile.partner_type === "coges" ? "Membre du COGES" : "Cooperative / GIC"}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/partenaire-distribution/bons-de-commande" className="rounded-2xl border bg-white p-5 hover:shadow-md"><p className="text-xs font-bold uppercase text-slate-400">Bons de commande</p><b className="mt-2 block text-2xl text-forest">{pendingPos}</b><p className="mt-1 text-xs text-slate-400">en attente</p></Link>
        <Link href="/partenaire-distribution/bons-de-livraison" className="rounded-2xl border bg-white p-5 hover:shadow-md"><p className="text-xs font-bold uppercase text-slate-400">Bons de livraison</p><b className="mt-2 block text-2xl text-forest">{pendingDeliveries}</b><p className="mt-1 text-xs text-slate-400">en attente</p></Link>
        <Link href="/partenaire-distribution/factures" className="rounded-2xl border bg-white p-5 hover:shadow-md"><p className="text-xs font-bold uppercase text-slate-400">Factures</p><b className="mt-2 block text-2xl text-forest">{pendingInvoices}</b><p className="mt-1 text-xs text-slate-400">en attente</p></Link>
      </div>
      {!sites.length && <p className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900">Aucune ecole ne vous est encore rattachee. Contactez l&apos;equipe NutVitaGlobalis.</p>}
    </div>
  </DistributionPartnerShell>;
}
