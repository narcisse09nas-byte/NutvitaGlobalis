import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import CadrageTabs from "@/components/op-management/CadrageTabs";
import RequirementsRegister from "@/components/op-management/RequirementsRegister";
import { createClient } from "@/lib/supabase/server";
import { getProject, listRequirements } from "@/lib/ppm/queries";

export default async function CadrageRequirementsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/cadrage/exigences`)}`);
  const name = user.user_metadata?.full_name || user.email || "Utilisateur";
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const requirements = await listRequirements(supabase, id);

  return <PPMShell name={name} breadcrumbs={[{ href: "/op-management", label: "Vue d'ensemble" }, { href: "/op-management/projets", label: "Projets" }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/cadrage/exigences`, label: "Cadrage" }]}>
    <ProjectShell project={project}>
      <div className="grid gap-5">
        <CadrageTabs projectId={id} />
        <RequirementsRegister projectId={id} initial={requirements} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
