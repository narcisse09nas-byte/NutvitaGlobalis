import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import ReportingTabs from "@/components/op-management/ReportingTabs";
import ProjectDashboard from "@/components/op-management/ProjectDashboard";
import { createClient } from "@/lib/supabase/server";
import {
  getApprovedPmbWorkPackageSnapshots, getEvmSettings, getProject, listActions, listActivities,
  listAchievements, listBudgetLines, listDeliverables, listExpenses, listIndicators, listIssues,
  listNcrs, listProcurementItems, listQualityRequirements, listRisks, listTimePhasedBudgets,
} from "@/lib/ppm/queries";

export default async function ReportingTableauxDeBordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/reporting/tableaux-de-bord`)}`);
  const name = user.user_metadata?.full_name || user.email || "Utilisateur";
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [budgetLines, risks, issues, activities, procurementItems, qualityRequirements, ncrs, indicators, achievements, deliverables, actions, expenses, timePhasedRows, evmSettings, pmbSnapshots] = await Promise.all([
    listBudgetLines(supabase, id), listRisks(supabase, id), listIssues(supabase, id), listActivities(supabase, id),
    listProcurementItems(supabase, id), listQualityRequirements(supabase, id), listNcrs(supabase, id), listIndicators(supabase, id),
    listAchievements(supabase, id), listDeliverables(supabase, id), listActions(supabase, id),
    listExpenses(supabase, id), listTimePhasedBudgets(supabase, id), getEvmSettings(supabase, id),
    getApprovedPmbWorkPackageSnapshots(supabase, id),
  ]);
  const issuesOpenCount = issues.filter(issue => issue.status === "open" || issue.status === "in_progress").length;
  const targetBeneficiaries = activities.reduce((sum, activity) => sum + Number(activity.beneficiaries || 0), 0);

  return <PPMShell name={name} breadcrumbs={[{ href: "/op-management", label: "Vue d'ensemble" }, { href: "/op-management/projets", label: "Projets" }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/reporting/tableaux-de-bord`, label: "Reporting" }]}>
    <ProjectShell project={project}>
      <div className="grid gap-5">
        <ReportingTabs projectId={id} />
        <ProjectDashboard
          project={project} budgetLines={budgetLines} risks={risks} issuesOpenCount={issuesOpenCount} activities={activities}
          procurementItems={procurementItems} qualityRequirements={qualityRequirements} ncrs={ncrs} indicators={indicators}
          achievements={achievements} deliverables={deliverables} actions={actions} targetBeneficiaries={targetBeneficiaries}
          expenses={expenses} timePhasedRows={timePhasedRows} evmSettings={evmSettings} pmbSnapshots={pmbSnapshots}
        />
      </div>
    </ProjectShell>
  </PPMShell>;
}
