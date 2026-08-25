"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import EntityStatusBadge from "@/components/op-management/EntityStatusBadge";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { Operation } from "@/lib/ppm/types";

const PHASES = [
  { slug: "", label: "Vue d'ensemble", labelEn: "Overview" },
  { slug: "cadrage", label: "Cadrage", labelEn: "Scoping" },
  { slug: "planification", label: "Planification", labelEn: "Planning" },
  { slug: "mise-en-oeuvre", label: "Mise en oeuvre", labelEn: "Implementation" },
  { slug: "reconciliation", label: "Reconciliation & fermeture", labelEn: "Reconciliation & Closure" },
] as const;

export default function OperationShell({ operation, children }: { operation: Operation; children: ReactNode }) {
  const path = usePathname();
  const { en } = usePpmLocale();
  const base = `/op-management/operations/${operation.id}`;

  return <div className="grid gap-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-orange">{operation.code || (en ? "Operation" : "Operation")}</p>
        <h1 className="mt-1 text-3xl font-black text-forest">{operation.name}</h1>
      </div>
      <EntityStatusBadge status={operation.status === "suspended" ? "on_hold" : operation.status} />
    </div>

    <nav className="flex flex-wrap gap-2 border-b pb-3">
      {PHASES.map(phase => {
        const href = phase.slug ? `${base}/${phase.slug}` : base;
        const active = phase.slug ? path.startsWith(href) : path === base;
        return <Link key={phase.slug} href={href} className={`rounded-full px-4 py-2 text-sm font-bold ${active ? "bg-forest text-white" : "bg-slate-100 text-slate-600 hover:bg-mint"}`}>{en ? phase.labelEn : phase.label}</Link>;
      })}
    </nav>

    {children}
  </div>;
}
