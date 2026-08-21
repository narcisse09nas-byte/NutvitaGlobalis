"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { slug: "livrables-documents", label: "Livrables & Documents" },
  { slug: "rapports", label: "Rapports" },
  { slug: "tableaux-de-bord", label: "Tableaux de bord" },
] as const;

export default function ReportingTabs({ projectId }: { projectId: string }) {
  const path = usePathname();
  const base = `/op-management/projets/${projectId}/reporting`;

  return <nav className="flex flex-wrap gap-2">
    {TABS.map(tab => {
      const href = `${base}/${tab.slug}`;
      const active = path === href;
      return <Link key={tab.slug} href={href} className={`rounded-xl px-3 py-2 text-xs font-bold ${active ? "bg-mint text-forest" : "bg-slate-50 text-slate-500 hover:bg-mint/60"}`}>{tab.label}</Link>;
    })}
  </nav>;
}
