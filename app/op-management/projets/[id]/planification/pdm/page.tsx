import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import PlanificationTabs from "@/components/op-management/PlanificationTabs";
import PDMWorkspace from "@/components/op-management/PDMWorkspace";
import { createClient } from "@/lib/supabase/server";
import { getProject, listActivities, listIndicators, listKnownPeople, listResultChain, listWbsNodes } from "@/lib/ppm/queries";

export default async function PlanificationPdmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/planification/pdm`)}`);
  const name = user.user_metadata?.full_name || user.email || "Utilisateur";
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [wbsNodes, resultChain, indicators, activities, knownPeople] = await Promise.all([
    listWbsNodes(supabase, id), listResultChain(supabase, id), listIndicators(supabase, id), listActivities(supabase, id), listKnownPeople(supabase, project),
  ]);
  const workPackages = wbsNodes.filter(node => node.level === 4);
  const outputs = resultChain.filter(node => node.level === "output");

  return <PPMShell name={name} breadcrumbs={[{ href: "/op-management", label: "Vue d'ensemble" }, { href: "/op-management/projets", label: "Projets" }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/planification/pdm`, label: "Planification" }]}>
    <ProjectShell project={project}>
      <div className="grid gap-5">
        <PlanificationTabs projectId={id} />
        <PDMWorkspace projectId={id} initial={activities} workPackages={workPackages} outputs={outputs} indicators={indicators} knownPeople={knownPeople} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
