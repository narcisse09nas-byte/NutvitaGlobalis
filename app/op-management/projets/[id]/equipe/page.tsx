import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import ResourceManager from "@/components/op-management/ResourceManager";
import SupplierRegister from "@/components/op-management/SupplierRegister";
import StakeholderRegister from "@/components/op-management/StakeholderRegister";
import SiteRegister from "@/components/op-management/SiteRegister";
import EntityStatusBadge from "@/components/op-management/EntityStatusBadge";
import { createClient } from "@/lib/supabase/server";
import {
  getProject, listResourceAssignments, listResources, listActivities, listSites, listStakeholders, listSuppliers,
} from "@/lib/ppm/queries";

// Refinement program, Wave 1: Staff, Suppliers, Stakeholders, Sites and Assets need to be visible
// and known from project entry, since they feed dozens of downstream dropdowns (responsable,
// fournisseur, partie prenante, localisation...). This tab is surfaced right after Cadrage.
export default async function ProjectEquipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/equipe`)}`);
  const name = user.user_metadata?.full_name || user.email || "Utilisateur";
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [resources, assignments, activities, suppliers, stakeholders, sites] = await Promise.all([
    listResources(supabase, id), listResourceAssignments(supabase, id), listActivities(supabase, id),
    listSuppliers(supabase, id), listStakeholders(supabase, id), listSites(supabase, id),
  ]);
  const staff = resources.filter(item => item.type === "human" || item.type === "consultant");
  const assets = resources.filter(item => item.type === "equipment" || item.type === "vehicle" || item.type === "infrastructure");

  return <PPMShell name={name} breadcrumbs={[{ href: "/op-management", label: "Vue d'ensemble" }, { href: "/op-management/projets", label: "Projets" }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/equipe`, label: "Equipe" }]}>
    <ProjectShell project={project}>
      <div className="grid gap-8">
        <ResourceManager projectId={id} initial={staff} initialAssignments={assignments} activities={activities} title="Staff & consultants" allowedTypes={["human", "consultant"]} />
        <SupplierRegister projectId={id} initial={suppliers} />
        <StakeholderRegister projectId={id} initial={stakeholders} />
        <SiteRegister projectId={id} initial={sites} />

        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black text-forest">Actifs & equipements</h2>
            <Link href={`/op-management/projets/${id}/planification/ressources`} className="btn-secondary px-4 py-2 text-sm">Gerer les actifs</Link>
          </div>
          <div className="overflow-x-auto rounded-2xl border bg-white">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Actif</th><th className="p-4">Type</th><th className="p-4">Statut</th></tr></thead>
              <tbody>
                {assets.map(item => <tr key={item.id} className="border-t"><td className="p-4"><b className="text-forest">{item.name}</b></td><td className="p-4">{item.type === "equipment" ? "Equipement" : item.type === "vehicle" ? "Vehicule" : "Infrastructure"}</td><td className="p-4"><EntityStatusBadge status={item.status} /></td></tr>)}
                {!assets.length && <tr><td colSpan={3} className="p-10 text-center text-slate-400">Aucun actif enregistre. Gerez-les depuis Planification &gt; Ressources.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ProjectShell>
  </PPMShell>;
}
