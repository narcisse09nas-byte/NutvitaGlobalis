import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import ProjectClosureWorkspace from "@/components/op-management/ProjectClosureWorkspace";
import { createClient } from "@/lib/supabase/server";
import {
  getProject, getProjectClosure, listActivities, listBudgetLines, listDeliverables,
  listEvaluations, listLessonsLearned, listProcurementItems,
} from "@/lib/ppm/queries";

export default async function ProjectClosurePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/cloture`)}`);
  const name = user.user_metadata?.full_name || user.email || "Utilisateur";
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [closure, deliverables, activities, procurementItems, budgetLines, evaluations, lessonsLearned] = await Promise.all([
    getProjectClosure(supabase, id), listDeliverables(supabase, id), listActivities(supabase, id),
    listProcurementItems(supabase, id), listBudgetLines(supabase, id), listEvaluations(supabase, id), listLessonsLearned(supabase, id),
  ]);
  const budgetBalance = budgetLines.reduce((sum, row) => sum + Number(row.revised_budget ?? row.initial_budget ?? 0) - Number(row.spent_amount || 0), 0);

  return <PPMShell name={name} breadcrumbs={[{ href: "/op-management", label: "Vue d'ensemble" }, { href: "/op-management/projets", label: "Projets" }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/cloture`, label: "Cloture" }]}>
    <ProjectShell project={project}>
      <ProjectClosureWorkspace
        projectId={id} project={project} initial={closure} deliverables={deliverables}
        activitiesTotal={activities.length} activitiesCompleted={activities.filter(activity => activity.status === "completed").length}
        procurementItems={procurementItems} budgetBalance={budgetBalance} evaluations={evaluations} lessonsLearnedCount={lessonsLearned.length}
      />
    </ProjectShell>
  </PPMShell>;
}
