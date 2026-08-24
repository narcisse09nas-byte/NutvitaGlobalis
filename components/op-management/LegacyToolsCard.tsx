"use client";
import Link from "next/link";
import { ArchiveBoxIcon } from "@heroicons/react/24/outline";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";

export default function LegacyToolsCard() {
  const { en } = usePpmLocale();
  return <section className="flex flex-col items-start gap-4 rounded-3xl border bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-start gap-4">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-orange/10 text-orange"><ArchiveBoxIcon className="h-6" /></span>
      <div>
        <h3 className="font-black text-forest">{en ? "NFI management, needs estimator and other existing tools" : "Gestion NFI, Estimateur besoins et autres outils existants"}</h3>
        <p className="mt-1 text-sm text-slate-500">{en ? "These tools keep working normally while this space is rebuilt." : "Ces outils continuent de fonctionner normalement pendant la reconstruction de cet espace."}</p>
      </div>
    </div>
    <Link href="/op-management/legacy" className="btn-secondary shrink-0 whitespace-nowrap">{en ? "Open the current tool" : "Ouvrir l'outil actuel"}</Link>
  </section>;
}
