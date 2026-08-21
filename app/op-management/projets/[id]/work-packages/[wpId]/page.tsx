import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import WorkPackageDetailView from "@/components/op-management/WorkPackageDetailView";
import { createClient } from "@/lib/supabase/server";
import {
  getApprovedPmbWorkPackageSnapshots, getEvmSettings, getProject, getWbsNode, listActivities,
  listAchievements, listBudgetLines, listDeliverables, listExpenses, listIssues, listNcrs,
  listProcurementItems, listQualityRequirements, listResourceAssignments, listRisks, listTimePhasedBudgets,
} from "@/lib/ppm/queries";

export default async function WorkPackageDetailPage({ params }: { params: Promise<{ id: string; wpId: string }> }) {
  const { id, wpId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/work-packages/${wpId}`)}`);
  const name = user.user_metadata?.full_name || user.email || "Utilisateur";
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const workPackage = await getWbsNode(supabase, wpId);
  if (!workPackage || workPackage.project_id !== id) notFound();

  const [activities, budgetLines, expenses, procurementItems, qualityRequirements, ncrs, risks, issues, deliverables, resourceAssignments, achievements, timePhasedRows, evmSettings, pmbSnapshots] = await Promise.all([
    listActivities(supabase, id), listBudgetLines(supabase, id), listExpenses(supabase, id), listProcurementItems(supabase, id),
    listQualityRequirements(supabase, id), listNcrs(supabase, id), listRisks(supabase, id), listIssues(supabase, id),
    listDeliverables(supabase, id), listResourceAssignments(supabase, id), listAchievements(supabase, id),
    listTimePhasedBudgets(supabase, id), getEvmSettings(supabase, id), getApprovedPmbWorkPackageSnapshots(supabase, id),
  ]);
  const wpQualityRequirements = qualityRequirements.filter(item => item.work_package_id === wpId);
  const wpActivityIds = new Set(activities.filter(item => item.work_package_id === wpId).map(item => item.id));

  return <PPMShell name={name} breadcrumbs={[{ href: "/op-management", label: "Vue d'ensemble" }, { href: "/op-management/projets", label: "Projets" }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/work-packages/${wpId}`, label: workPackage.title }]}>
    <ProjectShell project={project}>
      <WorkPackageDetailView
        projectId={id} workPackage={workPackage}
        activities={activities.filter(item => item.work_package_id === wpId)}
        budgetLines={budgetLines.filter(item => item.wbs_node_id === wpId)}
        expenses={expenses.filter(item => item.work_package_id === wpId)}
        procurementItems={procurementItems.filter(item => item.work_package_id === wpId)}
        qualityRequirements={wpQualityRequirements}
        ncrs={ncrs.filter(item => wpQualityRequirements.some(req => req.id === item.quality_requirement_id))}
        risks={risks.filter(item => item.work_package_id === wpId)}
        issues={issues.filter(item => item.work_package_id === wpId)}
        deliverables={deliverables.filter(item => item.work_package_id === wpId)}
        resourceAssignments={resourceAssignments.filter(item => item.wbs_node_id === wpId)}
        achievements={achievements.filter(item => wpActivityIds.has(item.activity_id))}
        timePhasedRows={timePhasedRows.filter(item => item.work_package_id === wpId)}
        evmSettings={evmSettings}
        pmbSnapshots={pmbSnapshots}
      />
    </ProjectShell>
  </PPMShell>;
}
