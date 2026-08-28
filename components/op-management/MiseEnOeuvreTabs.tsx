"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";

const TABS = [
  { slug: "mes-activites", label: "Mes activites", labelEn: "My activities" },
  { slug: "mes-realisations", label: "Mes realisations", labelEn: "My achievements" },
  { slug: "validation", label: "Validation", labelEn: "Validation" },
  { slug: "depenses", label: "Depenses", labelEn: "Expenses" },
  { slug: "procurement", label: "Procurement", labelEn: "Procurement" },
  { slug: "receptions", label: "Bons de reception", labelEn: "Receipt notes" },
  { slug: "actifs", label: "Actifs", labelEn: "Assets" },
  { slug: "qualite", label: "Qualite", labelEn: "Quality" },
] as const;

export default function MiseEnOeuvreTabs({ projectId }: { projectId: string }) {
  const path = usePathname();
  const { en } = usePpmLocale();
  const base = `/op-management/projets/${projectId}/mise-en-oeuvre`;

  return <nav className="flex flex-wrap gap-2">
    {TABS.map(tab => {
      const href = `${base}/${tab.slug}`;
      const active = path === href;
      return <Link key={tab.slug} href={href} className={`rounded-xl px-3 py-2 text-xs font-bold ${active ? "bg-mint text-forest" : "bg-slate-50 text-slate-500 hover:bg-mint/60"}`}>{en ? tab.labelEn : tab.label}</Link>;
    })}
  </nav>;
}
