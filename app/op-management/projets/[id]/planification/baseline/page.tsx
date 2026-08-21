import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import PlanificationTabs from "@/components/op-management/PlanificationTabs";
import ScopeBaselineManager from "@/components/op-management/ScopeBaselineManager";
import ChangeRequestManager from "@/components/op-management/ChangeRequestManager";
import { createClient } from "@/lib/supabase/server";
import { getProject, listChangeRequests, listScopeBaselines } from "@/lib/ppm/queries";

export default async function PlanificationBaselinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/planification/baseline`)}`);
  const name = user.user_metadata?.full_name || user.email || "Utilisateur";
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [baselines, changeRequests] = await Promise.all([listScopeBaselines(supabase, id), listChangeRequests(supabase, id)]);

  return <PPMShell name={name} breadcrumbs={[{ href: "/op-management", label: "Vue d'ensemble" }, { href: "/op-management/projets", label: "Projets" }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/planification/baseline`, label: "Planification" }]}>
    <ProjectShell project={project}>
      <div className="grid gap-8">
        <PlanificationTabs projectId={id} />
        <ScopeBaselineManager projectId={id} initial={baselines} />
        <ChangeRequestManager projectId={id} initial={changeRequests} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
