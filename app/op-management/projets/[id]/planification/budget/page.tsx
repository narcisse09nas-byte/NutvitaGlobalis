import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import PlanificationTabs from "@/components/op-management/PlanificationTabs";
import BudgetManager from "@/components/op-management/BudgetManager";
import { createClient } from "@/lib/supabase/server";
import { getProject, listBudgetLines, listWbsNodes } from "@/lib/ppm/queries";

export default async function PlanificationBudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/planification/budget`)}`);
  const name = user.user_metadata?.full_name || user.email || "Utilisateur";
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [budgetLines, wbsNodes] = await Promise.all([listBudgetLines(supabase, id), listWbsNodes(supabase, id)]);

  return <PPMShell name={name} breadcrumbs={[{ href: "/op-management", label: "Vue d'ensemble" }, { href: "/op-management/projets", label: "Projets" }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/planification/budget`, label: "Planification" }]}>
    <ProjectShell project={project}>
      <div className="grid gap-5">
        <PlanificationTabs projectId={id} />
        <BudgetManager projectId={id} initial={budgetLines} wbsNodes={wbsNodes} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
