"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";

const TABS = [
  { slug: "risques-issues", label: "Risques & Issues", labelEn: "Risks & Issues" },
  { slug: "parties-prenantes", label: "Parties prenantes & Communication", labelEn: "Stakeholders & Communication" },
  { slug: "meal", label: "MEAL", labelEn: "MEAL" },
  { slug: "approbations", label: "Approbations", labelEn: "Approvals" },
  { slug: "actions", label: "Actions", labelEn: "Actions" },
  { slug: "performance", label: "Performance (EVM)", labelEn: "Performance (EVM)" },
] as const;

export default function SuiviControleTabs({ projectId }: { projectId: string }) {
  const path = usePathname();
  const { en } = usePpmLocale();
  const base = `/op-management/projets/${projectId}/suivi-controle`;

  return <nav className="flex flex-wrap gap-2">
    {TABS.map(tab => {
      const href = `${base}/${tab.slug}`;
      const active = path === href;
      return <Link key={tab.slug} href={href} className={`rounded-xl px-3 py-2 text-xs font-bold ${active ? "bg-mint text-forest" : "bg-slate-50 text-slate-500 hover:bg-mint/60"}`}>{en ? tab.labelEn : tab.label}</Link>;
    })}
  </nav>;
}
