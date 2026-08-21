"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { slug: "risques-issues", label: "Risques & Issues" },
  { slug: "parties-prenantes", label: "Parties prenantes & Communication" },
  { slug: "meal", label: "MEAL" },
  { slug: "approbations", label: "Approbations" },
  { slug: "actions", label: "Actions" },
  { slug: "performance", label: "Performance (EVM)" },
] as const;

export default function SuiviControleTabs({ projectId }: { projectId: string }) {
  const path = usePathname();
  const base = `/op-management/projets/${projectId}/suivi-controle`;

  return <nav className="flex flex-wrap gap-2">
    {TABS.map(tab => {
      const href = `${base}/${tab.slug}`;
      const active = path === href;
      return <Link key={tab.slug} href={href} className={`rounded-xl px-3 py-2 text-xs font-bold ${active ? "bg-mint text-forest" : "bg-slate-50 text-slate-500 hover:bg-mint/60"}`}>{tab.label}</Link>;
    })}
  </nav>;
}
