"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";

const TABS = [
  { slug: "plan", label: "Plan de distribution", labelEn: "Distribution plan", sfOnly: false },
  { slug: "plan-journalier", label: "Plan journalier (menus)", labelEn: "Daily plan (menus)", sfOnly: true },
] as const;

export default function PlanificationOpsTabs({ operationId, isSfHgsf }: { operationId: string; isSfHgsf: boolean }) {
  const path = usePathname();
  const { en } = usePpmLocale();
  const base = `/op-management/operations/${operationId}/planification`;

  return <nav className="flex flex-wrap gap-2">
    {TABS.filter(tab => !tab.sfOnly || isSfHgsf).map(tab => {
      const href = `${base}/${tab.slug}`;
      const active = path === href;
      return <Link key={tab.slug} href={href} className={`rounded-xl px-3 py-2 text-xs font-bold ${active ? "bg-mint text-forest" : "bg-slate-50 text-slate-500 hover:bg-mint/60"}`}>{en ? tab.labelEn : tab.label}</Link>;
    })}
  </nav>;
}
