"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";

const TABS = [
  { slug: "wbs", label: "WBS", labelEn: "WBS" },
  { slug: "baseline", label: "Scope Baseline & Change Control", labelEn: "Scope Baseline & Change Control" },
  { slug: "pdm", label: "PDM (activites)", labelEn: "PDM (activities)" },
  { slug: "budget", label: "Budget", labelEn: "Budget" },
  { slug: "ressources", label: "Autres ressources", labelEn: "Other resources" },
] as const;

export default function PlanificationTabs({ projectId }: { projectId: string }) {
  const path = usePathname();
  const { en } = usePpmLocale();
  const base = `/op-management/projets/${projectId}/planification`;

  return <nav className="flex flex-wrap gap-2">
    {TABS.map(tab => {
      const href = `${base}/${tab.slug}`;
      const active = path === href;
      return <Link key={tab.slug} href={href} className={`rounded-xl px-3 py-2 text-xs font-bold ${active ? "bg-mint text-forest" : "bg-slate-50 text-slate-500 hover:bg-mint/60"}`}>{en ? tab.labelEn : tab.label}</Link>;
    })}
  </nav>;
}
