import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import MiseEnOeuvreTabs from "@/components/op-management/MiseEnOeuvreTabs";
import MyActivitiesRegister from "@/components/op-management/MyActivitiesRegister";
import { createClient } from "@/lib/supabase/server";
import { getProject, listIndicators, listMyActivities, listResultChain, listWbsNodes } from "@/lib/ppm/queries";

export default async function MiseEnOeuvreMesActivitesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/mise-en-oeuvre/mes-activites`)}`);
  const name = user.user_metadata?.full_name || user.email || "Utilisateur";
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [myActivities, wbsNodes, resultChain, indicators] = await Promise.all([
    listMyActivities(supabase, id, user.email || ""), listWbsNodes(supabase, id), listResultChain(supabase, id), listIndicators(supabase, id),
  ]);
  const outputs = resultChain.filter(node => node.level === "output");

  return <PPMShell name={name} breadcrumbs={[{ href: "/op-management", label: "Vue d'ensemble" }, { href: "/op-management/projets", label: "Projets" }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/mise-en-oeuvre/mes-activites`, label: "Mise en oeuvre" }]}>
    <ProjectShell project={project}>
      <div className="grid gap-5">
        <MiseEnOeuvreTabs projectId={id} />
        <MyActivitiesRegister projectId={id} activities={myActivities} wbsNodes={wbsNodes} outputs={outputs} indicators={indicators} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
