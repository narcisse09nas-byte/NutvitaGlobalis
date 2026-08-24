"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";

const TABS = [
  { slug: "identification", label: "Identification", labelEn: "Identification" },
  { slug: "contexte", label: "Contexte & justification", labelEn: "Context & rationale" },
  { slug: "charte", label: "Charte de projet", labelEn: "Project charter" },
  { slug: "exigences", label: "Exigences", labelEn: "Requirements" },
  { slug: "perimetre", label: "Perimetre", labelEn: "Scope" },
  { slug: "cadre-resultats", label: "Cadre de resultats", labelEn: "Results framework" },
  { slug: "gouvernance", label: "Gouvernance", labelEn: "Governance" },
] as const;

export default function CadrageTabs({ projectId }: { projectId: string }) {
  const path = usePathname();
  const { en } = usePpmLocale();
  const base = `/op-management/projets/${projectId}/cadrage`;

  return <nav className="flex flex-wrap gap-2">
    {TABS.map(tab => {
      const href = `${base}/${tab.slug}`;
      const active = path === href;
      return <Link key={tab.slug} href={href} className={`rounded-xl px-3 py-2 text-xs font-bold ${active ? "bg-mint text-forest" : "bg-slate-50 text-slate-500 hover:bg-mint/60"}`}>{en ? tab.labelEn : tab.label}</Link>;
    })}
  </nav>;
}
