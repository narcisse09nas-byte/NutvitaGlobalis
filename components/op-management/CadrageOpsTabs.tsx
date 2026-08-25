"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";

const TABS = [
  { slug: "sites", label: "Sites de distribution", labelEn: "Distribution sites", sfOnly: false },
  { slug: "ration", label: "Ration", labelEn: "Ration", sfOnly: false },
  { slug: "menus", label: "Menus", labelEn: "Menus", sfOnly: true },
  { slug: "prix-ingredients", label: "Prix des ingredients", labelEn: "Ingredient prices", sfOnly: false },
  { slug: "cooperatives", label: "Cooperatives / GICs", labelEn: "Cooperatives / GICs", sfOnly: true },
  { slug: "contrats", label: "Contrats ecole-cooperative", labelEn: "School-cooperative contracts", sfOnly: true },
] as const;

export default function CadrageOpsTabs({ operationId, isSfHgsf }: { operationId: string; isSfHgsf: boolean }) {
  const path = usePathname();
  const { en } = usePpmLocale();
  const base = `/op-management/operations/${operationId}/cadrage`;

  return <nav className="flex flex-wrap gap-2">
    {TABS.filter(tab => !tab.sfOnly || isSfHgsf).map(tab => {
      const href = `${base}/${tab.slug}`;
      const active = path === href;
      return <Link key={tab.slug} href={href} className={`rounded-xl px-3 py-2 text-xs font-bold ${active ? "bg-mint text-forest" : "bg-slate-50 text-slate-500 hover:bg-mint/60"}`}>{en ? tab.labelEn : tab.label}</Link>;
    })}
  </nav>;
}
