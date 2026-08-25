"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";

const TABS = [
  { slug: "suivi-factures", label: "Suivi des factures", labelEn: "Invoice tracking" },
  { slug: "reconciliations", label: "Reconciliations", labelEn: "Reconciliations" },
  { slug: "fichier-bailleur", label: "Fichier bailleur", labelEn: "Donor synthesis" },
] as const;

export default function ReconciliationOpsTabs({ operationId }: { operationId: string }) {
  const path = usePathname();
  const { en } = usePpmLocale();
  const base = `/op-management/operations/${operationId}/reconciliation`;

  return <nav className="flex flex-wrap gap-2">
    {TABS.map(tab => {
      const href = `${base}/${tab.slug}`;
      const active = path === href;
      return <Link key={tab.slug} href={href} className={`rounded-xl px-3 py-2 text-xs font-bold ${active ? "bg-mint text-forest" : "bg-slate-50 text-slate-500 hover:bg-mint/60"}`}>{en ? tab.labelEn : tab.label}</Link>;
    })}
  </nav>;
}
