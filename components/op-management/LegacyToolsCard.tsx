import Link from "next/link";
import { ArchiveBoxIcon } from "@heroicons/react/24/outline";

export default function LegacyToolsCard() {
  return <section className="flex flex-col items-start gap-4 rounded-3xl border bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-start gap-4">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-orange/10 text-orange"><ArchiveBoxIcon className="h-6" /></span>
      <div>
        <h3 className="font-black text-forest">Gestion NFI, Estimateur besoins et autres outils existants</h3>
        <p className="mt-1 text-sm text-slate-500">Ces outils continuent de fonctionner normalement pendant la reconstruction de cet espace.</p>
      </div>
    </div>
    <Link href="/op-management/legacy" className="btn-secondary shrink-0 whitespace-nowrap">Ouvrir l&apos;outil actuel</Link>
  </section>;
}
