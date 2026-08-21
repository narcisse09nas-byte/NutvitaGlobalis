"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { slug: "mes-activites", label: "Mes activites" },
  { slug: "mes-realisations", label: "Mes realisations" },
  { slug: "validation", label: "Validation" },
  { slug: "depenses", label: "Depenses" },
  { slug: "procurement", label: "Procurement" },
  { slug: "qualite", label: "Qualite" },
] as const;

export default function MiseEnOeuvreTabs({ projectId }: { projectId: string }) {
  const path = usePathname();
  const base = `/op-management/projets/${projectId}/mise-en-oeuvre`;

  return <nav className="flex flex-wrap gap-2">
    {TABS.map(tab => {
      const href = `${base}/${tab.slug}`;
      const active = path === href;
      return <Link key={tab.slug} href={href} className={`rounded-xl px-3 py-2 text-xs font-bold ${active ? "bg-mint text-forest" : "bg-slate-50 text-slate-500 hover:bg-mint/60"}`}>{tab.label}</Link>;
    })}
  </nav>;
}
