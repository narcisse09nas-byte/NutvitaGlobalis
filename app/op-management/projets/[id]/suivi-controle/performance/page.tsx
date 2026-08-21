import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import SuiviControleTabs from "@/components/op-management/SuiviControleTabs";
import EvmWorkspace from "@/components/op-management/EvmWorkspace";
import { createClient } from "@/lib/supabase/server";
import {
  getApprovedPmbWorkPackageSnapshots, getEvmSettings, getProject, listActivities, listAchievements,
  listBudgetLines, listChangeRequests, listExpenses, listEvmSnapshots, listIssues, listPmbVersions,
  listRisks, listTimePhasedBudgets, listWbsNodes,
} from "@/lib/ppm/queries";

export default async function SuiviControlePerformancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/suivi-controle/performance`)}`);
  const name = user.user_metadata?.full_name || user.email || "Utilisateur";
  const project = await getProject(supabase, id);
  if (!project) notFound();

  const [settings, workPackages, budgetLines, activities, achievements, expenses, timePhasedRows, risks, issues, snapshots, changeRequests, pmbVersions, pmbSnapshots] = await Promise.all([
    getEvmSettings(supabase, id), listWbsNodes(supabase, id), listBudgetLines(supabase, id), listActivities(supabase, id),
    listAchievements(supabase, id), listExpenses(supabase, id), listTimePhasedBudgets(supabase, id),
    listRisks(supabase, id), listIssues(supabase, id), listEvmSnapshots(supabase, id),
    listChangeRequests(supabase, id), listPmbVersions(supabase, id), getApprovedPmbWorkPackageSnapshots(supabase, id),
  ]);
  const workPackagesLevel4 = workPackages.filter(node => node.level === 4);

  return <PPMShell name={name} breadcrumbs={[{ href: "/op-management", label: "Vue d'ensemble" }, { href: "/op-management/projets", label: "Projets" }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/suivi-controle/performance`, label: "Suivi & controle" }]}>
    <ProjectShell project={project}>
      <div className="grid gap-5">
        <SuiviControleTabs projectId={id} />
        <EvmWorkspace
          projectId={id} project={project} initialSettings={settings} workPackages={workPackagesLevel4} budgetLines={budgetLines}
          activities={activities} achievements={achievements} expenses={expenses} timePhasedRows={timePhasedRows}
          risks={risks} issues={issues} initialSnapshots={snapshots} changeRequests={changeRequests} initialPmbVersions={pmbVersions}
          pmbSnapshots={pmbSnapshots}
        />
      </div>
    </ProjectShell>
  </PPMShell>;
}
