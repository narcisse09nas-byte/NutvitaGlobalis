"use client";
import Link from "next/link";
import { PlusIcon, RectangleGroupIcon } from "@heroicons/react/24/outline";
import LegacyToolsCard from "@/components/op-management/LegacyToolsCard";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";

export default function PPMOverviewEmptyState({ className = "" }: { className?: string }) {
  const { en } = usePpmLocale();
  return <div className={`grid gap-5 ${className}`}>
    <section className="rounded-3xl border border-dashed border-forest/20 bg-white p-8 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-mint text-leaf"><RectangleGroupIcon className="h-7" /></span>
      <h2 className="mt-4 text-xl font-black text-forest">{en ? "No organization registered" : "Aucune organisation enregistree"}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
        {en
          ? "This space is the foundation of project, program and portfolio management. Create your first organization to start structuring your portfolios and programs."
          : "Cet espace est la base de la gestion des projets, programmes et portefeuilles. Creez votre premiere organisation pour commencer a structurer vos portefeuilles et programmes."}
      </p>
      <Link href="/op-management/organisations" className="btn-primary mt-5 inline-flex"><PlusIcon className="mr-2 h-5" />{en ? "Create an organization" : "Creer une organisation"}</Link>
    </section>
    <LegacyToolsCard />
  </div>;
}
