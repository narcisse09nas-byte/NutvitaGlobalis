"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import EntityStatusBadge from "@/components/op-management/EntityStatusBadge";
import type { Project } from "@/lib/ppm/types";

const PHASES = [
  { slug: "", label: "Vue d'ensemble" },
  { slug: "cadrage", label: "Cadrage" },
  { slug: "equipe", label: "Equipe" },
  { slug: "planification", label: "Planification" },
  { slug: "mise-en-oeuvre", label: "Mise en oeuvre" },
  { slug: "suivi-controle", label: "Suivi & controle" },
  { slug: "reporting", label: "Reporting" },
  { slug: "cloture", label: "Cloture" },
] as const;

export default function ProjectShell({ project, children }: { project: Project; children: ReactNode }) {
  const path = usePathname();
  const base = `/op-management/projets/${project.id}`;

  return <div className="grid gap-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-orange">{project.code || "Projet"}</p>
        <h1 className="mt-1 text-3xl font-black text-forest">{project.name}</h1>
      </div>
      <EntityStatusBadge status={project.status} />
    </div>

    <nav className="flex flex-wrap gap-2 border-b pb-3">
      {PHASES.map(phase => {
        const href = phase.slug ? `${base}/${phase.slug}` : base;
        const active = phase.slug ? path.startsWith(href) : path === base;
        return <Link key={phase.slug} href={href} className={`rounded-full px-4 py-2 text-sm font-bold ${active ? "bg-forest text-white" : "bg-slate-100 text-slate-600 hover:bg-mint"}`}>{phase.label}</Link>;
      })}
    </nav>

    {children}
  </div>;
}
