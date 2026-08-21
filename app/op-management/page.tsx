import Link from "next/link";
import { redirect } from "next/navigation";
import { BriefcaseIcon, BuildingOffice2Icon, ClipboardDocumentListIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/server";
import PPMShell from "@/components/op-management/PPMShell";
import PPMOverviewEmptyState from "@/components/op-management/PPMOverviewEmptyState";
import LegacyToolsCard from "@/components/op-management/LegacyToolsCard";
import EntityStatusBadge from "@/components/op-management/EntityStatusBadge";
import { listOrganizations, ppmCounts } from "@/lib/ppm/queries";

export const metadata = { title: "Project, Programme & Portfolio Management | NutVitaGlobalis" };

export default async function OperationsManagementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent("/op-management")}`);
  const name = user.user_metadata?.full_name || user.email || "Utilisateur";
  const [counts, organizations] = await Promise.all([ppmCounts(supabase), listOrganizations(supabase)]);

  return <PPMShell name={name} breadcrumbs={[{ href: "/op-management", label: "Vue d'ensemble" }]}>
    <div className="mb-7"><h1 className="text-3xl font-black text-forest">Vue d&apos;ensemble</h1><p className="mt-2 text-slate-500">Portefeuilles, programmes, projets et performance globale de l&apos;organisation.</p></div>

    {counts.organizations === 0 ? <PPMOverviewEmptyState /> : <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/op-management/organisations" className="rounded-2xl border bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-soft"><span className="grid h-10 w-10 place-items-center rounded-xl bg-mint text-leaf"><BuildingOffice2Icon className="h-5" /></span><b className="mt-3 block text-2xl text-forest">{counts.organizations}</b><span className="text-xs font-bold uppercase text-slate-400">Organisation(s)</span></Link>
        <Link href="/op-management/portefeuilles" className="rounded-2xl border bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-soft"><span className="grid h-10 w-10 place-items-center rounded-xl bg-mint text-leaf"><Squares2X2Icon className="h-5" /></span><b className="mt-3 block text-2xl text-forest">{counts.portfolios}</b><span className="text-xs font-bold uppercase text-slate-400">Portefeuille(s)</span></Link>
        <Link href="/op-management/programmes" className="rounded-2xl border bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-soft"><span className="grid h-10 w-10 place-items-center rounded-xl bg-mint text-leaf"><BriefcaseIcon className="h-5" /></span><b className="mt-3 block text-2xl text-forest">{counts.programs}</b><span className="text-xs font-bold uppercase text-slate-400">Programme(s)</span></Link>
        <Link href="/op-management/projets" className="rounded-2xl border bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-soft"><span className="grid h-10 w-10 place-items-center rounded-xl bg-mint text-leaf"><ClipboardDocumentListIcon className="h-5" /></span><b className="mt-3 block text-2xl text-forest">{counts.projects}</b><span className="text-xs font-bold uppercase text-slate-400">Projet(s)</span></Link>
      </div>

      <section className="rounded-2xl border bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">Organisations</h2><Link href="/op-management/organisations" className="text-sm font-black text-leaf">Voir tout →</Link></div>
        <div className="mt-4 grid gap-3">
          {organizations.slice(0, 6).map(org => <Link key={org.id} href={`/op-management/organisations/${org.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-4 hover:bg-mint">
            <div><b className="text-forest">{org.name}</b>{org.country && <span className="ml-2 text-xs text-slate-400">{org.country}</span>}</div>
            <EntityStatusBadge status={org.status} />
          </Link>)}
        </div>
      </section>

      <LegacyToolsCard />
    </div>}
  </PPMShell>;
}
