import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import CadrageTabs from "@/components/op-management/CadrageTabs";
import GovernanceManager from "@/components/op-management/GovernanceManager";
import RaciMatrix from "@/components/op-management/RaciMatrix";
import { createClient } from "@/lib/supabase/server";
import { getProject, listGovernanceRoles, listRaciEntries } from "@/lib/ppm/queries";

export default async function CadrageGovernancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/cadrage/gouvernance`)}`);
  const name = user.user_metadata?.full_name || user.email || "Utilisateur";
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [roles, raci] = await Promise.all([listGovernanceRoles(supabase, id), listRaciEntries(supabase, id)]);

  return <PPMShell name={name} breadcrumbs={[{ href: "/op-management", label: "Vue d'ensemble" }, { href: "/op-management/projets", label: "Projets" }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/cadrage/gouvernance`, label: "Cadrage" }]}>
    <ProjectShell project={project}>
      <div className="grid gap-8">
        <CadrageTabs projectId={id} />
        <GovernanceManager projectId={id} initial={roles} />
        <RaciMatrix projectId={id} roles={roles} initial={raci} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
