"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";

const TABS = [
  { slug: 'pilotage-hgsf', label: 'Pilotage HGSF', labelEn: 'HGSF operations', sfOnly: true, nonSfOnly: false },
  { slug: "besoins", label: "Besoins", labelEn: "Needs", sfOnly: false, nonSfOnly: true },
  { slug: "bons-de-commande", label: "Bons de commande", labelEn: "Purchase orders", sfOnly: true, nonSfOnly: false },
  { slug: "bons-de-livraison", label: "Bons de livraison", labelEn: "Delivery notes", sfOnly: false, nonSfOnly: false },
  { slug: "rapports-distribution", label: "Rapports de distribution", labelEn: "Distribution reports", sfOnly: false, nonSfOnly: false },
  { slug: "factures", label: "Factures", labelEn: "Invoices", sfOnly: false, nonSfOnly: false },
] as const;

export default function MiseEnOeuvreOpsTabs({ operationId, isSfHgsf }: { operationId: string; isSfHgsf: boolean }) {
  const path = usePathname();
  const { en } = usePpmLocale();
  const base = `/op-management/operations/${operationId}/mise-en-oeuvre`;

  return <nav className="flex flex-wrap gap-2">
    {TABS.filter(tab => (isSfHgsf ? !tab.nonSfOnly : !tab.sfOnly)).map(tab => {
      const href = `${base}/${tab.slug}`;
      const active = path === href;
      return <Link key={tab.slug} href={href} className={`rounded-xl px-3 py-2 text-xs font-bold ${active ? "bg-mint text-forest" : "bg-slate-50 text-slate-500 hover:bg-mint/60"}`}>{en ? tab.labelEn : tab.label}</Link>;
    })}
  </nav>;
}
