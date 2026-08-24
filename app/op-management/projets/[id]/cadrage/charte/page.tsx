import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import CadrageTabs from "@/components/op-management/CadrageTabs";
import ProjectCharterManager from "@/components/op-management/ProjectCharterManager";
import { createClient } from "@/lib/supabase/server";
import { getProject, listCharters } from "@/lib/ppm/queries";

export default async function CadrageCharterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/cadrage/charte`)}`);
  const name = user.user_metadata?.full_name || user.email || "Utilisateur";
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const charters = await listCharters(supabase, id);

  return <PPMShell name={name} breadcrumbs={[{ href: "/op-management", label: "Vue d'ensemble" }, { href: "/op-management/projets", label: "Projets" }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/cadrage/charte`, label: "Cadrage" }]}>
    <ProjectShell project={project}>
      <div className="grid gap-5">
        <CadrageTabs projectId={id} />
        <ProjectCharterManager projectId={id} initial={charters} projectBudget={project.total_budget} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
